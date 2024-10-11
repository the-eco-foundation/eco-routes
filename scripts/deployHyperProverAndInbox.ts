import { ethers, run, network } from 'hardhat'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks } from '../config/testnet/config'

const salt = ethers.keccak256(ethers.toUtf8Bytes('MAINNET'))

let inboxAddress = ''
let hyperProverAddress = ''

console.log('Deploying to Network: ', network.name)
const baseSepoliaChainConfiguration = {
  chainId: networks.baseSepolia.chainId, // chainId
  mailboxAddress: networks.baseSepolia.hyperlaneMailboxAddress,
}

const optimismSepoliaChainConfiguration = {
  chainId: networks.optimismSepolia.chainId, // chainId
  mailboxAddress: networks.optimismSepolia.hyperlaneMailboxAddress,
}

const ecoTestnetChainConfiguration = {
  chainId: networks.ecoTestNet.chainId, // chainId
  mailboxAddress: networks.ecoTestNet.hyperlaneMailboxAddress,
}

let config
if (network.name === 'optimismSepoliaBlockscout') {
  config = optimismSepoliaChainConfiguration
} else if (network.name === 'baseSepolia') {
  config = baseSepoliaChainConfiguration
} else if (network.name === 'ecoTestNet') {
  config = ecoTestnetChainConfiguration
}

async function main() {
  const [deployer] = await ethers.getSigners()

  const singletonDeployer = await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )
  let receipt
  console.log('Deploying contracts with the account:', deployer.address)
  console.log(`**************************************************`)
  if (inboxAddress === '') {
    const inboxFactory = await ethers.getContractFactory('Inbox')

    const inboxTx = await inboxFactory.getDeployTransaction(
      deployer.address,
      true,
      [],
    )
    receipt = await singletonDeployer.deploy(inboxTx.data, salt, {
      gaslimit: 1000000,
    })
    console.log('inbox deployed')

    inboxAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr

    console.log(`inbox deployed to: ${inboxAddress}`)

    const inbox = await ethers.getContractAt('Inbox', inboxAddress)

    receipt = await inbox.setMailbox(config.mailboxAddress)
    await receipt.wait()

    console.log(`Mailbox set to ${config.mailboxAddress}`)
  }

  if (hyperProverAddress === '' && inboxAddress !== '') {
    const hyperProverFactory = await ethers.getContractFactory('HyperProver')

    const hyperProverTx = await hyperProverFactory.getDeployTransaction(
      config.mailboxAddress,
      inboxAddress,
    )

    receipt = await singletonDeployer.deploy(hyperProverTx.data, salt, {
      gasLimit: 1000000,
    })
    console.log('hyperProver deployed')

    hyperProverAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr

    console.log(`hyperProver deployed to: ${hyperProverAddress}`)
  }

  console.log('Waiting for 15 seconds for Bytecode to be on chain')
  await setTimeout(15000)

  try {
    await run('verify:verify', {
      address: inboxAddress,
      constructorArguments: [deployer.address, true, []],
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
