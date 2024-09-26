import { ethers, run, network } from 'hardhat'
import { Inbox, SingletonFactory, Deployer } from '../../typechain-types'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks, actors } from '../../config/testnet/config'

const networkName = network.name
const salt = ethers.keccak256(ethers.toUtf8Bytes('TESTNET'))

console.log('Deploying to Network: ', network.name)
const baseSepoliaChainConfiguration = {
  chainId: networks.baseSepolia.chainId, // chainId
  mailboxAddress: networks.baseSepolia.hyperlaneMailboxAddress,
}

const optimismSepoliaChainConfiguration = {
  chainId: networks.optimismSepolia.chainId, // chainId
  mailboxAddress:
    networks.optimismSepolia.hyperlaneMailboxAddressmailboxAddress,
}

let config
if (network.name === 'optimismSepolia') {
  config = optimismSepoliaChainConfiguration
} else {
  config = baseSepoliaChainConfiguration
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const singletonDeployer: Deployer = (
    await ethers.getContractFactory('deployer')
  ).deploy()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log(`**************************************************`)

  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inboxTx = await inboxFactory.getDeployTransaction(
    deployer.address,
    true,
    [],
    config.mailboxAddress,
  )
  let receipt = await singletonDeployer.deploy(inboxTx.data, salt, {
    gaslimit: 1000000,
  })

  const inboxAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber,
    )
  )[0].args.addr

  console.log(`intentSource deployed to: ${inboxAddress}`)

  const hyperProverFactory = await ethers.getContractFactory('HyperProver')

  const hyperProverTx = await hyperProverFactory.getDeployTransaction(
    config.mailboxAddress,
    inboxAddress,
  )

  receipt = await singletonDeployer.deploy(hyperProverTx.data, salt, {
    gasLimit: 1000000,
  })
  const hyperProverAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      receipt.blockNumber,
    )
  )[0].args.addr

  console.log(`hyperProver deployed to: ${inboxAddress}`)

  try {
    await run('verify:verify', {
      address: inboxAddress,
      constructorArguments: [deployer.address, true, [], config.mailboxAddress],
    })
    console.log('inbox verified at:', inboxAddress)
  } catch (e) {
    console.log(`Error verifying inbox`, e)
  }

  try {
    await run('verify:verify', {
      address: hyperProverAddress,
      constructorArguments: [config.mailboxAddress, inboxAddress],
    })
    console.log('hyperProver verified at:', hyperProverAddress)
  } catch (e) {
    console.log(`Error verifying hyperProver`, e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
