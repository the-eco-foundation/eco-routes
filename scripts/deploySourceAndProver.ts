import { ethers, run } from 'hardhat'
import { IntentSource, Prover } from '../typechain-types'
import config from '../config/config'
import { setTimeout } from 'timers/promises'

// import { ethers } from 'ethers'

const l1BlockAddress = config.optimismSepolia.l1BlockAddress
const outputOracleAddress = config.sepolia.l2BaseOutputOracleAddress

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover: Prover = await proverFactory.deploy(
    l1BlockAddress,
    outputOracleAddress,
  )
  console.log('prover deployed to:', await prover.getAddress())
  // console.log('waiting 30 seconds to ensure bytecode is on chain')
  // await setTimeout(30000)
  await run('verify:verify', {
    address: await prover.getAddress(),
    constructorArguments: [l1BlockAddress, outputOracleAddress],
  })
  console.log('prover verified at:', await prover.getAddress())

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSource: IntentSource = await intentSourceFactory.deploy(
    await prover.getAddress(),
    1000,
  )
  console.log('intentSource deployed to:', await intentSource.getAddress())

  // await setTimeout(30000)
  await run('verify:verify', {
    address: await intentSource.getAddress(),
    constructorArguments: [await prover.getAddress(), 1000],
  })

  console.log('intentSource verified at:', await intentSource.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
