import { ethers, run, network } from 'hardhat'
import { IntentSource, Prover } from '../typechain-types'
import config from '../config/config'
// import { setTimeout } from 'timers/promises'

// import { ethers } from 'ethers'
const networkName = network.name
const l1BlockAddressSepolia = config.optimismSepolia.l1BlockAddress
const outputOracleAddressSepolia = config.sepolia.l2BaseOutputOracleAddress
const l1BlockAddressMainnet = config.optimism.l1BlockAddress
const outputOracleAddressMainnet = config.mainnet.l2BaseOutputOracleAddress
let l1BlockAddress
let outputOracleAddress

console.log('Deploying to Network: ', networkName)

if (networkName === 'optimism') {
  l1BlockAddress = l1BlockAddressMainnet
  outputOracleAddress = outputOracleAddressMainnet
} else {
  l1BlockAddress = l1BlockAddressSepolia
  outputOracleAddress = outputOracleAddressSepolia
}
console.log('l1BlockAddress: ', l1BlockAddress)
console.log('outputOracleAddress: ', outputOracleAddress)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover: Prover = await proverFactory.deploy(
    l1BlockAddress,
    outputOracleAddress,
  )
  console.log('prover deployed to:', await prover.getAddress())
  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      await run('verify:verify', {
        address: await prover.getAddress(),
        constructorArguments: [l1BlockAddress, outputOracleAddress],
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
