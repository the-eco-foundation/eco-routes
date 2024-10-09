import { ethers, run, network } from 'hardhat'
import { networks } from '../../config/testnet/config'

// TODO: remove the await tx.wait() and update queries for deployed contracts
// Notes: Singleton Factory address (all chains): 0xce0042B868300000d44A59004Da54A005ffdcf9f
// Note: Singleton Factory Deployer : 0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3

const networkName = network.name
const salt = ethers.keccak256(ethers.toUtf8Bytes('TESTNET14'))

console.log('Deploying to Network: ', network.name)
const baseSepoliaChainConfiguration = {
  chainId: networks.baseSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.baseSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.baseSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.baseSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

const optimismSepoliaChainConfiguration = {
  chainId: networks.optimismSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.optimismSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.optimismSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract:
      networks.optimismSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.optimismSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.optimismSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

const ecoTestNetChainConfiguration = {
  chainId: networks.ecoTestNet.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.ecoTestNet.proving.mechanism, // provingMechanism
    settlementChainId: networks.ecoTestNet.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.ecoTestNet.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.ecoTestNet.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.ecoTestNet.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
// Set the config for the chain we are deploying to
let config
switch (networkName) {
  case 'baseSepolia':
    config = networks.baseSepolia
    break
  case 'optimismSepolia':
    config = networks.optimismSepolia
    break
  case 'ecoTestNet':
    config = networks.ecoTestNet
    break
  default:
    break
}
// console.log('config: ', config)

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
  const proverTx = await proverFactory.getDeployTransaction([
    baseSepoliaChainConfiguration,
    optimismSepoliaChainConfiguration,
    ecoTestNetChainConfiguration,
  ])
  const proverReceipt = await singletonDeployer.deploy(proverTx.data, salt, {
    gaslimit: 1000000,
  })
  await proverReceipt.wait()
  console.log('prover deployed')

  const proverAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      proverReceipt.blockNumber,
    )
  )[0].args.addr

  console.log(`prover deployed to: ${proverAddress}`)

  // Deploy the intent source

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

  const intentSourceAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      intentSourcereceipt.blockNumber,
    )
  )[0].args.addr

  console.log(`intentSource deployed to: ${intentSourceAddress}`)

  // Deploy the inbox
  const inboxTx = await inboxFactory.getDeployTransaction(
    deployer.address,
    true,
    [],
    config.hyperlaneMailboxAddress,
  )
  const inboxReceipt = await singletonDeployer.deploy(inboxTx.data, salt, {
    gaslimit: 1000000,
  })
  await inboxReceipt.wait()
  console.log('inbox deployed')

  const inboxAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      inboxReceipt.blockNumber,
    )
  )[0].args.addr

  console.log(`inbox deployed to: ${inboxAddress}`)

  // Deploy the hyperProver
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

  const hyperProverAddress = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      hyperProverReceipt.blockNumber,
    )
  )[0].args.addr

  console.log(`hyperProver deployed to: ${hyperProverAddress}`)

  // Verify all the contracts
  // verify prover
  try {
    await run('verify:verify', {
      address: proverAddress,
      constructorArguments: [
        [
          baseSepoliaChainConfiguration,
          optimismSepoliaChainConfiguration,
          ecoTestNetChainConfiguration,
        ],
      ],
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
        config.hyperlaneMailboxAddress,
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
