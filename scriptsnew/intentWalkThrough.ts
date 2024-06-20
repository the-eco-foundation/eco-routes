import { setTimeout } from 'timers/promises'
import {
  ERC20,
  ERC20__factory,
  IntentSource,
  IntentSource__factory,
} from '../typechain-types'
import { encodeTransfer } from '../utils/encode'
import {
  AbiCoder,
  AddressLike,
  BigNumberish,
  toBigInt,
  Block,
  BytesLike,
  concat,
  Contract,
  hexlify,
  getBytes,
  hexValue,
  solidityPackedKeccak256,
  stripZerosLeft,
  toQuantity,
  zeroPadValue,
  toBeHex,
} from 'ethers'
import { hexToBigInt, numberToHex, toBytes } from 'viem'
import config from '../config/config'
import { s } from './setup'
// import { proveCurrent } from './proveL1WorldState'

// called from op sepolia
export async function createIntent() {
  console.log('In createIntent')
  // approve lockup
  const rewardToken = s.layer2SourceUSDCContract
  const approvalTx = await rewardToken.approve(
    config.layer2Source.intentSourceAddress,
    s.intentRewardAmounts[0],
  )
  await approvalTx.wait()

  // get the block before creating the intent
  const latestBlock = await s.layer2SourceProvider.getBlock('latest')
  const latestBlockNumberHex = hexlify(toQuantity(latestBlock.number))

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

    console.log('successful intent creation: ', intentTx.hash)
    let intentHash
    // Get the event from the latest Block assume our intent is the l
    const intentHashEvents =
      await s.layer2SourceIntentSourceContract.queryFilter(
        s.layer2SourceIntentSourceContract.getEvent('IntentCreated'),
        latestBlockNumberHex,
      )
    for (const intenthHashEvent of intentHashEvents) {
      console.log('intenthHashEvent: ', JSON.stringify(intenthHashEvent, 0, 2))
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
      await s.layer2SourceIntentSourceContract.intents(intentHash)
    const targetTokens =
      await s.layer2SourceIntentSourceContract.getTargets(intentHash)
    const calldata =
      await s.layer2SourceIntentSourceContract.getData(intentHash)

    // transfer the intent tokens to the Inbox Contract
    const targetToken = s.layer2DestinationUSDCContract
    const fundTx = await targetToken.transfer(
      config.layer2Destination.inboxAddress,
      s.intentTargetAmounts[0],
    )
    await fundTx.wait()

    // fulfill the intent

    const fulfillTx = await s.layer2DestinationInboxContract.fulfill(
      thisIntent.nonce,
      targetTokens.toArray(),
      calldata.toArray(),
      thisIntent.expiryTime,
      config.actors.claimant,
    )
    await fulfillTx.wait()
    return fulfillTx.hash
  } catch (e) {
    console.log(e)
  }
}

