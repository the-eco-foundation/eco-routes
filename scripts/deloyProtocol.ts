import { ethers, run } from 'hardhat'
import { updateAddresses } from './deploy/addresses'
import { ContractTransactionResponse, getCreate2Address, Signer } from 'ethers'
import { Deployer, Inbox, Prover } from '../typechain-types'
import { networks as mainnetNetworks } from '../config/mainnet/config'
import { networks as sepoliaNetworks } from '../config/testnet/config'
import { Address, Hex, zeroAddress } from 'viem'
import { isZeroAddress } from './utils'
import { getGitHash } from './publish/gitUtils'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'

export type DeployNetwork = {
  gasLimit: number
  intentSource: {
    counter: number
    minimumDuration: number
  }
  hyperlaneMailboxAddress: Hex
  network: string
  pre: boolean // whether this is a pre deployment to a network, think preproduction
  chainId: number
  [key: string]: any
}

export type DeployNetworkConfig = Omit<
  DeployNetwork,
  'gasLimit' | 'intentSource' | 'hyperlaneMailboxAddress' | 'network' | 'pre'
>

export type ProtocolDeploy = {
  proverAddress: Hex
  intentSourceAddress: Hex
  inboxAddress: Hex
  hyperProverAddress: Hex
  initialSalt: string
}

export function getEmptyProtocolDeploy(): ProtocolDeploy {
  return {
    proverAddress: zeroAddress,
    intentSourceAddress: zeroAddress,
    inboxAddress: zeroAddress,
    hyperProverAddress: zeroAddress,
    // initialSalt: getGitHash() + Math.random().toString(), // randomize the salt for development as singletonDeployer.deploy(..) will fail if salt is already used
    initialSalt:
      '0xc84b801475c3dd99d7e4fb95aaf02531ecf967d0e5fcad3256db7080c5956341',
  }
}
export type DeployProtocolOptions = {
  isSolvingPublic: boolean
  deployPre?: boolean
}

export async function deployProtocol(
  protocolDeploy: ProtocolDeploy,
  deployNetwork: DeployNetwork,
  solver: Hex,
  proverConfig: any,
  options: DeployProtocolOptions = { isSolvingPublic: true },
) {
  const networkName = deployNetwork.network
  const salt = ethers.keccak256(
    ethers.toUtf8Bytes(protocolDeploy.initialSalt + deployNetwork.pre || ''),
  )

  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  if (process.env.DEPLOY_CI === 'true') {
    console.log('Deploying for CI')
  }

  const singletonDeployer = (await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )) as any as Deployer

  console.log('gasLimit:', deployNetwork.gasLimit)
  const pre = deployNetwork.pre ? ' Pre' : ''
  console.log(`***************************************************`)
  console.log(`** Deploying contracts to ${networkName + pre} network **`)
  console.log(`***************************************************`)

  //   if (isZeroAddress(protocolDeploy.proverAddress)) {
  //     await deployProver(salt, deployNetwork, singletonDeployer, proverConfig)
  //   }

  if (isZeroAddress(protocolDeploy.intentSourceAddress)) {
    protocolDeploy.intentSourceAddress = (await deployIntentSource(
      deployNetwork,
      salt,
      singletonDeployer,
    )) as Hex
  }

  if (isZeroAddress(protocolDeploy.inboxAddress)) {
    protocolDeploy.inboxAddress = (await deployInbox(
      deployNetwork,
      deployer,
      options.isSolvingPublic,
      [solver],
      salt,
      singletonDeployer,
    )) as Hex
  }

  if (
    isZeroAddress(protocolDeploy.hyperProverAddress) &&
    !isZeroAddress(protocolDeploy.inboxAddress)
  ) {
    protocolDeploy.hyperProverAddress = (await deployHyperProver(
      deployNetwork,
      protocolDeploy.inboxAddress,
      salt,
      singletonDeployer,
    )) as Hex
  }
  // deploy preproduction contracts
  if (options.deployPre) {
    deployNetwork.pre = true
    await deployProtocol(
      getEmptyProtocolDeploy(),
      deployNetwork,
      solver,
      proverConfig,
    )
  }
}

