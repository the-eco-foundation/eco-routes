import { ethers, run, network } from 'hardhat'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks } from '../../config/mainnet/config'

const networkName = network.name
console.log('Deploying to Network: ', network.name)
let counter: number = 0
switch (networkName) {
  case 'base':
    counter = networks.base.intentSource.counter
    break
  case 'optimism':
    counter = networks.optimism.intentSource.counter
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
  const baseChainConfiguration = {
    chainId: networks.base.chainId, // chainId
    chainConfiguration: {
      provingMechanism: networks.base.proving.mechanism, // provingMechanism
      settlementChainId: networks.base.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.base.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
      blockhashOracle: networks.base.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.base.proving.outputRootVersionNumber, // outputRootVersionNumber
    },
  }

  const optimismChainConfiguration = {
    chainId: networks.optimism.chainId, // chainId
    chainConfiguration: {
      provingMechanism: networks.optimism.proving.mechanism, // provingMechanism
      settlementChainId: networks.optimism.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.optimism.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.     blockhashOracle: networks.optimism.proving.l1BlockAddress,
      blockhashOracle: networks.optimism.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.optimism.proving.outputRootVersionNumber, // outputRootVersionNumber
    },
  }

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover = await proverFactory.deploy([
    baseChainConfiguration,
    optimismChainConfiguration,
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
          [baseChainConfiguration, optimismChainConfiguration],
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
