import { setTimeout } from 'timers/promises'
import { encodeTransfer } from '../utils/encode'
import {
  BigNumberish,
  Block,
  BytesLike,
  // hexlify,
  solidityPackedKeccak256,
  toQuantity,
  zeroPadValue,
  toBeHex,
} from 'ethers'
import { toBytes, toHex } from 'viem'
import config from '../config/config'
import { s } from './setup'

export async function createIntent() {
  console.log('In createIntent')
  // approve lockup
  const rewardToken = s.layer2SourceUSDCContract
  const approvalTx = await rewardToken.approve(
    config.optimismSepolia.intentSourceAddress,
    s.intentRewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.layer2SourceProvider.getBlock('latest')
  const latestBlockNumberHex = toHex(latestBlock.number)

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

    console.log('Intent creation tx: ', intentTx.hash)
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
    const thisIntent =
      await s.layer2SourceIntentSourceContract.getIntent(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.layer2DestinationUSDCContract
    const fundTx = await targetToken.transfer(
      config.baseSepolia.inboxAddress,
      s.intentTargetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.layer2DestinationInboxContract.fulfill(
      thisIntent.nonce,
      thisIntent.targets.toArray(),
      thisIntent.data.toArray(),
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

async function proveL1WorldState() {
  console.log('In proveL1WorldState')
  const layer1Block = await s.layer2Layer1BlockAddressContract.number()
  const layer1BlockTag = toHex(layer1Block)

  const block: Block = await s.layer1Provider.send('eth_getBlockByNumber', [
    layer1BlockTag,
    false,
  ])
  let blockData = assembleBlockData(block)
  blockData = await cleanBlockData(blockData)

  let tx
  let layer1WorldStateRoot
  try {
    tx = await s.layer2SourceProverContract.proveL1WorldState(
      await s.layer2SourceProverContract.rlpEncodeDataLibList(blockData),
    )
    await tx.wait()
    console.log('Prove L1 world state tx: ', tx.hash)
    layer1WorldStateRoot = blockData[3]
    console.log('Proven L1 world state root:', layer1WorldStateRoot)
    return { layer1BlockTag, layer1WorldStateRoot }
  } catch (e) {
    if (e.data && s.layer2SourceProverContract) {
      const decodedError = s.layer2SourceProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
    } else {
      console.log(`Error in proveL1WorldState:`, e)
    }
  }
  //   have successfully proven L1 state
}

function assembleBlockData(block: Block) {
  console.log('In assembleBlockData')
  const blockData = []
  blockData.push(block.parentHash)
  blockData.push(block.sha3Uncles)
  blockData.push(block.miner)
  blockData.push(block.stateRoot)
  blockData.push(block.transactionsRoot)
  blockData.push(block.receiptsRoot)
  blockData.push(block.logsBloom)
  blockData.push(block.difficulty) // check
  blockData.push(block.number) // check
  blockData.push(block.gasLimit) // check
  blockData.push(block.gasUsed) // check
  blockData.push(block.timestamp) // check
  blockData.push(block.extraData)
  blockData.push(block.mixHash)
  blockData.push(block.nonce) // check
  blockData.push(block.baseFeePerGas) // check
  blockData.push(block.withdrawalsRoot)
  blockData.push(block.blobGasUsed) // check
  blockData.push(block.excessBlobGas) // check
  blockData.push(block.parentBeaconBlockRoot)

  return blockData
}

function cleanBlockData(blockData) {
  console.log('In cleanBlockData')
  // need to do some zero padding and replacements.
  // these are all the fields that can be odd-length (i think)
  // we zero pad them by 1 if they are odd length
  // and set to 0x if the value is 0x0
  // voila, its a valid Byteslike!
  const indicesToCheck = [7, 8, 9, 10, 11, 14, 15, 17, 18]
  for (let i = 0; i < indicesToCheck.length; i++) {
    const index = indicesToCheck[i]
    blockData[index] =
      blockData[index] === '0x0'
        ? '0x00'
        : // eslint-disable-next-line no-self-compare
          blockData[index].length & (1 === 1)
          ? zeroPadValue(
              toBytes(blockData[index]),
              (blockData[index].length + 1 - 2) / 2,
            )
          : blockData[index]
  }
  return blockData
}

async function proveL2WorldState(
  layer1BlockTag,
  intentFulfillmentTransaction,
  layer1WorldStateRoot,
) {
  console.log('In proveL2WorldState')
  // Get the L1 Batch Number for the transaction we are proving
  const txDetails = await s.layer2DestinationProvider.getTransaction(
    intentFulfillmentTransaction,
  )
  const intentFulfillmentBlock = txDetails!.blockNumber
  const intentFulfillmentBlockHex = toHex(intentFulfillmentBlock)
  const l1BatchIndex =
    await s.layer1Layer2DestinationOutputOracleContract.getL2OutputIndexAfter(
      intentFulfillmentBlock,
    )
  console.log('Layer 1 Batch Number: ', l1BatchIndex.toString())
  // Get the the L2 End Batch Block for the intent
  const l1BatchData =
    await s.layer1Layer2DestinationOutputOracleContract.getL2OutputAfter(
      intentFulfillmentBlock,
    )
  const l2EndBatchBlockHex = toHex(l1BatchData.l2BlockNumber)
  const l2EndBatchBlockData = await s.layer2DestinationProvider.send(
    'eth_getBlockByNumber',
    [l2EndBatchBlockHex, false],
  )
  // Get the Message Parser State Root at the block the intent was fulfilled
  const l2MesagePasserProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [
      config.baseSepolia.l2l1MessageParserAddress,
      [],
      intentFulfillmentBlockHex,
    ],
  )

  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBytes(config.l2OutputOracleSlotNumber),
    32,
  )
  const firstElementSlot = solidityPackedKeccak256(
    ['bytes32'],
    [arrayLengthSlot],
  )
  const l1BatchSlot = toBeHex(
    BigInt(firstElementSlot) + BigInt(Number(l1BatchIndex) * 2),
    32,
  )

  const layer1BaseOutputOracleProof = await s.layer1Provider.send(
    'eth_getProof',
    [config.sepolia.l2BaseOutputOracleAddress, [l1BatchSlot], layer1BlockTag],
  )
  const layer1BaseOutputOracleContractData = [
    '0x01', // nonce
    '0x', // balance
    layer1BaseOutputOracleProof.storageHash, // storageHash
    layer1BaseOutputOracleProof.codeHash, // CodeHash
  ]

  try {
    console.log(
      'config.sepolia.l2BaseOutputOracleAddress: ',
      config.sepolia.l2BaseOutputOracleAddress,
    )
    console.log('l1BatchSlot: ', l1BatchSlot)
    console.log('layer1BlockTag: ', layer1BlockTag)
    console.log(
      'layer1BaseOutputOracleProof.storageHash: ',
      layer1BaseOutputOracleProof.storageHash,
    )
    console.log(
      'layer1BaseOutputOracleProof.codeHash: ',
      layer1BaseOutputOracleProof.codeHash,
    )
    console.log('p1: ', l2EndBatchBlockData.stateRoot)
    console.log('p2: ', l2MesagePasserProof.storageHash)
    console.log('p3: ', l2EndBatchBlockData.hash)
    console.log('p4: ', l1BatchIndex)
    console.log('p5: ', layer1BaseOutputOracleProof.storageProof[0].proof)
    console.log(
      'p6: ',
      await s.layer2SourceProverContract.rlpEncodeDataLibList(
        layer1BaseOutputOracleContractData,
      ),
    )
    console.log('p7: ', layer1BaseOutputOracleProof.accountProof)
    console.log('p8: ', layer1WorldStateRoot)

    const proveOutputTX = await s.layer2SourceProverContract.proveOutputRoot(
      l2EndBatchBlockData.stateRoot,
      l2MesagePasserProof.storageHash,
      l2EndBatchBlockData.hash,
      l1BatchIndex,
      layer1BaseOutputOracleProof.storageProof[0].proof,
      await s.layer2SourceProverContract.rlpEncodeDataLibList(
        layer1BaseOutputOracleContractData,
      ),
      layer1BaseOutputOracleProof.accountProof,
      layer1WorldStateRoot,
    )
    await proveOutputTX.wait()
    console.log('Prove L2 world state tx: ', proveOutputTX.hash)
    return {
      l1BatchIndex,
      l2EndBatchBlockData,
    }
  } catch (e) {
    if (e.data && s.layer2SourceProverContract) {
      const decodedError = s.layer2SourceProverContract.interface.parseError(
        e.data,
      )
      console.log(
        `Transaction failed in proveL2WorldState : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in proveL2WorldState:`, e)
    }
  }
}

async function proveIntent(intentHash, l1BatchIndex, l2EndBatchBlockData) {
  console.log('In proveIntent')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 0])],
  )
  const intentInboxProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [
      config.baseSepolia.inboxAddress,
      [inboxStorageSlot],
      l2EndBatchBlockData.number,
    ],
  )

  const balance =
    intentInboxProof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        intentInboxProof.balance.length & (1 === 1)
        ? zeroPadValue(toBytes(intentInboxProof.balance), 1)
        : intentInboxProof.balance
  const nonce =
    intentInboxProof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        intentInboxProof.nonce.length & (1 === 1)
        ? zeroPadValue(toBytes(intentInboxProof.nonce), 1)
        : intentInboxProof.nonce
  try {
    const proveIntentTx = await s.layer2SourceProverContract.proveIntent(
      config.actors.claimant,
      config.baseSepolia.inboxAddress,
      intentHash,
      Number(l1BatchIndex) - 1, // see comment in contract
      intentInboxProof.storageProof[0].proof,
      await s.layer2SourceProverContract.rlpEncodeDataLibList([
        nonce,
        balance,
        intentInboxProof.storageHash,
        intentInboxProof.codeHash,
      ]),
      intentInboxProof.accountProof,
      l2EndBatchBlockData.stateRoot,
    )
    await proveIntentTx.wait()
    console.log('Prove Intent tx: ', proveIntentTx.hash)
    return proveIntentTx.hash
  } catch (e) {
    if (e.data && s.layer2SourceProverContract) {
      const decodedError = s.layer2SourceProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed in proveIntent : ${decodedError?.name}`)
      console.log('proveIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in proveIntent:`, e)
    }
  }
}