export function getDeployNetwork(networkName: string): DeployNetworkConfig {
  // mainnet
  switch (networkName) {
    case 'base':
      return mainnetNetworks.base
    case 'optimism':
      return mainnetNetworks.optimism
    case 'helix':
      return mainnetNetworks.helix
    case 'arbitrum':
      return mainnetNetworks.arbitrum
    case 'mantle':
      return mainnetNetworks.mantle
    case 'polygon':
      return mainnetNetworks.polygon
  }

  // sepolia
  switch (networkName) {
    case 'baseSepolia':
      return sepoliaNetworks.baseSepolia
    case 'optimismSepolia':
      return sepoliaNetworks.optimismSepolia
    case 'optimismSepoliaBlockscout':
      return sepoliaNetworks.optimismSepolia
    case 'ecoTestnet':
      return sepoliaNetworks.ecoTestnet
    case 'arbitrumSepolia':
      return sepoliaNetworks.arbitrumSepolia
    case 'mantleSepolia':
      return sepoliaNetworks.mantleSepolia
  }
  throw new Error('Network not found')
}

export async function deployProver(
  deploySalt: string,
  deployNetwork: DeployNetwork,
  singletonDeployer: Deployer,
  deployArgs: Prover.ChainConfigurationConstructorStruct[],
) {
  const contractName = 'Prover'
  const proverFactory = await ethers.getContractFactory(contractName)
  const proverTx = await proverFactory.getDeployTransaction(deployArgs)
  await waitBlocks(async () => {
    return await singletonDeployer.deploy(proverTx.data, deploySalt, {
      gasLimit: deployNetwork.gasLimit,
    })
  })
  // wait to verify contract
  const proverAddress = ethers.getCreate2Address(
    singletonFactoryAddress,
    deploySalt,
    ethers.keccak256(proverTx.data),
  )

  console.log(`${contractName} implementation deployed to: `, proverAddress)
  updateAddresses(deployNetwork, `${contractName}`, proverAddress)
  verifyContract(contractName, proverAddress, [deployArgs])
  return proverAddress
}

export async function deployIntentSource(
  deployNetwork: DeployNetwork,
  deploySalt: string,
  singletonDeployer: Deployer,
) {
  const contractName = 'IntentSource'
  const intentSourceFactory = await ethers.getContractFactory(contractName)
  const args = [
    deployNetwork.intentSource.minimumDuration,
    deployNetwork.intentSource.counter,
  ]
  const intentSourceTx = (await waitBlocks(async () => {
    return await intentSourceFactory.getDeployTransaction(args[0], args[1])
  })) as ContractTransactionResponse

  await waitBlocks(async () => {
    return await singletonDeployer.deploy(intentSourceTx.data, deploySalt, {
      gasLimit: deployNetwork.gasLimit / 2,
    })
  })

  const intentSourceAddress = ethers.getCreate2Address(
    singletonFactoryAddress,
    deploySalt,
    ethers.keccak256(intentSourceTx.data),
  )

  console.log(`${contractName} deployed to:`, intentSourceAddress)
  updateAddresses(deployNetwork, `${contractName}`, intentSourceAddress)
  verifyContract(contractName, intentSourceAddress, args)
  return intentSourceAddress
}

