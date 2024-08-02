import { encodeTransfer } from '../../utils/encode'
import { BigNumberish, BytesLike, toQuantity } from 'ethers'
import {
  provingMechanisms,
  networkIds,
  networks,
  actors,
  bedrock,
  cannon,
  intent,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'

export async function baseSepoliaEcoTestNetIntentSolve() {
  console.log('In createIntent BaseSepoliaEcoTestNet')
  // approve lockup
  const rewardToken = s.baseSepoliaUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.baseSepolia.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.baseSepoliaProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.baseSepoliaIntentSourceContractIntentCreator.createIntent(
        networkIds.ecoTestNet, // desination chainId
        networks.ecoTestNet.inboxAddress, // destination inbox address
        [networks.ecoTestNet.usdcAddress], // target Tokens
        data, // call datat for destination chain
        [networks.baseSepolia.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
      )
    await intentTx.wait()

    console.log('Intent Creation tx: ', intentTx.hash)
    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.baseSepoliaIntentSourceContractIntentCreator.queryFilter(
        s.baseSepoliaIntentSourceContractIntentCreator.getEvent(
          'IntentCreated',
        ),
        latestBlockNumberHex,
      )
    for (const intentHashEvent of intentHashEvents) {
      if (intentHashEvent.transactionHash === intentTx.hash) {
        intentHash = intentHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash: ', intentHash)
  } catch (e) {
    console.log(e)
  }
  console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.baseSepoliaIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.ecoTestNetUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.ecoTestNet.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.ecoTestNetInboxContractSolver.fulfill(
      networkIds.baseSepolia, // source chainId
      thisIntent.targets.toArray(), // target  token addresses
      thisIntent.data.toArray(), // call Data
      thisIntent.expiryTime, // expiry time
      thisIntent.nonce, // nonce
      actors.claimant, // claimant
      intentHash, // expected intent hash
    )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }
}

export async function EcoTestNetBaseSepoliaIntentSolve() {
  console.log('In createIntent EcoTestNetBaseSepolia')
  // approve lockup
  const rewardToken = s.ecoTestNetUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.ecoTestNet.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.ecoTestNetProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.ecoTestNetIntentSourceContractIntentCreator.createIntent(
        networkIds.baseSepolia, // desination chainId
        networks.baseSepolia.inboxAddress, // destination inbox address
        [networks.baseSepolia.usdcAddress], // target Tokens
        data, // call datat for destination chain
        [networks.ecoTestNet.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
      )
    await intentTx.wait()

    console.log('Intent Creation tx: ', intentTx.hash)
    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.ecoTestNetIntentSourceContractIntentCreator.queryFilter(
        s.ecoTestNetIntentSourceContractIntentCreator.getEvent('IntentCreated'),
        latestBlockNumberHex,
      )
    for (const intentHashEvent of intentHashEvents) {
      if (intentHashEvent.transactionHash === intentTx.hash) {
        intentHash = intentHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash: ', intentHash)
  } catch (e) {
    console.log(e)
  }
  console.log('In fulfillIntent')
  try {
    // get intent Information
    const thisIntent =
      await s.ecoTestNetIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.baseSepoliaUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.baseSepolia.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.baseSepoliaInboxContractSolver.fulfill(
      networkIds.ecoTestNet, // source chainId
      thisIntent.targets.toArray(), // target  token addresses
      thisIntent.data.toArray(), // call Data
      thisIntent.expiryTime, // expiry time
      thisIntent.nonce, // nonce
      actors.claimant, // claimant
      intentHash, // expected intent hash
    )
    await fulfillTx.wait()
    console.log('Fulfillment tx: ', fulfillTx.hash)
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }
}

async function main() {
  // define the variables used for each state of the intent lifecycle
  try {
    console.log('In Main')
    // baseSepoliaEcoTestNetIntentSolve()
    EcoTestNetBaseSepoliaIntentSolve()
    // baseSepoliaOptimismSepoliaIntentSolve()
    // OptimismSepoliaBaseSepoliaIntentSolve()
    // optimismSepoliaEcoTestNetIntentSolve()
    // EcoTestNetOptimismSepoliaIntentSolve()
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