async function withdrawReward(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.layer2SourceIntentSourceContractClaimant.withdrawRewards(
        intentHash,
      )
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.layer2SourceIntentSourceContractClaimant) {
      const decodedError =
        s.layer2SourceIntentSourceContractClaimant.interface.parseError(e.data)
      console.log(
        `Transaction failed in withdrawReward : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in withdrawReward:`, e)
    }
  }
}

async function main() {
  // define the variables used for each state of the intent lifecycle
  let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    intentHash = await createIntent()
    intentFulfillTransaction = await fulfillIntent(intentHash)
    // wait for 600 seconds for L1 batch to be Settled (it takes around 7 mins to show as settled on basescan)
    console.log('Waiting for 600 seconds for Batch to settle')
    await setTimeout(600000)
    console.log('Waited 600 seconds')
    // intentHash =
    //   '0xae99ecf44405fd4fb96d54bb8aee785bf9e873dd2715224cfd963c07b5fd9c6a'
    // intentFulfillTransaction =
    //   '0x4b66a8e3d474a2a6ff15befc7e1217850c0ffa3a911d7eb820da4b0f2d28d5f5'
    const { layer1BlockTag, layer1WorldStateRoot } = await proveL1WorldState()
    const { l1BatchIndex, l2EndBatchBlockData } = await proveL2WorldState(
      layer1BlockTag,
      intentFulfillTransaction,
      layer1WorldStateRoot,
    )
    await proveIntent(intentHash, l1BatchIndex, l2EndBatchBlockData)
    await withdrawReward(intentHash)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
