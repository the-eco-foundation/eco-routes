import { ethers } from 'hardhat'
import { IntentSource, IntentSource__factory } from '../typechain-types'

const intentSourceAddress = '0x141847b34250441dCC1a19445Aaea44F8A1e8f9b'
const intentHash =
  '0xaac8c197b419c8be5545949d5a1a6dc3514dd018dabd603f0e3c9006dec55105'

async function main() {
  const [claimant] = await ethers.getSigners()
  console.log('claiming rewards with the account:', claimant.address)

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
