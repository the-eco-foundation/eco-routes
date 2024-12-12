import {
  encodeDeployData,
  Hex,
  zeroAddress,
  Chain,
  encodeAbiParameters,
  PublicClient,
  PrivateKeyAccount,
  RpcSchema,
  Transport,
  BlockTag,
  toBytes,
} from 'viem'
import MainnetContracts, { ContractDeployConfigs } from './contracts/mainnet'
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
import { keccak256 } from 'viem'

dotenv.config()

/**
 * Deploy types options. 
 */
export type DeployOpts = {
  pre?: boolean // if the contract is a pre contract, ie preprod/dev
  retry?: boolean // if the deploy fails, retry
  deployType?: 'create2' | 'create3' // the deploy type to use(defaults to create3)
}

// wait for 10 seconds before polling for nonce update
const NONCE_POLL_INTERVAL = 10000

/**
 * Deploys the eco protocol to all the chains passed with the salts provided. 
 * After deploy it verify the contracts on etherscan.
 */
export class ProtocolDeploy {
  //The queue for verifying contracts on etherscan
  private queueVerify = new PQueue({ interval: 1000, intervalCap: 1 }) // theres a 5/second limit on etherscan
  //The queue for deploying contracts to chains
  private queueDeploy = new PQueue()
  //The chains to deploy the contracts to
  private deployChains: Chain[] = []
  //The salts to use for deploying the contracts, if emtpy it will generate random salts
  private salts?: SaltsType

  //The clients for the chains. Initialize once use multiple times
  private clients: {
    [key: string]: DeployWalletClient<
      Transport,
      Chain,
      PrivateKeyAccount,
      RpcSchema
    >
  } = {}

  //The account to deploy the contracts with, loaded from env process.env.DEPLOYER_PRIVATE_KEY
  private account: PrivateKeyAccount

  /**
   * Constructor that initializes the account and clients for the chains.
   * @param deployChains the chains to deploy the contracts to, defaults to {@link DeployChains}
   * @param salts 
   */
  constructor(deployChains: Chain[] = DeployChains, salts?: SaltsType) {
    this.deployChains = deployChains
    this.account = getDeployAccount()
    for (const chain of deployChains) {
      this.clients[chain.id] = getClient(chain, this.account)
    }
    this.salts = salts
    createFile(jsonFilePath)
  }

  /**
   * Deploy the full network to all the chains passed in the constructor.
   * @param concurrent if the chain deploys should be done concurrently or not
   */
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


  /**
   * Deploys the network to a chain with a given salt.
   * 
   * @param chain the chain to deploy on
   * @param salt the origin salt to use
   * @param opts deploy options
   */
  async deployViemContracts(chain: Chain, salt: Hex, opts?: DeployOpts) {
    console.log(
      'Deploying contracts with the account:',
      getDeployAccount().address,
    )

    console.log("Deploying with base salt : " + JSON.stringify(salt))
    await this.deployProver(chain, salt, opts)
    await this.deployIntentSource(chain, salt, opts)
    await this.deployInbox(chain, salt, true, opts)
  }

  /**
   * Deploys the prover contract.
   * 
   * @param chain the chain to deploy on
   * @param salt the origin salt to use
   * @param opts deploy options
   */
  async deployProver(chain: Chain, salt: Hex, opts?: DeployOpts) {
    await this.deployAndVerifyContract(
      chain,
      salt,
      getConstructorArgs(chain, 'Prover'),
      opts,
    )
  }

  /**
   * Deploys the intent source contract.
   * 
   * @param chain the chain to deploy on
   * @param salt the origin salt to use
   * @param opts deploy options
   */
  async deployIntentSource(chain: Chain, salt: Hex, opts?: DeployOpts) {
    const config = getDeployChainConfig(chain)
    const params = {
      ...(getConstructorArgs(chain, 'IntentSource')),
      args: [config.intentSource.minimumDuration, config.intentSource.counter],
    }
    await this.deployAndVerifyContract(chain, salt, params, opts)
  }

  /**
   * Deploys the inbox contract, and optionally the hyper prover contract.
   * 
   * @param chain the chain to deploy on
   * @param salt the origin salt to use
   * @param deployHyper if the hyper prover should be deployed
   * @param opts deploy options
   */
  async deployInbox(
    chain: Chain,
    salt: Hex,
    deployHyper: boolean,
    opts: DeployOpts = { retry: true },
  ) {
    const config = getDeployChainConfig(chain)
    const ownerAndSolver = getDeployAccount().address

    const params = {
      ...(getConstructorArgs(chain, 'Inbox')),
      args: [ownerAndSolver, true, [ownerAndSolver]],
    }
    const inboxAddress = await this.deployAndVerifyContract(
      chain,
      salt,
      params,
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

  /**
   * Deploys the hyper prover contract.
   * 
   * @param chain the chain to deploy on
   * @param salt the origin salt to use
   * @param inboxAddress the inbox address
   * @param opts deploy options
   */
  async deployHyperProver(
    chain: Chain,
    salt: Hex,
    inboxAddress: Hex,
    opts?: DeployOpts,
  ) {
    const config = getDeployChainConfig(chain)
    const params = {
      ...(getConstructorArgs(chain, 'HyperProver')),
      args: [config.hyperlaneMailboxAddress, inboxAddress],
    }
    opts = { ...opts, deployType: 'create3' }
    await this.deployAndVerifyContract(chain, salt, params, opts)
  }

  /**
   * Deploys a contract and verifies it on etherscan.
   * 
   * @param chain the chain to deploy on
   * @param salt the origin salt to use
   * @param parameters the contract parameters, abi, constructor args etc
   * @param opts deploy options
   */
  async deployAndVerifyContract(
    chain: Chain,
    salt: Hex,
    parameters: ContractDeployConfigs,
    opts: DeployOpts = { deployType: 'create3', retry: true, pre: false },
  ): Promise<Hex> {
    if (!proverSupported(chain.name)) {
      console.log(
        `Unsupported network ${chain.name} detected, skipping storage Prover deployment`,
      )
      return zeroAddress
    }
    // if create3, transform the salt
    if (opts.deployType === 'create3') {
      salt = this.transformSalt(salt, parameters.name)
    }
    const { name } = parameters
    const client = this.clients[chain.id]

    console.log(`Deploying ${name}...`)

    try {
      const encodedDeployData = encodeDeployData(parameters)
      let args: any = {}
      if (parameters.args) {
        const description = parameters.abi.find(
          (x: any) => 'type' in x && x.type === 'constructor',
        )
        args = encodeAbiParameters(
          description.inputs,
          parameters.args,
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
          parameters,
          opts,
        )
      } else {
        throw new Error('Contract address is null, might not have deployed')
      }
    }
  }

  /**
   * Transforms a given salt with a contract name and then keccaks it.
   * Generates a deterministic salt per contract.
   * 
   * @param salt the origin salt
   * @param contractName the name of the contract
   * @returns 
   */
  transformSalt(salt: Hex, contractName: string): Hex {
    const transformedSalt = keccak256(toBytes(salt + contractName))
    console.log(`Transformed salt ${salt} for ${contractName}: ${transformedSalt}`)
    return transformedSalt
  }

  /**
   * Gets the deployer contract based on the deploy opts.
   * 
   * @param opts the deploy opts
   * @returns 
   */
  getDepoyerContract(opts: DeployOpts) {
    switch (opts.deployType) {
      case 'create3':
        return Create3Deployer
      case 'create2':
      default:
        return Create2Deployer
    }
  }
}

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
