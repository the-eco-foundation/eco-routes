import { encodeTransfer } from '../utils/encode'
import { BigNumberish, BytesLike, toQuantity } from 'ethers'
import config from '../config/config'
import { s } from './setupMainnet'

export async function createIntent() {
  console.log('In createIntent')
  // approve lockup
  const rewardToken = s.layer2SourceUSDCContract
  const approvalTx = await rewardToken.approve(
    config.optimism.intentSourceAddress,
    s.intentRewardAmounts[0],
  )
  await approvalTx.wait()
  console.log('Approval tx: ', approvalTx.hash)

  // get the block before creating the intent
  const latestBlock = await s.layer2SourceProvider.getBlock('latest')
  const latestBlockNumberHex = toQuantity(latestBlock.number)
  // create intent
  const data: BytesLike[] = [
    await encodeTransfer(s.intentRecipient, s.intentTargetAmounts[0]),
  ]
  const expiryTime: BigNumberish =
    (await s.layer2SourceProvider.getBlock('latest'))!.timestamp +
    s.intentDuration
  try {
    const intentTx = await s.layer2SourceIntentSourceContract.createIntent(
      s.intentDestinationChainId,
      s.intentTargetTokens,
      data,
      s.intentRewardTokens,
      s.intentRewardAmounts,
      expiryTime,
    )
    await intentTx.wait()

    console.log('Intent Creation tx: ', intentTx.hash)
    let intentHash
    // Get the event from the latest Block checking transaction hash
    const intentHashEvents =
      await s.layer2SourceIntentSourceContract.queryFilter(
        s.layer2SourceIntentSourceContract.getEvent('IntentCreated'),
        latestBlockNumberHex,
      )
    for (const intenthHashEvent of intentHashEvents) {
      if (intenthHashEvent.transactionHash === intentTx.hash) {
        intentHash = intenthHashEvent.topics[1]
        break
      }
    }
    console.log('Created Intent Hash: ', intentHash)
    return intentHash
  } catch (e) {
    console.log(e)
  }
}

export async function fulfillIntent(intentHash) {
  console.log('In fulfillIntent')
  try {
    // get intent Information
    // const thisIntent =
    //   await s.layer2SourceIntentSourceContract.getIntent(intentHash)

    const thisIntent =
      await s.layer2SourceIntentSourceContract.intents(intentHash)
    const targetTokens =
      await s.layer2SourceIntentSourceContract.getTargets(intentHash)
    const calldata =
      await s.layer2SourceIntentSourceContract.getData(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.layer2DestinationUSDCContract
    const fundTx = await targetToken.transfer(
      config.base.inboxAddress,
      s.intentTargetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.layer2DestinationInboxContract.fulfill(
      // thisIntent.nonce,
      // thisIntent.targets.toArray(),
      // thisIntent.data.toArray(),
      // thisIntent.expiryTime,
      // config.actors.claimant,
      thisIntent.nonce,
      targetTokens.toArray(),
      calldata.toArray(),
      thisIntent.expiryTime,
      config.actors.claimant,
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
  let intentHash
  try {
    console.log('In Main')
    intentHash = await createIntent()
    await fulfillIntent(intentHash)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
