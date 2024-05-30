import { ethers } from 'hardhat'
import { IntentSource, IntentSource__factory } from '../typechain-types'

const intentSourceAddress = ''
const intentHash = ''

async function main() {
  const [claimant] = await ethers.getSigners()
  console.log('claiming rewards with the account:', claimant.address)

  const intentSource: IntentSource = IntentSource__factory.connect(
    intentSourceAddress,
    claimant,
  )

  try {
    const tx = await intentSource.withdrawRewards(intentHash)
    console.log('withdraw complete: ', tx)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
