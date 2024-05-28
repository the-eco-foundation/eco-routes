import { ethers } from 'hardhat'
import { IntentSource, Prover } from '../typechain-types'

// import { ethers } from 'ethers'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''
const l1BlockAddress = process.env.L1BLOCK || ''

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover: Prover = await proverFactory.deploy(l1BlockAddress)
  console.log('prover deployed to:', await prover.getAddress())

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSource: IntentSource = await intentSourceFactory.deploy(
    await prover.getAddress(),
    1000
  )
  console.log('intentSource deployed to:', await intentSource.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
