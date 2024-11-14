import { ethers, run } from 'hardhat'
import { updateAddresses } from './deploy/addresses'
import { Signer } from 'ethers'
import { Deployer, Inbox, Prover } from '../typechain-types'
import { networks as mainnetNetworks } from '../config/mainnet/config'
import { networks as sepoliaNetworks } from '../config/testnet/config'
import { Address, Hex, zeroAddress } from 'viem'
import { isZeroAddress } from './utils'
import { getGitHash } from './publish/gitUtils'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

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
    initialSalt: getGitHash(),
  }
}
export type DeployProtocolOptions = {
  isSolvingPublic: boolean
  deployPreproduction?: boolean
}

export async function deployProtocol(
  protocolDeploy: ProtocolDeploy,
  deployNetwork: DeployNetwork,
  solver: Hex,
  proverConfig: any,
  options: DeployProtocolOptions = { isSolvingPublic: true },
) {
  const networkName = deployNetwork.network
  const salt = ethers.keccak256(ethers.toUtf8Bytes(protocolDeploy.initialSalt + deployNetwork.pre || ''))
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

  console.log(`***************************************************`)
  console.log(`** Deploying contracts to ${networkName} network **`)
  console.log(`***************************************************`)

  if (isZeroAddress(protocolDeploy.proverAddress)) {
    await deployProver(salt, deployNetwork, singletonDeployer, proverConfig)
  }

  if (isZeroAddress(protocolDeploy.intentSourceAddress)) {
    protocolDeploy.intentSourceAddress = await deployIntentSource(
      deployNetwork,
      salt,
      singletonDeployer,
    )
  }

  if (isZeroAddress(protocolDeploy.inboxAddress)) {
    protocolDeploy.inboxAddress = await deployInbox(
      deployNetwork,
      deployer,
      options.isSolvingPublic,
      [solver],
      salt,
      singletonDeployer,
    )
  }

  if (
    isZeroAddress(protocolDeploy.hyperProverAddress) &&
    !isZeroAddress(protocolDeploy.inboxAddress)
  ) {
    protocolDeploy.hyperProverAddress = await deployHyperProver(
      deployNetwork,
      protocolDeploy.inboxAddress,
      salt,
      singletonDeployer,
    )
  }
  // deploy preproduction contracts
  if (options.deployPreproduction) {
    deployNetwork.pre = true
    deployProtocol(getEmptyProtocolDeploy(), deployNetwork, solver, proverConfig)
  }
}

export function getDeployNetwork(networkName: string): DeployNetwork {
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
  const receipt = await singletonDeployer.deploy(proverTx.data, deploySalt, {
    gasLimit: deployNetwork.gasLimit,
  })
  const filter = await singletonDeployer.queryFilter(
    singletonDeployer.filters.Deployed,
    receipt.blockNumber || undefined,
  )
  const proverAddress = filter[0].args.addr as Address

  console.log(`${contractName} implementation deployed to: `, proverAddress)
  updateAddresses(
    deployNetwork,
    `${contractName}`,
    proverAddress,
  )
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
  const intentSourceTx = await intentSourceFactory.getDeployTransaction(
    args[0],
    args[1],
  )
  const receipt = await singletonDeployer.deploy(
    intentSourceTx.data,
    deploySalt,
    {
      gasLimit: deployNetwork.gasLimit / 2,
    },
  )

  const intentSourceAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber || undefined,
    )
  )[0].args.addr as Address

  console.log(`${contractName} deployed to:`, intentSourceAddress)
  updateAddresses(
    deployNetwork,
    `${contractName}`,
    intentSourceAddress,
  )
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
  const inboxTx = await inboxFactory.getDeployTransaction(
    args[0] as Address,
    args[1] as boolean,
    args[2] as any,
  )

  const receipt = await singletonDeployer.deploy(inboxTx.data, deploySalt, {
    gasLimit: deployNetwork.gasLimit / 2,
  })

  const inboxAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber || undefined,
    )
  )[0].args.addr as Hex

  // on testnet inboxOwner is the deployer, just to make things easier
  const inbox: Inbox = (await ethers.getContractAt(
    contractName,
    inboxAddress,
    inboxOwnerSigner,
  )) as any as Inbox

  await inbox
    .connect(inboxOwnerSigner)
    .setMailbox(deployNetwork.hyperlaneMailboxAddress)

  console.log(`${contractName} implementation deployed to: `, inboxAddress)
  updateAddresses(
    deployNetwork,
    `${contractName}`,
    inboxAddress,
  )
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
  const hyperProverTx = await hyperProverFactory.getDeployTransaction(
    args[0],
    args[1],
  )

  const receipt = await singletonDeployer.deploy(
    hyperProverTx.data,
    deploySalt,
    {
      gasLimit: deployNetwork.gasLimit / 4,
    },
  )

  console.log(`${contractName} deployed`)

  const hyperProverAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber || undefined,
    )
  )[0].args.addr as Hex

  console.log(`${contractName} deployed to: ${hyperProverAddress}`)
  updateAddresses(
    deployNetwork,
    `${contractName}`,
    hyperProverAddress,
  )
  verifyContract(contractName, hyperProverAddress, args)
  return hyperProverAddress
}

export async function verifyContract(
  contractName: string,
  address: Hex,
  args: any[],
) {
  try {
    await run('verify:verify', {
      address,
      constructorArguments: args,
    })
    console.log(`${contractName} verified at:`, address)
  } catch (e) {
    console.log(`Error verifying ${contractName}`, e)
  }
}
