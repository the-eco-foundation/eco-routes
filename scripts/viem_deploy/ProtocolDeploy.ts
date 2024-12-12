import {
  encodeDeployData,
  Hex,
  EncodeDeployDataParameters,
  zeroAddress,
  Chain,
  encodeAbiParameters,
  PublicClient,
  PrivateKeyAccount,
  RpcSchema,
  Transport,
  BlockTag,
} from 'viem'
import MainnetContracts from './contracts/mainnet'
import { Create2Deployer, Create3Deployer } from './contracts/deployer'
import {
  DeployWalletClient,
  getClient,
  getConstructorArgs,
  getDeployAccount,
  getGitRandomSalt,
} from './utils'
import {
  createFile,
  addJsonAddress,
  jsonFilePath,
  saveDeploySalts,
  SaltsType,
} from '../deploy/addresses'
import { DeployNetwork } from '../deloyProtocol'
import { DeployChains, mainnetDep, sepoliaDep } from './chains'
import * as dotenv from 'dotenv'
import { getDeployChainConfig, proverSupported } from '../utils'
import { verifyContract } from './verify'
import PQueue from 'p-queue'
import { isEmpty } from 'lodash'

dotenv.config()

export type DeployOpts = {
  pre?: boolean
  retry?: boolean
  deployType?: 'create2' | 'create3'
}
export class ProtocolDeploy {
  private queueVerify = new PQueue({ interval: 1000, intervalCap: 1 }) // theres a 5/second limit on etherscan
  private queueDeploy = new PQueue()
  private deployChains: Chain[] = []
  private salts?: SaltsType

  private clients: {
    [key: string]: DeployWalletClient<
      Transport,
      Chain,
      PrivateKeyAccount,
      RpcSchema
    >
  } = {}

  private account: PrivateKeyAccount
  constructor(deployChains: Chain[] = DeployChains, salts?: SaltsType) {
    this.deployChains = deployChains
    this.account = getDeployAccount()
    for (const chain of deployChains) {
      this.clients[chain.id] = getClient(chain, this.account)
    }
    this.salts = salts
    createFile(jsonFilePath)
  }

  async deployFullNetwork(concurrent: boolean = false) {
    const { salt, saltPre } = !isEmpty(this.salts)
      ? this.salts
      : { salt: getGitRandomSalt(), saltPre: getGitRandomSalt() }
    saveDeploySalts({ salt, saltPre })
    console.log('Using Salts :', salt, saltPre)
    for (const chain of this.deployChains) {
      if (concurrent) {
        this.queueDeploy.add(async () => {
          await this.deployViemContracts(chain, salt)
          await this.deployViemContracts(chain, saltPre, {
            pre: true,
            retry: true,
          })
        })
      } else {
        await this.deployViemContracts(chain, salt)
        await this.deployViemContracts(chain, saltPre, {
          pre: true,
          retry: true,
        })
      }
    }

    if (concurrent) {
      // wait for queue to finish
      await this.queueDeploy.onIdle()
    }
    // wait for verification queue to finish
    await this.queueVerify.onIdle()
  }

  async deployProver(chain: Chain, salt: Hex, opts?: DeployOpts) {
    await this.deployAndVerifyContract(
      chain,
      salt,
      getConstructorArgs(chain, 'Prover') as any,
      opts,
    )
  }

  async deployIntentSource(chain: Chain, salt: Hex, opts?: DeployOpts) {
    const config = getDeployChainConfig(chain)
    const params = {
      ...(getConstructorArgs(chain, 'IntentSource') as any),
      args: [config.intentSource.minimumDuration, config.intentSource.counter],
    }
    await this.deployAndVerifyContract(chain, salt, params as any, opts)
  }

  async deployInbox(
    chain: Chain,
    salt: Hex,
    deployHyper: boolean,
    opts: DeployOpts = { retry: true },
  ) {
    const config = getDeployChainConfig(chain)
    const ownerAndSolver = getDeployAccount().address

    const params = {
      ...(getConstructorArgs(chain, 'Inbox') as any),
      args: [ownerAndSolver, true, [ownerAndSolver]],
    }
    const inboxAddress = await this.deployAndVerifyContract(
      chain,
      salt,
      params as any,
      opts,
    )

    try {
      const client = this.clients[chain.id]
      const { request } = await client.simulateContract({
        address: inboxAddress,
        abi: MainnetContracts.Inbox.abi,
        functionName: 'setMailbox',
        args: [config.hyperlaneMailboxAddress],
      })
      await waitForNonceUpdate(
        client as any,
        getDeployAccount().address,
        NONCE_POLL_INTERVAL,
        async () => {
          const hash = await client.writeContract(request)
          await client.waitForTransactionReceipt({ hash })
        },
      )

      console.log(
        `Chain: ${chain.name}, Inbox ${inboxAddress} setMailbox to: ${config.hyperlaneMailboxAddress}`,
      )
    } catch (error) {
      console.error(
        `Chain: ${chain.name}, Failed to set hyperlane mailbox address ${config.hyperlaneMailboxAddress} on inbox contract ${inboxAddress}:`,
        error,
      )
      if (opts.retry) {
        opts.retry = false
        console.log(
          `Retrying setting hyperlane mailbox address on inbox contract ${inboxAddress}...`,
        )
        // wait for 15 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 15000))
        await this.deployInbox(chain, salt, deployHyper, opts)
      }
      return
    }

    if (deployHyper) {
      await this.deployHyperProver(chain, salt, inboxAddress, opts)
    }
  }