export async function deployInbox(
  deployNetwork: DeployNetwork,
  inboxOwnerSigner: Signer,
  isSolvingPublic: boolean,
  solvers: Hex[],
  deploySalt: string,
  singletonDeployer: Deployer,
) {
  const contractName = 'Inbox'
  const inboxFactory = await ethers.getContractFactory(contractName)
  const args = [await inboxOwnerSigner.getAddress(), isSolvingPublic, solvers]
  // on testnet inboxOwner is the deployer, just to make things easier
  const inboxTx = (await waitBlocks(async () => {
    return await inboxFactory.getDeployTransaction(
      args[0] as Address,
      args[1] as boolean,
      args[2] as any,
    )
  })) as ContractTransactionResponse

  await waitBlocks(async () => {
    return await singletonDeployer.deploy(inboxTx.data, deploySalt, {
      gasLimit: deployNetwork.gasLimit / 2,
    })
  })
  // wait to verify contract
  const inboxAddress = ethers.getCreate2Address(
    singletonFactoryAddress,
    deploySalt,
    ethers.keccak256(inboxTx.data),
  )

  // on testnet inboxOwner is the deployer, just to make things easier
  const inbox: Inbox = (await waitBlocks(async () => {
    return await ethers.getContractAt(
      contractName,
      inboxAddress,
      inboxOwnerSigner,
    )
  })) as any as Inbox

  await waitBlocks(async () => {
    return await inbox
      .connect(inboxOwnerSigner)
      .setMailbox(deployNetwork.hyperlaneMailboxAddress)
  })

  console.log(`${contractName} implementation deployed to: `, inboxAddress)
  updateAddresses(deployNetwork, `${contractName}`, inboxAddress)
  verifyContract(contractName, inboxAddress, args)
  return inboxAddress
}

export async function deployHyperProver(
  deployNetwork: DeployNetwork,
  inboxAddress: Hex,
  deploySalt: string,
  singletonDeployer: Deployer,
) {
  const contractName = 'HyperProver'
  const hyperProverFactory = await ethers.getContractFactory(contractName)
  const args = [deployNetwork.hyperlaneMailboxAddress, inboxAddress]
  const hyperProverTx = (await waitBlocks(async () => {
    return await hyperProverFactory.getDeployTransaction(args[0], args[1])
  })) as ContractTransactionResponse

  await waitBlocks(async () => {
    return await singletonDeployer.deploy(hyperProverTx.data, deploySalt, {
      gasLimit: deployNetwork.gasLimit / 4,
    })
  })
  // wait to verify contract
  const hyperProverAddress = ethers.getCreate2Address(
    singletonFactoryAddress,
    deploySalt,
    ethers.keccak256(hyperProverTx.data),
  )

  console.log(`${contractName} deployed`)
  console.log(`${contractName} deployed to: ${hyperProverAddress}`)
  updateAddresses(deployNetwork, `${contractName}`, hyperProverAddress)
  verifyContract(contractName, hyperProverAddress, args)
  return hyperProverAddress
}

export async function verifyContract(
  contractName: string,
  address: Hex,
  args: any[],
) {
  try {
    await waitBlocks(async () => {
      await run('verify:verify', {
        address,
        constructorArguments: args,
      })
      return await ethers.provider.getCode(address)
    })
    console.log(`${contractName} verified at:`, address)
  } catch (e) {
    console.log(`Error verifying ${contractName}: `, e)
  }
}

type AsyncFunction = () => Promise<any>

/**
 * This method waits on a function to return a non-falsy value for a certain number of blocks
 *
 * @param func the asyn function to call
 * @param options options for the waitBlocks function
 * @returns the result of the function
 */
export async function waitBlocks(
  func: AsyncFunction,
  options: { numBlocks: number; fromBlock?: number } = { numBlocks: 25 },
) {
  const fromBlock =
    options.fromBlock || (await ethers.provider.getBlockNumber())
  let ans
  let err: Error = new Error('waiting on function failed')
  while (!ans) {
    try {
      ans = await func()
      if (ans) {
        return ans
      }
    } catch (e) {
      err = e
    }

    const currentBlock = await ethers.provider.getBlockNumber()
    if (currentBlock - fromBlock >= options.numBlocks) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  console.log('Error waiting on function: ', err)
}
