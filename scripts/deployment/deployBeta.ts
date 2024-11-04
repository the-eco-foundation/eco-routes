import { ethers, run, network } from 'hardhat'
import {
  // networkIds,
  networks,
  deploymentChainConfigs,
} from '../../config/testnet/config'

// TODO: remove the await tx.wait() and update queries for deployed contracts
// Notes: Singleton Factory address (all chains): 0xce0042B868300000d44A59004Da54A005ffdcf9f
// Note: Singleton Factory Deployer : 0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3

const networkName = network.name
const salt = ethers.keccak256(ethers.toUtf8Bytes('TESTNET-JW3'))

console.log('Deploying to Network: ', network.name)
let proverAddress = ''
let intentSourceAddress = ''
let inboxAddress = ''
let hyperProverAddress = ''
// Set the config for the chain we are deploying to
let config
let chainConfig
switch (networkName) {
  case 'baseSepolia':
    config = networks.baseSepolia
    chainConfig = deploymentChainConfigs.baseSepolia
    break
  case 'optimismSepolia':
    config = networks.optimismSepolia
    chainConfig = deploymentChainConfigs.optimismSepolia
    break
  case 'ecoTestnet':
    config = networks.ecoTestnet
    chainConfig = deploymentChainConfigs.ecoTestnet
    break
  default:
    break
}
// console.log('chainConfig: ', chainConfig)

async function main() {
  const [deployer] = await ethers.getSigners()

  // Get the singleton deployer
  const singletonDeployer = await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )

  console.log('Deploying contracts with the account:', deployer.address)
  console.log(
    'Deploying contracts with the singleton deployer:',
    await singletonDeployer.getAddress(),
  )
  console.log(`**************************************************`)

  const proverFactory = await ethers.getContractFactory('Prover')
  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const inboxFactory = await ethers.getContractFactory('Inbox')
  const hyperProverFactory = await ethers.getContractFactory('HyperProver')
  // Deploy the prover
  const proverTx = await proverFactory.getDeployTransaction(chainConfig)
  //   [
  //   baseSepoliaChainConfiguration,
  //   optimismSepoliaChainConfiguration,
  //   ecoTestnetChainConfiguration,
  // ])
  if (proverAddress === '') {
    const proverReceipt = await singletonDeployer.deploy(proverTx.data, salt, {
      gaslimit: 1000000,
    })
    await proverReceipt.wait()
    console.log('prover deployed')

    proverAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        proverReceipt.blockNumber,
      )
    )[0].args.addr

    console.log(`prover deployed to: ${proverAddress}`)
  } else {
    console.log('prover already deployed at:', proverAddress)
  }

  // Deploy the intent source
  if (intentSourceAddress === '') {
    const intentSourceTx = await intentSourceFactory.getDeployTransaction(
      config.intentSource.minimumDuration,
      config.intentSource.counter,
    )
    const intentSourcereceipt = await singletonDeployer.deploy(
      intentSourceTx.data,
      salt,
      {
        gaslimit: 1000000,
      },
    )
    await intentSourcereceipt.wait()
    console.log('IntentSource deployed')

    intentSourceAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        intentSourcereceipt.blockNumber,
      )
    )[0].args.addr

    console.log(`intentSource deployed to: ${intentSourceAddress}`)
  } else {
    console.log('intentSource already deployed at:', intentSourceAddress)
  }

  // Deploy the inbox
  if (inboxAddress === '') {
    const inboxTx = await inboxFactory.getDeployTransaction(
      deployer.address,
      true,
      [],
      // config.hyperlaneMailboxAddress,
    )
    const inboxReceipt = await singletonDeployer.deploy(inboxTx.data, salt, {
      gaslimit: 1000000,
    })
    await inboxReceipt.wait()
    console.log('inbox deployed')

    inboxAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        inboxReceipt.blockNumber,
      )
    )[0].args.addr

    console.log(`inbox deployed to: ${inboxAddress}`)
  } else {
    console.log('inbox already deployed at:', inboxAddress)
  }

  // Deploy the hyperProver
  if (hyperProverAddress === '') {
    console.log(
      'config.hyperlaneMailboxAddress: ',
      config.hyperlaneMailboxAddress,
    )
    console.log('inboxAddress: ', inboxAddress)
    const hyperProverTx = await hyperProverFactory.getDeployTransaction(
      config.hyperlaneMailboxAddress,
      inboxAddress,
    )

    const hyperProverReceipt = await singletonDeployer.deploy(
      hyperProverTx.data,
      salt,
      {
        gasLimit: 1000000,
      },
    )
    await hyperProverReceipt.wait()
    console.log('hyperProver deployed')

    hyperProverAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        hyperProverReceipt.blockNumber,
      )
    )[0].args.addr

    console.log(`hyperProver deployed to: ${hyperProverAddress}`)
  } else {
    console.log('hyperProver already deployed at:', hyperProverAddress)
  }

  // Verify all the contracts
  // verify prover
  try {
    await run('verify:verify', {
      address: proverAddress,
      constructorArguments: [chainConfig],
    })
    console.log('prover verified at:', proverAddress)
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }

  // verify intentSource
  try {
    await run('verify:verify', {
      address: intentSourceAddress,
      constructorArguments: [
        config.intentSource.minimumDuration,
        config.intentSource.counter,
      ],
    })
    console.log('intentSource verified at:', inboxAddress)
  } catch (e) {
    console.log(`Error verifying intentSource`, e)
  }
  // verifiy inbox
  try {
    await run('verify:verify', {
      address: inboxAddress,
      constructorArguments: [
        deployer.address,
        true,
        [],
        // config.hyperlaneMailboxAddress,
      ],
    })
    console.log('inbox verified at:', inboxAddress)
  } catch (e) {
    console.log(`Error verifying inbox`, e)
  }
  // verify hyperProver
  try {
    await run('verify:verify', {
      address: hyperProverAddress,
      constructorArguments: [config.hyperlaneMailboxAddress, inboxAddress],
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
