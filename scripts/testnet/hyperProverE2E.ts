import { ethers } from 'hardhat'
import { setTimeout } from 'timers/promises'
import {
  AlchemyProvider,
  AbiCoder,
  BigNumberish,
  BytesLike,
  toQuantity,
  zeroPadValue,
  Signer,
} from 'ethers'
import { encodeTransfer } from '../../utils/encode'
import { networks, intent, actors } from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

let sourceNetwork: any, destinationNetwork: any
let sourceProvider: any
let intentCreator: Signer
let solver: Signer

const baseSepoliaProvider = new AlchemyProvider(
  networks.baseSepolia.network,
  ALCHEMY_API_KEY,
)

const optimismSepoliaProvider = new AlchemyProvider(
  networks.baseSepolia.network,
  ALCHEMY_API_KEY,
)

console.log('Testing hyperproving across base and optimism testnets')

async function main() {
  ;[sourceNetwork, destinationNetwork] = [
    networks.baseSepolia,
    networks.optimismSepolia,
  ]
  sourceProvider = baseSepoliaProvider
  intentCreator = s.baseSepoliaIntentCreator
  solver = s.optimismSepoliaSolver
  console.log(`From ${sourceNetwork.network} to ${destinationNetwork.network}:`)
  await hyperproveInstant()
  // switch networks
  ;[sourceNetwork, destinationNetwork] = [
    networks.optimismSepolia,
    networks.baseSepolia,
  ]
  sourceProvider = optimismSepoliaProvider
  intentCreator = s.optimismSepoliaIntentCreator
  solver = s.baseSepoliaSolver
  console.log(`From ${sourceNetwork.network} to ${destinationNetwork.network}:`)
  await hyperproveInstant()
}

export async function hyperproveInstant() {
  const rewardToken = await ethers.getContractAt(
    'ERC20',
    sourceNetwork.usdcAddress,
    intentCreator,
  )
  const intentSource = await ethers.getContractAt(
    'IntentSource',
    sourceNetwork.intentSourceAddress,
    intentCreator,
  )
  const targetToken = await ethers.getContractAt(
    'ERC20',
    destinationNetwork.usdcAddress,
    solver,
  )
  const inbox = await ethers.getContractAt(
    'Inbox',
    destinationNetwork.inboxAddress,
    solver,
  )
  const hyperprover = await ethers.getContractAt(
    'HyperProver',
    sourceNetwork.hyperProverContractAddress,
    intentCreator, // have to do this so the hyperprover is looking for intents on the source chain
  )

  const approvalTx = await rewardToken.approve(
    await intentSource.getAddress(),
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await sourceProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash: string = ''
  try {
    const intentTx = await intentSource.createIntent(
      destinationNetwork.chainId, // desination chainId
      destinationNetwork.inboxAddress, // destination inbox address
      [await targetToken.getAddress()], // target Tokens
      data, // calldata for destination chain
      [await rewardToken.getAddress()], // reward Tokens on source chain
      intent.rewardAmounts, // reward amounts on source chain
      expiryTime, // intent expiry time
      sourceNetwork.hyperProverContractAddress, // prover contract address on the sourceChain
    )
    await intentTx.wait()
    // Get the event from the latest Block checking transaction hash
    const intentHashEvents = await intentSource.queryFilter(
      intentSource.filters.IntentCreated(),
      latestBlockNumberHex,
    )
    for (const intentHashEvent of intentHashEvents) {
      //   console.log(intentHashEvent.topics[1])
      if (intentHashEvent.transactionHash === intentTx.hash) {
        intentHash = intentHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash: ', intentHash)
    console.log('Intent Creation tx: ', intentTx.hash)
  } catch (e) {
    if (e.data && intentSource) {
      const decodedError = intentSource.interface.parseError(e.data)
      console.log(`Transaction failed in createIntent : ${decodedError?.name}`)
      console.log('createIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in createIntent:`, e)
    }
  }
  // console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent = await intentSource.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract

    const fundTx = await targetToken.transfer(
      destinationNetwork.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const messageBody = AbiCoder.defaultAbiCoder().encode(
      ['bytes[]', 'address[]'],
      //   [thisIntent.data.toArray(), thisIntent.targets.toArray()],
      [thisIntent.data, [actors.recipient]],
    )

    console.log('fetching fee')
    const fee = await inbox.fetchFee(
      sourceNetwork.chainId,
      messageBody,
      zeroPadValue(sourceNetwork.hyperProverContractAddress, 32),
    )

    console.log(`got the fee: ${fee}`)

    const fulfillTx = await inbox.fulfillHyperInstant(
      sourceNetwork.chainId, // source chainId
      [await targetToken.getAddress()], // target  token addresses
      data, // calldata
      expiryTime, // expiry time
      thisIntent.nonce, // nonce
      actors.recipient, // recipient
      intentHash, // expected intent hash
      sourceNetwork.hyperProverContractAddress, // hyperprover contract address
      { value: fee },
    )
    console.log('Fulfillment tx: ', fulfillTx.hash)
  } catch (e) {
    console.log(inbox.interface.parseError(e.data))
  }

  console.log('Waiting for the dust to settle')
  await setTimeout(45000)

  console.log('show me da money')
  const intentProvenEvents = await hyperprover
    .connect(intentCreator)
    .queryFilter(hyperprover.getEvent('IntentProven'), latestBlockNumberHex)
  for (const event of intentProvenEvents) {
    if ((intentHash = event.topics[1])) {
      console.log('it hath been proven')
      break
    }
  }

  const initialBalance = await rewardToken.balanceOf(actors.recipient)
  const tx = await intentSource.withdrawRewards(intentHash)
  await tx.wait()
  if ((await rewardToken.balanceOf(actors.recipient)) > initialBalance) {
    console.log('great success')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
