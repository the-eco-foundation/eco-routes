import { ethers, run, network } from 'hardhat'
import { IntentSource, Prover } from '../../../typechain-types'
import config from '../../../config/testnet/config'
import { setTimeout } from 'timers/promises'
import { getAddress } from 'ethers'

const networkName = network.name
const l1BlockAddressSepolia = getAddress(config.optimismSepolia.l1BlockAddress)
const outputOracleAddressSepolia = getAddress(
  config.sepolia.l2BaseOutputOracleAddress,
)
const l2OptimismDisputeGameFactory = getAddress(
  config.sepolia.l2OptimismDisputeGameFactory,
)

console.log('Deploying to Network: ', networkName)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover: Prover = await proverFactory.deploy(
    l1BlockAddressSepolia,
    outputOracleAddressSepolia,
    l2OptimismDisputeGameFactory,
  )
  console.log('prover deployed to:', await prover.getAddress())
  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await setTimeout(30000)
      await run('verify:verify', {
        address: await prover.getAddress(),
        constructorArguments: [
          l1BlockAddressSepolia,
          outputOracleAddressSepolia,
          l2OptimismDisputeGameFactory,
        ],
      })
      console.log('prover verified at:', await prover.getAddress())
    }
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSource: IntentSource = await intentSourceFactory.deploy(
    await prover.getAddress(),
    1000,
    config.intentSourceCounter,
  )
  console.log('intentSource deployed to:', await intentSource.getAddress())

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await setTimeout(30000)
      await run('verify:verify', {
        address: await intentSource.getAddress(),
        constructorArguments: [
          await prover.getAddress(),
          1000,
          config.intentSourceCounter,
        ],
      })
    }
    console.log('intentSource verified at:', await intentSource.getAddress())
  } catch (e) {
    console.log(`Error verifying intentSoruc`, e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
