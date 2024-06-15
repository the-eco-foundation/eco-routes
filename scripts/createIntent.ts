import { ethers } from 'hardhat'
import {
  ERC20,
  ERC20__factory,
  IntentSource,
  IntentSource__factory,
} from '../typechain-types'
import { encodeTransfer } from '../utils/encode'
import { AddressLike, BigNumberish, BytesLike } from 'ethers'
import config from '../config/config'
import { int } from 'hardhat/internal/core/params/argumentTypes'

// called from op sepolia
console.log(
  'config.layer2Source.intentSourceAddress: ',
  config.layer2Source.intentSourceAddress,
)
const intentSourceAddress = config.layer2Source.intentSourceAddress
const rewardAmounts = config.intent.rewardAmounts
const rewardTokens = config.intent.rewardTokens
const destChainID: BigNumberish = config.intent.destinationChainId
const targetTokens = config.intent.targetTokens
const targetAmounts = config.intent.targetAmounts
const recipient = config.intent.recipient
const duration = config.intent.duration

async function main() {
  const [deployer, creator, prover, solver] = await ethers.getSigners()

  // approve lockup
  const rewardToken: ERC20 = ERC20__factory.connect(rewardTokens[0], creator)
  await rewardToken.approve(intentSourceAddress, rewardAmounts[0])

  const intentSource: IntentSource = IntentSource__factory.connect(
    intentSourceAddress,
    creator,
  )
  // create intent
  const data: BytesLike[] = [await encodeTransfer(recipient, targetAmounts[0])]
  const expiryTime: BigNumberish =
    (await ethers.provider.getBlock('latest'))!.timestamp + duration

  try {
    const tx = await intentSource.createIntent(
      destChainID,
      targetTokens,
      data,
      rewardTokens,
      rewardAmounts,
      expiryTime,
    )

    console.log('successful intent creation: ', tx.hash)
    console.log(
      'Intent Hash Events: ',
      await intentSource.queryFilter(intentSource.getEvent('IntentCreated')),
    )
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
