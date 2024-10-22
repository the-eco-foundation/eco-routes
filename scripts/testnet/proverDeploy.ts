import { ethers, run, network } from 'hardhat'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks } from '../../config/testnet/config'

const networkName = network.name
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

const ecoTestnetChainConfiguration = {
  chainId: networks.ecoTestnet.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.ecoTestnet.proving.mechanism, // provingMechanism
    settlementChainId: networks.ecoTestnet.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.ecoTestnet.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.ecoTestnet.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.ecoTestnet.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
let counter: number = 0
switch (networkName) {
  case 'baseSepolia':
    counter = networks.baseSepolia.intentSource.counter
    break
  case 'optimismSepolia':
    counter = networks.optimismSepolia.intentSource.counter
    break
  case 'ecoTestnet':
    counter = networks.ecoTestnet.intentSource.counter
    break
  default:
    counter = 0
    break
}
console.log('Counter: ', counter)

console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  const proverFactory = await ethers.getContractFactory('Prover')
  const prover = await proverFactory.deploy([
    baseSepoliaChainConfiguration,
    optimismSepoliaChainConfiguration,
    ecoTestnetChainConfiguration,
  ])
  console.log('prover implementation deployed to: ', await prover.getAddress())

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await setTimeout(30000)
      await run('verify:verify', {
        address: await prover.getAddress(),
        // constructorArguments: [l1BlockAddressSepolia, deployer.address],
        constructorArguments: [
          [
            baseSepoliaChainConfiguration,
            optimismSepoliaChainConfiguration,
            ecoTestnetChainConfiguration,
          ],
        ],
      })
      console.log('prover  verified at:', await prover.getAddress())
    }
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
