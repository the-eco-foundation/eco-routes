import { ethers, run, network } from 'hardhat'
import { setTimeout } from 'timers/promises'
import {
  AlchemyProvider,
  AbiCoder,
  BigNumberish,
  BytesLike,
  toQuantity,
  zeroPadValue,
} from 'ethers'
import { encodeTransfer } from '../../utils/encode'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks, intent, actors } from '../../config/testnet/config'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

let sourceNetwork: any, destinationNetwork: any
let sourceProvider: any

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
  ;[sourceNetwork, destinationNetwork] =
    (networks.baseSepolia, networks.optimismSepolia)
  sourceProvider = baseSepoliaProvider
  console.log(`From ${sourceNetwork.network} to ${destinationNetwork.network}:`)
  hyperproveInstant()
  // switch networks
  ;[sourceNetwork, destinationNetwork] =
    (networks.optimismSepolia, networks.baseSepolia)
  sourceProvider = optimismSepoliaProvider
  console.log(`From ${sourceNetwork.network} to ${destinationNetwork.network}:`)
  hyperproveInstant()
}

export async function hyperproveInstant() {
  const rewardToken = await ethers.getContractAt(
    'ERC20',
    sourceNetwork.usdcAddress,
  )
  const intentSource = await ethers.getContractAt(
    'IntentSource',
    sourceNetwork.intentSourceAddress,
  )
  const inbox = await ethers.getContractAt(
    'Inbox',
    destinationNetwork.inboxAddress,
  )
  const hyperprover = await ethers.getContractAt(
    'HyperProver',
    destinationNetwork.hyperProverContractAddress,
  )

  const approvalTx = await rewardToken
    .connect(actors.intentCreator)
    .approve(await intentSource.getAddress(), intent.rewardAmounts[0])
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
    const intentTx = await intentSource
      .connect(actors.intentCreator)
      .createIntent(
        sourceNetwork.chainId, // desination chainId
        destinationNetwork.inboxAddress, // destination inbox address
        [destinationNetwork.usdcAddress], // target Tokens
        data, // calldata for destination chain
        [sourceNetwork.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        sourceNetwork.hyperproverContractAddress, // prover contract address on the sourceChain
      )
    await intentTx.wait()

    // Get the event from the latest Block checking transaction hash
    const intentHashEvents = await intentSource.queryFilter(
      intentSource.getEvent('IntentCreated'),
      latestBlockNumberHex,
    )
    for (const intentHashEvent of intentHashEvents) {
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
    const targetToken = s.optimismSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimismSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const messageBody = AbiCoder.defaultAbiCoder().encode(
      ['bytes[]', 'address[]'],
      //   [thisIntent.data.toArray(), thisIntent.targets.toArray()],
      [thisIntent.data, actors.recipient.toArray()],
    )

    console.log('fetching fee')
    const fee = await inbox
      .connect(actors.solver)
      .fetchFee(
        sourceNetwork.chainId,
        messageBody,
        zeroPadValue(networks.baseSepolia.hyperproverContractAddress, 32),
      )

    const fulfillTx = await inbox.connect(actors.solver).fulfillHyperInstant(
      sourceNetwork.chainId, // source chainId
      thisIntent.targets, // target  token addresses
      thisIntent.data, // calldata
      thisIntent.expiryTime, // expiry time
      thisIntent.nonce, // nonce
      actors.recipient, // recipient
      intentHash, // expected intent hash
      networks.baseSepolia.hyperproverContractAddress, // hyperprover contract address
      { value: fee },
    )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }

  console.log('Waiting for 30 seconds for the dust to settle')
  await setTimeout(15000)

  console.log('show me da money')
  const intentProvenEvents = await hyperprover.queryFilter(
    hyperprover.getEvent('IntentProven'),
    latestBlockNumberHex,
  )
  for (const event of intentProvenEvents) {
    if ((intentHash = event.topics[1])) {
      console.log('it hath been proven')
      break
    }
  }

  const initialBalance = await rewardToken.balanceOf(actors.recipient)
  const tx = await intentSource.withdrawRewards(intentHash)
  await tx.wait()
  if (await rewardToken.balanceOf(actors.recipient) > initialBalance) {
    console.log('great success')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
