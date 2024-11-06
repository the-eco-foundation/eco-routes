import { ethers, run, network } from 'hardhat'
import {
  // networkIds,
  networks,
  deploymentChainConfigs,
} from '../../config/preprod/config'

// TODO: remove the await tx.wait() and update queries for deployed contracts
// Notes: Singleton Factory address (all chains): 0xce0042B868300000d44A59004Da54A005ffdcf9f
// Note: Singleton Factory Deployer : 0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3

const networkName = network.name
const salt = ethers.keccak256(ethers.toUtf8Bytes('PREPROD-JW108'))
let deployNetwork: any
let counter: number = 0
let minimumDuration: number = 0
let localGasLimit: number = 0

console.log('Deploying to Network: ', network.name)
let proverAddress = ''
let intentSourceAddress = ''
let inboxAddress = ''
let hyperProverAddress = ''
// Set the config for the chain we are deploying to
let chainConfig
switch (networkName) {
  case 'base':
    deployNetwork = networks.base
    chainConfig = deploymentChainConfigs.base
    break
  case 'optimism':
    deployNetwork = networks.optimism
    chainConfig = deploymentChainConfigs.optimism
    break
  case 'helix':
    deployNetwork = networks.helix
    chainConfig = deploymentChainConfigs.helix
    break
  case 'mantle':
    deployNetwork = networks.mantle
    chainConfig = deploymentChainConfigs.mantle
    break
  case 'arbitrum':
    deployNetwork = networks.arbitrum
    chainConfig = deploymentChainConfigs.arbitrum
    break
  default:
    break
}
// consozle.log('chainConfig: ', chainConfig)
// console.log('deployNetwork: ', deployNetwork)
// throw new Error('Done for now')

async function main() {
  localGasLimit = deployNetwork.gasLimit
  const [deployer] = await ethers.getSigners()

  // Get the singleton deployer
  const singletonDeployer = await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )
  localGasLimit = deployNetwork.gasLimit
  counter = deployNetwork.intentSource.counter
  minimumDuration = deployNetwork.intentSource.minimumDuration
  // console.log('localGasLimit: ', localGasLimit)
  // console.log('counter: ', counter)
  // console.log('minimumDuration: ', minimumDuration)
  // throw new Error('Done for now')
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
  //   baseChainConfiguration,
  //   optimismChainConfiguration,
  //   helixChainConfiguration,
  // ])
  if (proverAddress === '') {
    const proverReceipt = await singletonDeployer.deploy(proverTx.data, salt, {
      gasLimit: localGasLimit,
    })
    await proverReceipt.wait()
    console.log('prover deployed')
    // console.log('proverReceipt: ', proverReceipt)

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
      minimumDuration,
      counter,
    )
    const intentSourcereceipt = await singletonDeployer.deploy(
      intentSourceTx.data,
      salt,
      {
        gasLimit: localGasLimit / 2,
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
      // deployNetwork.hyperlaneMailboxAddress,
    )
    const inboxReceipt = await singletonDeployer.deploy(inboxTx.data, salt, {
      gasLimit: localGasLimit / 2,
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
    // console.log(
    //   'deployNetwork.hyperlaneMailboxAddress: ',
    //   deployNetwork.hyperlaneMailboxAddress,
    // )
    console.log('inboxAddress: ', inboxAddress)
    const hyperProverTx = await hyperProverFactory.getDeployTransaction(
      deployNetwork.hyperlaneMailboxAddress,
      inboxAddress,
    )

    const hyperProverReceipt = await singletonDeployer.deploy(
      hyperProverTx.data,
      salt,
      {
        gasLimit: localGasLimit / 4,
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
      constructorArguments: [minimumDuration, counter],
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
        // deployNetwork.hyperlaneMailboxAddress,
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
      constructorArguments: [
        deployNetwork.hyperlaneMailboxAddress,
        inboxAddress,
      ],
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