  async deployHyperProver(
    chain: Chain,
    salt: Hex,
    inboxAddress: Hex,
    opts?: DeployOpts,
  ) {
    const config = getDeployChainConfig(chain)
    const params = {
      ...(getConstructorArgs(chain, 'HyperProver') as any),
      args: [config.hyperlaneMailboxAddress, inboxAddress],
    }
    opts = { ...opts, deployType: 'create3' }
    await this.deployAndVerifyContract(chain, salt, params as any, opts)
  }

  async deployAndVerifyContract(
    chain: Chain,
    salt: Hex,
    parameters: EncodeDeployDataParameters & { constructorArgs: any[] },
    opts: DeployOpts = { deployType: 'create3', retry: true, pre: false },
  ): Promise<Hex> {
    if (!proverSupported(chain.name)) {
      console.log(
        `Unsupported network ${chain.name} detected, skipping storage Prover deployment`,
      )
      return zeroAddress
    }
    const { name } = parameters as any
    const client = this.clients[chain.id]

    console.log(`Deploying ${name}...`)

    try {
      const encodedDeployData = encodeDeployData(parameters)
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

      const deployerContract = this.getDepoyerContract(opts)

      const { request, result: deployedAddress } =
        await client.simulateContract({
          address: deployerContract.address,
          abi: deployerContract.abi,
          functionName: 'deploy',
          args: [encodedDeployData, salt],
        })
      await waitForNonceUpdate(
        client as any,
        getDeployAccount().address,
        NONCE_POLL_INTERVAL,
        async () => {
          const hash = await client.writeContract(request)
          // wait so that the nonces dont collide
          await client.waitForTransactionReceipt({ hash })
        },
      )

      console.log(
        `Chain: ${chain.name}, ${name} deployed at: ${deployedAddress}`,
      )
      const networkConfig = getDeployChainConfig(chain) as DeployNetwork
      networkConfig.pre = opts.pre || false
      addJsonAddress(networkConfig, `${name}`, deployedAddress)
      console.log(
        `Chain: ${chain.name}, ${name} address updated in addresses.json`,
      )
      // Verify the contract on Etherscan
      console.log(`Verifying ${name} on Etherscan...`)
      this.queueVerify.add(async () =>
        verifyContract({
          chainId: chain.id,
          codeformat: 'solidity-standard-json-input',
          constructorArguements: args,
          contractname: name,
          contractaddress: deployedAddress,
          contractFilePath: `contracts/${name}.sol`,
        }),
      )

      return deployedAddress
    } catch (error) {
      console.error(
        `Chain: ${chain.name}, Failed to deploy or verify ${name}:`,
        error,
      )
      if (opts.retry) {
        opts.retry = false
        console.log(`Retrying ${name} deployment...`)
        // wait for 15 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 15000))
        return await this.deployAndVerifyContract(
          chain,
          salt,
          parameters as any,
          opts,
        )
      } else {
        throw new Error('Contract address is null, might not have deployed')
      }
    }
  }

  getDepoyerContract(opts: DeployOpts) {
    switch (opts.deployType) {
      case 'create3':
        return Create3Deployer
      case 'create2':
      default:
        return Create2Deployer
    }
  }

  async deployViemContracts(chain: Chain, salt: Hex, opts?: DeployOpts) {
    console.log(
      'Deploying contracts with the account:',
      getDeployAccount().address,
    )

    console.log(salt)
    await this.deployProver(chain, salt, opts)
    // await this.deployIntentSource(chain, salt, opts)
    // await this.deployInbox(chain, salt, true, opts)
  }
}

const NONCE_POLL_INTERVAL = 10000
/**
 * Waits for the nonce of a client to update.
 *
 * @param client - The `viem` client instance.
 * @param address - The Ethereum address to monitor.
 * @param currentNonce - The current nonce to compare against.
 * @param pollInterval - The interval (in ms) for polling the nonce (default: NONCE_POLL_INTERVAL).
 * @param txCall - The transaction call to make. Must update the nonce by at least 1 or this function will hang and timeout.
 * @returns A promise that resolves to the updated nonce.
 */
async function waitForNonceUpdate(
  client: PublicClient,
  address: Hex,
  pollInterval: number,
  txCall: () => Promise<any>,
): Promise<number> {
  return new Promise(async (resolve, reject) => {
    const getNonce = async (blockTag: BlockTag) => {
      try {
        return await client.getTransactionCount({ address, blockTag })
      } catch (error) {
        reject(error)
      }
      return 0
    }
    const initialNonce = await getNonce('pending')
    const result = await txCall()
    // some nodes in the rpc might not be updated even when the one we hit at first is causing a nonce error down the line
    await new Promise((resolve) => setTimeout(resolve, pollInterval / 10))
    let latestNonce = await getNonce('latest')
    while (latestNonce <= initialNonce) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      latestNonce = await getNonce('latest')
    }
    resolve(result)
  })
}
