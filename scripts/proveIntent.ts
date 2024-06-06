import { ethers } from 'hardhat'
import { IntentSource, Prover, Prover__factory } from '../typechain-types'
import proofGenerationOutput from '../output/proofGenerationOutput.json'

// import { ethers } from 'ethers'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''
const l1BlockAddress = process.env.L1BLOCK_ADDRESS || ''
// const inputFilePath = '../output/proofGenerationOutput.json'

const proverAddress = '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'

async function main() {
  const [provingSigner] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', provingSigner.address)

  const prover: Prover = await Prover__factory.connect(
    proverAddress,
    provingSigner,
  )

  await prover.proveIntent(...proofGenerationOutput)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
