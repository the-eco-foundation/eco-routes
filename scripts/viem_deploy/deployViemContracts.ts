import {
  encodeDeployData,
  Hex,
  Abi,
  EncodeDeployDataParameters,
  zeroAddress,
  getAddress,
  Chain,
  encodeAbiParameters,
} from 'viem'
import MainnetContracts from './contracts/mainnet'
import { DEPLOYER_ADDRESS, Deployer } from './contracts/deployer'
import {
  decodeDepoyLog,
  getClient,
  getConstructorArgs,
  getDeployAccount,
  getGitRandomSalt,
} from './utils'
import { updateAddresses } from '../deploy/addresses'
import { DeployNetwork } from '../deloyProtocol'
import { mainnetDep, sepoliaDep } from './chains'
import * as dotenv from 'dotenv'
import { getDeployChainConfig, proverSupported } from '../utils'
import { checkVerifyStatus, verifyContract } from './verify'
import { network, run } from 'hardhat'
import hre from 'hardhat'

dotenv.config()

export async function deployViemContracts() {
  const salt: Hex = getGitRandomSalt() // Random salt
  console.log(
    'Deploying contracts with the account:',
    getDeployAccount().address,
  )
  await deployProver(sepoliaDep, salt)
  // await deployIntentSource(sepoliaDep, salt)
  // await deployInbox(sepoliaDep, salt, true)
}

async function deployProver(chains: Chain[], salt: Hex) {
  for (const chain of chains) {
    await deployAndVerifyContract<any>(
      chain,
      salt,
      getConstructorArgs(chain, 'Prover') as any,
    )
  }
}

async function deployIntentSource(chains: Chain[], salt: Hex) {
  for (const chain of chains) {
    const config = getDeployChainConfig(chain)
    const params = {
      ...(getConstructorArgs(chain, 'IntentSource') as any),
      args: [config.intentSource.minimumDuration, config.intentSource.counter],
    }
    await deployAndVerifyContract<any>(chain, salt, params as any)
  }
}

async function deployInbox(chains: Chain[], salt: Hex, deployHyper: boolean) {
  for (const chain of chains) {
    const config = getDeployChainConfig(chain)
    const ownerAndSolver = getDeployAccount().address

    const params = {
      ...(getConstructorArgs(chain, 'Inbox') as any),
      args: [ownerAndSolver, true, [ownerAndSolver]],
    }
    const inboxAddress = await deployAndVerifyContract<any>(
      chain,
      salt,
      params as any,
    )

    try {
      const client = await getClient(chain)
      const { request } = await client.simulateContract({
        address: inboxAddress,
        abi: MainnetContracts.Inbox.abi,
        functionName: 'setMailbox',
        args: [config.hyperlaneMailboxAddress],
      })
      const hash = await client.writeContract(request)
      await client.waitForTransactionReceipt({ hash })
      console.log(
        `Chain: ${chain.name}, Inbox ${inboxAddress} setMailbox to: ${config.hyperlaneMailboxAddress}`,
      )
    } catch (error) {
      console.error(
        `Chain: ${chain.name}, Failed to set hyperlane mailbox address ${config.hyperlaneMailboxAddress} on inbox contract ${inboxAddress}:`,
        error,
      )
      return
    }

    if (deployHyper) {
      await deployHyperProver(chain, salt, inboxAddress)
    }
  }
}

async function deployHyperProver(chain: Chain, salt: Hex, inboxAddress: Hex) {
  const config = getDeployChainConfig(chain)
  const params = {
    ...(getConstructorArgs(chain, 'HyperProver') as any),
    args: [config.hyperlaneMailboxAddress, inboxAddress],
  }
  await deployAndVerifyContract<any>(chain, salt, params as any)
}

async function deployAndVerifyContract<
  const abi extends Abi | readonly unknown[],
>(
  chain: Chain,
  salt: Hex,
  parameters: EncodeDeployDataParameters<abi> & { constructorArgs: any[] },
  retry: boolean = true,
): Promise<Hex> {
  if (!proverSupported(chain.name)) {
    console.log(
      `Unsupported network ${chain.name} detected, skipping storage Prover deployment`,
    )
    return zeroAddress
  }
  const { name } = parameters as any
  const client = await getClient(chain)

  console.log(`Deploying ${name}...`)

  try {
    const encodedDeployData = encodeDeployData<abi>(parameters)
    let args : any = {}
    if(parameters.args){
      const description = parameters.abi.find((x : any) => 'type' in x  && x.type === 'constructor') as any
      args = encodeAbiParameters(description.inputs, parameters.args as any).slice(2) //chop the 0x off
    }

    const { request } = await client.simulateContract({
      address: Deployer.address,
      abi: Deployer.abi,
      functionName: 'deploy',
      args: [encodedDeployData, salt],
    })

    const hash = await client.writeContract(request)

    // Wait for the transaction receipt
    const receipt = await client.waitForTransactionReceipt({ hash })
    const log = receipt.logs.find(
      (log) => getAddress(log.address) === DEPLOYER_ADDRESS,
    )
    if (!log) {
      throw new Error('No log found')
    }
    const dlog = decodeDepoyLog(log.data, log.topics)
    const contractAddress = dlog?.args ? ((dlog.args as any).addr as any) : null
    if (contractAddress === null) {
      throw new Error('Contract address is null, might not have deployed')
    }
    console.log(`Chain: ${chain.name}, ${name} deployed at: ${contractAddress}`)
    const config = getDeployChainConfig(chain) as DeployNetwork
    updateAddresses(config, `${name}`, contractAddress)
    console.log(
      `Chain: ${chain.name}, ${name} address updated in addresses.json`,
    )
    // Verify the contract on Etherscan
    console.log(`Verifying ${name} on Etherscan...`)
    // const contractAddress = '0x7f77B9e5FFc1063878CC84DF4368945DcD468B9C'
    // const hash = '0xed82af428b7af070de59e1fd8f4a341105fb0650a0aa94868612e9190f2dcd37'
    const verificationResult = await checkVerifyStatus({
    // const verificationResult = await verifyContract({
      chainId: chain.id,
      codeformat: 'solidity-standard-json-input',
      constructorArguements: args,
      contractname: name,
      contractaddress: contractAddress,
      contractFilePath: `contracts/${name}.sol`,
      creatorTxHash: hash
    })

    // await run('verify:verify', {
    //   address: contractAddress,
    //   constructorArguments: parameters.constructorArgs,
    // })
    return contractAddress
    // return '0x'
  } catch (error) {
    console.error(
      `Chain: ${chain.name}, Failed to deploy or verify ${name}:`,
      error,
    )
    // if (retry) {
    //   console.log(`Retrying ${name} deployment...`)
    //   // wait for 15 seconds before retrying
    //   await new Promise((resolve) => setTimeout(resolve, 15000))
    //   return await deployAndVerifyContract(
    //     chain,
    //     salt,
    //     parameters as any,
    //     false,
    //   )
    // } else {
    //   throw new Error('Contract address is null, might not have deployed')
    // }
    return '0x'
  }
}
