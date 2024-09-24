import { ethers, network } from 'hardhat'
import { SingletonFactory } from '../../typechain-types'
// import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks, actors } from '../../config/testnet/config'

const networkName = network.name
const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
const salt = ethers.keccak256(ethers.toUtf8Bytes('TESTNET'))

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
let counter: number = 0
let minimumDuration: number = 0
switch (networkName) {
  case 'baseSepolia':
    counter = networks.baseSepolia.intentSource.counter
    minimumDuration = networks.baseSepolia.intentSource.minimumDuration
    break
  case 'optimismSepolia':
    counter = networks.optimismSepolia.intentSource.counter
    minimumDuration = networks.optimismSepolia.intentSource.minimumDuration
    break
  case 'ecoTestNet':
    counter = networks.ecoTestNet.intentSource.counter
    minimumDuration = networks.ecoTestNet.intentSource.minimumDuration
    break
  default:
    counter = 0
    minimumDuration = 0
    break
}
console.log('Counter: ', counter)

console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  const singletonFactory: SingletonFactory = await ethers.getContractAt(
    'SingletonFactory',
    singletonFactoryAddress,
  )
  console.log('Deploying contracts with the account:', deployer.address)
  console.log(`**************************************************`)
  const proverFactory = await ethers.getContractFactory('Prover')
  const proverDeployTx = await proverFactory.getDeployTransaction([
    baseSepoliaChainConfiguration,
    optimismSepoliaChainConfiguration,
    ecoTestNetChainConfiguration,
  ])
  let receipt = await singletonFactory.deploy(proverDeployTx.data, salt, {
    gasLimit: 5000000,
  })
  console.log('Prover deployed in tx with hash: ', receipt.hash)

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSourceDeployTx = await intentSourceFactory.getDeployTransaction(
    minimumDuration,
    counter,
  )
  receipt = await singletonFactory.deploy(intentSourceDeployTx.data, salt, {
    gasLimit: 1500000,
  })
  console.log('intentSource deployed in tx with hash: ', receipt.hash)

  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inboxDeployTx = await inboxFactory.getDeployTransaction(
    deployer.address,
    false,
    [actors.solver],
  )
  receipt = await singletonFactory.deploy(inboxDeployTx.data, salt, {
    gasLimit: 1000000,
  })
  console.log('Inbox deployed in tx with hash: ', receipt.hash)

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address

  // also having trouble with this since cant get contract addresses
  //   if (network.name !== 'hardhat') {
  //     console.log('Waiting for 30 seconds for Bytecode to be on chain')
  //     await setTimeout(30000)
  //     try {
  //       await run('verify:verify', {
  //         address: await prover.getAddress(),
  //         // constructorArguments: [l1BlockAddressSepolia, deployer.address],
  //         constructorArguments: [
  //           [
  //             baseSepoliaChainConfiguration,
  //             optimismSepoliaChainConfiguration,
  //             ecoTestNetChainConfiguration,
  //           ],
  //         ],
  //       })
  //     } catch (e) {
  //       console.log(`Error verifying prover`, e)
  //     }
  //     try {
  //       await run('verify:verify', {
  //         address: await intentSource.getAddress(),
  //         constructorArguments: [minimumDuration, counter],
  //       })
  //       console.log('intentSource verified at:', await intentSource.getAddress())
  //     } catch (e) {
  //       console.log(`Error verifying intentSource`, e)
  //     }
  //     try {
  //       await run('verify:verify', {
  //         address: await inbox.getAddress(),
  //         constructorArguments: [deployer.address, false, [actors.solver]],
  //       })
  //       console.log('Inbox verified at:', await inbox.getAddress())
  //     } catch (e) {
  //       console.log(`Error verifying inbox`, e)
  //     }
  //   }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
