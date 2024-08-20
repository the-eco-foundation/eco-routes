import { encodeTransfer } from '../../utils/encode'
import { BigNumberish, BytesLike, NonceManager, toQuantity } from 'ethers'
import {
  networkIds,
  networks,
  actors,
  intent,
} from '../../config/mainnet/config'
import { s } from '../../config/mainnet/setup'

export async function optimismBaseIntentSolve() {
  console.log('In createIntent optimismBase')
  const optimismIntentCreatorNonceManager = new NonceManager(
    s.optimismIntentCreator,
  )
  // approve lockup
  const rewardToken = s.optimismUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.optimism.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()
  optimismIntentCreatorNonceManager.increment()

  // get the block before creating the intent
  const latestBlock = await s.optimismProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx =
      await s.optimismIntentSourceContractIntentCreator.createIntent(
        networkIds.base, // desination chainId
        networks.base.inboxAddress, // destination inbox address
        [networks.base.usdcAddress], // target Tokens
        data, // call datat for destination chain
        [networks.optimism.usdcAddress], // reward Tokens on source chain
        intent.rewardAmounts, // reward amounts on source chain
        expiryTime, // intent expiry time
        networks.optimism.proverContractAddress, // prover contract address
      )
    await intentTx.wait()

    console.log('Intent Creation tx: ', intentTx.hash)
    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.optimismIntentSourceContractIntentCreator.queryFilter(
        s.optimismIntentSourceContractIntentCreator.getEvent('IntentCreated'),
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
  const baseSolverNonceManager = new NonceManager(s.baseSolver)
  try {
    // get intent Information
    const thisIntent =
      await s.optimismIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.baseUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.base.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()
    baseSolverNonceManager.increment()

    // fulfill the intent

    const fulfillTx = await s.baseInboxContractSolver.fulfill(
      networkIds.optimism, // source chainId
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
export async function baseOptimismIntentSolve() {
  console.log('In createIntent baseOptimism')
  const baseIntentCreatorNonceManager = new NonceManager(s.baseIntentCreator)
  // approve lockup
  const rewardToken = s.baseUSDCContractIntentCreator
  const approvalTx = await rewardToken.approve(
    networks.base.intentSourceAddress,
    intent.rewardAmounts[0],
  )
  await approvalTx.wait()
  baseIntentCreatorNonceManager.increment()

  // get the block before creating the intent
  const latestBlock = await s.baseProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(actors.recipient, intent.targetAmounts[0]),
  ]
  const expiryTime: BigNumberish = latestBlock?.timestamp + intent.duration
  let intentHash
  try {
    const intentTx = await s.baseIntentSourceContractIntentCreator.createIntent(
      networkIds.optimism, // desination chainId
      networks.optimism.inboxAddress, // destination inbox address
      [networks.optimism.usdcAddress], // target Tokens
      data, // call datat for destination chain
      [networks.base.usdcAddress], // reward Tokens on source chain
      intent.rewardAmounts, // reward amounts on source chain
      expiryTime, // intent expiry time
      networks.base.proverContractAddress, // prover contract address
    )
    await intentTx.wait()

    console.log('Intent Creation tx: ', intentTx.hash)
    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.baseIntentSourceContractIntentCreator.queryFilter(
        s.baseIntentSourceContractIntentCreator.getEvent('IntentCreated'),
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
  const optimismSolverNonceManager = new NonceManager(s.optimismSolver)
  try {
    // get intent Information
    const thisIntent =
      await s.baseIntentSourceContractIntentCreator.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.optimismUSDCContractSolver
    const fundTx = await targetToken.transfer(
      networks.optimism.inboxAddress,
      intent.targetAmounts[0],
    )
    await fundTx.wait()
    optimismSolverNonceManager.increment()
    // fulfill the intent

    const fulfillTx = await s.optimismInboxContractSolver.fulfill(
      networkIds.base, // source chainId
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
    await optimismBaseIntentSolve()
    await baseOptimismIntentSolve()
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
