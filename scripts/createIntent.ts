import { ethers } from 'hardhat'
import {
  ERC20,
  ERC20__factory,
  IntentSource,
  IntentSource__factory,
} from '../typechain-types'
import { encodeTransfer } from '../utils/encode'
import { AddressLike, BigNumberish, BytesLike } from 'ethers'

// called from op sepolia
const intentSourceAddress =
  process.env.INTENT_SOURCE || '0x141847b34250441dCC1a19445Aaea44F8A1e8f9b'
const destChainID: BigNumberish = 84532 // base sepolia
const target =
  process.env.USDC_BASE_SEPOLIA_ADDRESS ||
  '0xAb1D243b07e99C91dE9E4B80DFc2B07a8332A2f7'.toLowerCase() // base sepolia usdc
const destAddress =
  process.env.RECIPIENT_ADDRESS ||
  '0xCd80B973e7CBB93C21Cc5aC0A5F45D12A32582aa'.toLowerCase()
const rewardTokenAddress =
  process.env.USDC_OPTIMISM_SEPOLIA_ADDRESS ||
  '0x00D2d1162c689179e8bA7a3b936f80A010A0b5CF'.toLowerCase() // optimism sepolia usdc
const amt = 1234
const duration = 3600 // 1 hour

let targets: AddressLike[]
let data: BytesLike[]
let rewardTokens: AddressLike[]
let rewardAmounts: BigNumberish[]
let expiryTime: BigNumberish

async function main() {
  const [creator] = await ethers.getSigners()

  // approve lockup
  const rewardToken: ERC20 = ERC20__factory.connect(rewardTokenAddress, creator)
  await rewardToken.approve(intentSourceAddress, amt)

  const intentSource: IntentSource = IntentSource__factory.connect(
    intentSourceAddress,
    creator,
  )
  // create intent
  targets = [target]
  data = [await encodeTransfer(destAddress, amt)]
  rewardTokens = [rewardTokenAddress]
  rewardAmounts = [amt]
  expiryTime = (await ethers.provider.getBlock('latest'))!.timestamp + duration

  try {
    const tx = await intentSource.createIntent(
      destChainID,
      targets,
      data,
      rewardTokens,
      rewardAmounts,
      expiryTime,
    )

    console.log('successful intent creation: ', tx.hash)
    console.log(
      'event: ',
      (
        await intentSource.queryFilter(intentSource.getEvent('IntentCreated'))
      )[0].topics[1],
    )
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
