import { ethers, run } from 'hardhat'
import { updateAddresses } from './deploy/addresses'
import { Signer } from 'ethers'
import { Deployer, Inbox, Prover } from '../typechain-types'
import { Address, Hex } from 'viem'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

export type DeployNetwork = {
  gasLimit: number
  intentSource: {
    counter: number
    minimumDuration: number
  }
  hyperlaneMailboxAddress: Hex
  network: string
  chainId: number
  [key: string]: any
}

export type ProtocolDeploy = {
  proverAddress: Hex
  intentSourceAddress: Hex
  inboxAddress: Hex
  hyperProverAddress: Hex
  initialSalt: string
}

export async function deployProver(deploySalt: string, deployNetwork: DeployNetwork, singletonDeployer: Deployer, deployArgs: Prover.ChainConfigurationConstructorStruct[]) {
  const contractName = 'Prover'
  const proverFactory = await ethers.getContractFactory(contractName)
  const proverTx = await proverFactory.getDeployTransaction(deployArgs)
  const receipt = await singletonDeployer.deploy(proverTx.data, deploySalt, {
    gasLimit: deployNetwork.gasLimit,
  })
  const proverAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber || undefined,
    )
  )[0].args.addr as Address

  console.log(`${contractName} implementation deployed to: `, proverAddress)
  updateAddresses(deployNetwork.network, `${contractName}`, proverAddress)
  verifyContract(contractName, proverAddress, [deployArgs])
  return proverAddress
}

export async function deployIntentSource(deployNetwork: DeployNetwork, deploySalt: string, singletonDeployer: Deployer) {
  const contractName = 'IntentSource'
  const intentSourceFactory = await ethers.getContractFactory(contractName)
  const args = [deployNetwork.intentSource.minimumDuration, deployNetwork.intentSource.counter]
  const intentSourceTx = await intentSourceFactory.getDeployTransaction(args[0], args[1])
  const receipt = await singletonDeployer.deploy(intentSourceTx.data, deploySalt, {
    gasLimit: deployNetwork.gasLimit / 2,
  })

  const intentSourceAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber || undefined,
    )
  )[0].args.addr as Address

  console.log(`${contractName} deployed to:`, intentSourceAddress)
  updateAddresses(deployNetwork.network, `${contractName}`, intentSourceAddress)
  verifyContract(contractName, intentSourceAddress, args)
  return intentSourceAddress
}

export async function deployInbox(deployNetwork: DeployNetwork, inboxOwnerSigner: Signer, isSolvingPublic: boolean, solvers: Hex[], deploySalt: string, singletonDeployer: Deployer) {
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
  const inbox: Inbox = await ethers.getContractAt(
    contractName,
    inboxAddress,
    inboxOwnerSigner,
  )

  await inbox
    .connect(inboxOwnerSigner)
    .setMailbox(deployNetwork.hyperlaneMailboxAddress)

  console.log(`${contractName} implementation deployed to: `, inboxAddress)
  updateAddresses(deployNetwork.network, `${contractName}`, inboxAddress)
  verifyContract(contractName, inboxAddress, args)
  return inboxAddress
}

export async function deployHyperProver(deployNetwork: DeployNetwork, inboxAddress: Hex, deploySalt: string, singletonDeployer: Deployer) {
  const contractName = 'HyperProver'
  const hyperProverFactory = await ethers.getContractFactory(contractName)
  const args = [deployNetwork.hyperlaneMailboxAddress, inboxAddress]
  const hyperProverTx = await hyperProverFactory.getDeployTransaction(
    args[0],
    args[1],
  )

  const receipt = await singletonDeployer.deploy(hyperProverTx.data, deploySalt, {
    gasLimit: deployNetwork.gasLimit / 4,
  })

  console.log(`${contractName} deployed`)

  const hyperProverAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber || undefined,
    )
  )[0].args.addr as Hex

  console.log(`${contractName} deployed to: ${hyperProverAddress}`)
  updateAddresses(deployNetwork.network, `${contractName}`, hyperProverAddress)
  verifyContract(contractName, hyperProverAddress, args)
  return hyperProverAddress
}

export async function verifyContract(contractName: string, address: Hex, args: any[]) {
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
