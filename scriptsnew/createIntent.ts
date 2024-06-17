import { ethers } from 'hardhat'
import {
  ERC20,
  ERC20__factory,
  IntentSource,
  IntentSource__factory,
} from '../typechain-types'
import { encodeTransfer } from '../utils/encode'
import {
  AddressLike,
  BigNumberish,
  BytesLike,
  hexlify,
  getBytes,
  hexValue,
  stripZerosLeft,
  toQuantity,
} from 'ethers'
import config from '../config/config'
// import { toBytes } from 'viem'
// import { int } from 'hardhat/internal/core/params/argumentTypes'

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

export async function createIntent() {
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
  const latestBlock = await ethers.provider.getBlock('latest')
  const latestBlockNumberHex = hexlify(toQuantity(latestBlock.number))
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
    let intentHash
    // Get the event from the latest Block assume our intent is the l
    const intentHashEvents = await intentSource.queryFilter(
      intentSource.getEvent('IntentCreated'),
      latestBlockNumberHex,
    )
    console.log('intenthHashEvents: ', JSON.stringify(intentHashEvents, 0, 2))
    for (const intenthHashEvent of intentHashEvents) {
      if (intenthHashEvent.transactionHash === tx.hash) {
        intentHash = intenthHashEvent.topics[1]
        break
      }
    }
    console.log('IntentHash: ', intentHash)

    // console.log(
    //   'Intent Hash Events: ',
    //   await intentSource.queryFilter(
    //     intentSource.getEvent('IntentCreated'),
    //     latestBlockNumberHex,
    //     // latestBlock,
    //   ),
    // )
  } catch (e) {
    console.log(e)
  }
}
