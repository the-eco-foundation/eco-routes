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
import { verifyContract } from './verify'

dotenv.config()

export type DeployOpts = {
  pre: boolean
  retry: boolean
}
export async function deployViemContracts(chains: Chain[] = sepoliaDep,salt: Hex = getGitRandomSalt(), opts?: DeployOpts) {
  console.log(
    'Deploying contracts with the account:',
    getDeployAccount().address,
  )
  // const salt: Hex = getGitRandomSalt()
  console.log(salt)
  await deployProver(chains, salt, opts)
  // await deployIntentSource(chains, salt)
  // await deployInbox(chains, salt, true)
}

export async function deployViemFull() {
  const salt = getGitRandomSalt()
  const saltPre = getGitRandomSalt()
  await deployViemContracts([sepoliaDep].flat(),salt)//, salt, {pre: false, retry: true})
  // await deployViemContracts([sepoliaDep, mainnetDep].flat(), saltPre, {pre: true, retry: true})
}

async function deployProver(chains: Chain[], salt: Hex, opts?: DeployOpts) {
  for (const chain of chains) {
    await deployAndVerifyContract<any>(
      chain,
      salt,
      getConstructorArgs(chain, 'Prover') as any,
      opts
    )
    // await checkVerifyStatus(chain.id, 'y7ejv5uwkw6gjfhwesrtprbkvn5btu9rqdxabple2pubneyqav')
    // await getContractSource(chain.id, '0x7e3aCB6FBeBe20398249BA08c0E42a08Bd6ae341')
  }
}

async function deployIntentSource(chains: Chain[], salt: Hex, opts?: DeployOpts) {
  for (const chain of chains) {
    const config = getDeployChainConfig(chain)
    const params = {
      ...(getConstructorArgs(chain, 'IntentSource') as any),
      args: [config.intentSource.minimumDuration, config.intentSource.counter],
    }
    await deployAndVerifyContract<any>(chain, salt, params as any, opts)
  }
}

async function deployInbox(chains: Chain[], salt: Hex, deployHyper: boolean, opts?: DeployOpts) {
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
      opts
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
      await deployHyperProver(chain, salt, inboxAddress, opts)
    }
  }
}

async function deployHyperProver(chain: Chain, salt: Hex, inboxAddress: Hex, opts?: DeployOpts) {
  const config = getDeployChainConfig(chain)
  const params = {
    ...(getConstructorArgs(chain, 'HyperProver') as any),
    args: [config.hyperlaneMailboxAddress, inboxAddress],
  }
  await deployAndVerifyContract<any>(chain, salt, params as any, opts)
}

async function deployAndVerifyContract<
  const abi extends Abi | readonly unknown[],
>(
  chain: Chain,
  salt: Hex,
  parameters: EncodeDeployDataParameters<abi> & { constructorArgs: any[] },
  opts: DeployOpts = { retry: true, pre: false },
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
    let args: any = {}
    if (parameters.args) {
      const description = parameters.abi.find(
        (x: any) => 'type' in x && x.type === 'constructor',
      ) as any
      args = encodeAbiParameters(
        description.inputs,
        parameters.args as any,
      ).slice(2) // chop the 0x off
    }
    console.log('salt is', salt)
    const { request , result : deployedAddress  } = await client.simulateContract({
      address: Deployer.address,
      abi: Deployer.abi,
      functionName: 'deploy',
      args: [encodedDeployData, salt],
    })

    const hash = await client.writeContract(request)

    // // Wait for the transaction receipt
    // const receipt = await client.waitForTransactionReceipt({ hash })
    // const log = receipt.logs.find(
    //   (log) => getAddress(log.address) === DEPLOYER_ADDRESS,
    // )
    // if (!log) {
    //   throw new Error('No log found')
    // }
    // const dlog = decodeDepoyLog(log.data, log.topics)
    // const contractAddress = dlog?.args ? ((dlog.args as any).addr as any) : null
    // if (contractAddress === null) {
    //   throw new Error('Contract address is null, might not have deployed')
    // }

    console.log(`Chain: ${chain.name}, ${name} deployed at: ${deployedAddress}`)
    const networkConfig = getDeployChainConfig(chain) as DeployNetwork
    networkConfig.pre = opts.pre || false
    updateAddresses(networkConfig, `${name}`, deployedAddress)
    console.log(
      `Chain: ${chain.name}, ${name} address updated in addresses.json`,
    )
    // Verify the contract on Etherscan
    console.log(`Verifying ${name} on Etherscan...`)
    // const contractAddress = '0x7e3aCB6FBeBe20398249BA08c0E42a08Bd6ae341'
    // const hash = '0xed82af428b7af070de59e1fd8f4a341105fb0650a0aa94868612e9190f2dcd37'
    // const verificationResult = await checkVerifyStatus({
    const verificationResult = await verifyContract({
      chainId: chain.id,
      codeformat: 'solidity-standard-json-input',
      constructorArguements: args,
      contractname: name,
      contractaddress: deployedAddress,
      contractFilePath: `contracts/${name}.sol`,
    })

    return deployedAddress

  } catch (error) {
    console.error(
      `Chain: ${chain.name}, Failed to deploy or verify ${name}:`,
      error,
    )
    if (opts.retry) {
      console.log(`Retrying ${name} deployment...`)
      // wait for 15 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 15000))
      return await deployAndVerifyContract(
        chain,
        salt,
        parameters as any,
        opts
      )
    } else {
      throw new Error('Contract address is null, might not have deployed')
    }
  }
}
