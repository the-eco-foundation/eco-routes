import { ethers } from 'hardhat'
import { IntentSource, Prover, Prover__factory } from '../typechain-types'
import proofGenerationOutput from './proof.json'

// import { ethers } from 'ethers'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''
const l1BlockAddress = process.env.L1BLOCK || ''
// const inputFilePath = '../output/proofGenerationOutput.json'

const proverAddress = ''

async function main() {
  //   const [provingSigner] = await ethers.getSigners()
  //   console.log('Deploying contracts with the account:', provingSigner.address)

  //   const prover: Prover = await Prover__factory.connect(
  //     proverAddress,
  //     provingSigner,
  //   )
  const proof = JSON.parse(proofGenerationOutput)
  console.log(proof)

  //   await prover.proveIntent(...proofGenerationOutput)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
