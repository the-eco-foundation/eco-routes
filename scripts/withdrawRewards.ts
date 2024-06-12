import {
  Block,
  Provider,
  hexlify,
  keccak256,
  Wallet,
  Signer,
  AlchemyProvider,
} from 'ethers'
import { IntentSource, IntentSource__factory } from '../typechain-types'

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const CLAIMANT_PRIVATE_KEY = process.env.CLAIMANT_PRIVATE_KEY || ''
const L2SourceNetwork = 'optimism-sepolia'
const L2SourceProvider = new AlchemyProvider(L2SourceNetwork, ALCHEMY_API_KEY)
const claimant: Signer = new Wallet(CLAIMANT_PRIVATE_KEY, L2SourceProvider)
const intentSourceAddress =
  process.env.INTENT_SOURCE_ADDRESS ||
  '0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46'
const intentHash =
  process.env.INTENT_HASH ||
  '0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8'

async function main() {
  // const claimant: Signer = new Wallet(CLAIMANT_PRIVATE_KEY, L1Provider)
  // const [claimant] = await ethers.getSigners()
  console.log('claiming rewards with the account:', claimant.getAddress())

  const intentSource: IntentSource = IntentSource__factory.connect(
    intentSourceAddress,
    claimant,
  )

  try {
    const tx = await intentSource.withdrawRewards(intentHash)
    console.log('withdraw complete: ', tx.hash)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