async function proveL1WorldState() {
  console.log('In proveL1WorldState')
  const layer1Block = await s.layer2Layer1BlockAddressContract.number()
  console.log('layer1Block: ', layer1Block.toString())
  const layer1BlockTag = hexlify(toQuantity(layer1Block))
  console.log('layer1BlockTag: ', layer1BlockTag)

  const block: Block = await s.layer1Provider.send('eth_getBlockByNumber', [
    layer1BlockTag,
    false,
  ])
  // console.log('Block:', block)
  let blockData = assembleBlockData(block)
  blockData = await cleanBlockData(blockData)

  // console.log(keccak256(await prover.rlpEncodeDataLibList(blockData)))
  //   console.log(block.hash)
  //
  let tx
  let layer1WorldStateRoot
  try {
    tx = await s.layer2SourceProverContract.proveL1WorldState(
      await s.layer2SourceProverContract.rlpEncodeDataLibList(blockData),
    )
    await tx.wait()
    layer1WorldStateRoot = blockData[3]
    console.log('proven L1 world state root:', layer1WorldStateRoot)
    return { layer1Block, layer1BlockTag, layer1WorldStateRoot }
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
    // console.log('index:', index)
    // console.log('blockData[index]', blockData[index])
    // blockData[index] =
    //   blockData[index] === '0x0'
    //     ? '0x'
    //     : // eslint-disable-next-line no-self-compare
    //       blockData[index].length & (1 === 1)
    //       ? zeroPadValue(
    //           hexlify(toQuantity(blockData[index])),
    //           (blockData[index].length + 1 - 2) / 2,
    //         )
    //       : blockData[index]
    blockData[index] =
      blockData[index] === '0x0'
        ? '0x'
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
  const intentFulfillmentBlockHex = hexlify(toBytes(intentFulfillmentBlock))
  // console.log('intentFulfillmentBlockHex: ', intentFulfillmentBlockHex)
  const l1BatchIndex =
    await s.layer1Layer2DestinationOutputOracleContract.getL2OutputIndexAfter(
      intentFulfillmentBlock,
    )
  // console.log('l1BatchIndex: ', l1BatchIndex)
  // Get the the L2 End Batch Block for the intent
  const l1BatchData =
    await s.layer1Layer2DestinationOutputOracleContract.getL2OutputAfter(
      intentFulfillmentBlock,
    )
  // console.log('l1BatchData : ', l1BatchData)
  const l2EndBatchBlockHex = hexlify(toBytes(l1BatchData.l2BlockNumber))
  const l2EndBatchBlockData = await s.layer2DestinationProvider.send(
    'eth_getBlockByNumber',
    [l2EndBatchBlockHex, false],
  )
  // console.log('l2EndBatchBlockData: ', l2EndBatchBlockData)
  // Get the Message Parser State Root at the block the intent was fulfilled
  const l2MesagePasserProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [
      config.layer2Destination.l2l1MessageParserAddress,
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

  // console.log('l1BatchSlot     : ', l1BatchSlot)

  // Desired  '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74dfa3'
  // Original '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74c311'
  // Get the L1 Batch Block we are proving against
  // Get all the proving data
  // console.log('In layer1BlockTag:', layer1BlockTag)
  const layer1BaseOutputOracleProof = await s.layer1Provider.send(
    'eth_getProof',
    [config.layer1.l2BaseOutputOracleAddress, [l1BatchSlot], layer1BlockTag],
  )
  // console.log('out')
  // console.log('layer1BaseOutputOracleProof: ', layer1BaseOutputOracleProof)
  const layer1BaseOutputOracleContractData = [
    '0x01', // nonce
    '0x', // balance
    layer1BaseOutputOracleProof.storageHash, // storageHash
    layer1BaseOutputOracleProof.codeHash, // CodeHash
  ]

  try {
    console.log('prove Output p1:  ', l2EndBatchBlockData.stateRoot)
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
    const proveL2WorldStateTxHash = proveOutputTX.hash
    return {
      proveL2WorldStateTxHash,
      l1BatchIndex,
      layer1BaseOutputOracleProof,
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

async function proveIntent(
  intentHash,
  layer1WorldStateRoot,
  l1BatchIndex,
  l2EndBatchBlockData,
) {
  console.log('In proveIntent')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 0])],
  )
  console.log('inboxStorageSlot: ', inboxStorageSlot)

  console.log('l2EndBatchBlockData.number : ', l2EndBatchBlockData.number)
  const intentInboxProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [
      config.layer2Destination.inboxAddress,
      [inboxStorageSlot],
      l2EndBatchBlockData.number,
    ],
  )

  console.log('intentInboxProof.balance: ', intentInboxProof.balance)
  const balance =
    intentInboxProof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.balance.length & (1 === 1)
        ? zeroPadValue(toBytes(intentInboxProof.balance), 1)
        : intentInboxProof.balance
  console.log('balance: ', balance)
  console.log('intentInboxProof.nonce: ', intentInboxProof.nonce)
  const nonce =
    intentInboxProof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        intentInboxProof.nonce.length & (1 === 1)
        ? zeroPadValue(toBytes(intentInboxProof.nonce), 1)
        : intentInboxProof.nonce
  console.log('nonce: ', nonce)
  console.log('p1: ', config.actors.claimant)
  console.log('p2: ', config.layer2Destination.inboxAddress)
  console.log('p3: ', intentHash)
  console.log('p4: ', Number(l1BatchIndex) - 1)
  console.log('p5: ', intentInboxProof.storageProof[0].proof)
  console.log(
    'p6: ',
    await s.layer2SourceProverContract.rlpEncodeDataLibList([
      nonce,
      balance,
      intentInboxProof.storageHash,
      intentInboxProof.codeHash,
    ]),
  )
  console.log('p7: ', intentInboxProof.accountProof)
  console.log('p8: ', l2EndBatchBlockData.stateRoot)
  try {
    const proveIntentTx = await s.layer2SourceProverContract.proveIntent(
      config.actors.claimant,
      config.layer2Destination.inboxAddress,
      intentHash,
      Number(l1BatchIndex) - 1, // see comment in contract
      intentInboxProof.storageProof[0].proof,
      // ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
      // await prover.rlpEncodeDataLibList(l2InboxContractData),
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
      await s.layer2SourceIntentSourceContract.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('withdraw complete: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.layer2SourceProverContract) {
      const decodedError =
        s.layer2SourceIntentSourceContract.interface.parseError(e.data)
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
  let intentHash,
    intentFulfillTransaction,
    layer1Block,
    layer1BlockTag,
    layer1WorldStateRoot,
    layer2WorldStateRoot,
    proveOutputTX,
    intentProofTxHash,
    withdrawRewardTx
  try {
    console.log('In Main')
    // intentHash = await createIntent()
    intentHash =
      '0xf749096dffa1c27665cae488e012e245f8ccea481c3ee6be0de79dfde87d4db5'
    console.log('Created Intent Hash: ', intentHash)
    // intentFulfillTransaction = await fulfillIntent(intentHash)
    intentFulfillTransaction =
      '0xb8409eaf9602290bf174176ad65bb4e00202538e9d32ab10a48879fdf63ccd60'
    console.log('intentFulfillTransaction', intentFulfillTransaction)
    // wait for 600 seconds for L1 batch to be Settled (it takes around 7 mins to show as settled on basescan)
    // await setTimeout(600000)
    // console.log('Waited 600 seconds')
    // const { layer1Block, layer1BlockTag, layer1WorldStateRoot } =
    //   await proveL1WorldState()
    layer1Block = 6143128
    layer1BlockTag = '0x5dbc98'
    layer1WorldStateRoot =
      '0x02f6b2ce141a90dd3419db142508c41b205886b8f73ed42d1ab49ae2810f2f72'
    console.log('layer1Block         : ', layer1Block)
    console.log('layer1BlockTag      : ', layer1BlockTag)
    console.log('layer1WorldStateRoot: ', layer1WorldStateRoot)
    const {
      proveL2WorldStateTxHash,
      l1BatchIndex,
      layer1BaseOutputOracleProof,
      l2EndBatchBlockData,
    } = await proveL2WorldState(
      layer1BlockTag,
      intentFulfillTransaction,
      layer1WorldStateRoot,
    )
    // proveL2WorldStateTxHash = '0xc0c48d5db5cb1d27514c45a2fa20849e31fddbabdbc1402cf0a388418368fdcc'
    // l1BatchIndex = 96026
    // layer1BaseOutputOracleProofStorageProof =
    // l2EndBatchBlockData =
    // console.log('proveL2WorldStateTxHash     : ', proveL2WorldStateTxHash)
    // console.log('l1BatchIndex                : ', l1BatchIndex)
    // console.log('layer1BaseOutputOracleProof : ', layer1BaseOutputOracleProof)
    // console.log('l2EndBatchBlockData         : ', l2EndBatchBlockData)
    intentProofTxHash = await proveIntent(
      intentHash,
      layer1WorldStateRoot,
      l1BatchIndex,
      l2EndBatchBlockData,
    )
    console.log('intentProofTxHash: ', intentProofTxHash)
    withdrawRewardTx = await withdrawReward(intentHash)
    console.log('withdrawRewardTx: ', withdrawRewardTx)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
