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
  const currentBlock = await s.layer2Layer1BlockAddressContract.number()
  console.log('currentBlock: ', currentBlock.toString())
  const currentBlockTag = hexlify(toQuantity(currentBlock))
  console.log('currentBlockTag: ', currentBlockTag)

  const block: Block = await s.layer1Provider.send('eth_getBlockByNumber', [
    currentBlockTag,
    false,
  ])
  // console.log('Block:', block)
  let blockData = assembleBlockData(block)
  blockData = await cleanBlockData(blockData)

  // console.log(keccak256(await prover.rlpEncodeDataLibList(blockData)))
  //   console.log(block.hash)
  //
  let tx
  try {
    tx = await s.layer2SourceProverContract.proveL1WorldState(
      await s.layer2SourceProverContract.rlpEncodeDataLibList(blockData),
    )
    await tx.wait()
    const layer1WorldStateRoot = blockData[3]
    console.log(`proven L1 world state root: layer1WorldStateRoot}`)
    return layer1WorldStateRoot
  } catch (e) {
    console.log(e)
  }
  //   have successfully proven L1 state
}

function assembleBlockData(block: Block) {
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

async function proveL2WorldState(intentFulfillmentTransaction) {
  // Get the L1 Batch Number for the transaction we are proving
  const txDetails = await s.layer2DestinationProvider.getTransaction(
    intentFulfillmentTransaction,
  )
  const intentFulfillmentBlock = txDetails!.blockNumber
  const intentFulfillmentBlockHex = hexlify(toBytes(intentFulfillmentBlock))
  const l1BatchIndex =
    await s.layer1Layer2DestinationOutputOracleContract.getL2OutputIndexAfter(
      intentFulfillmentBlock,
    )
  console.log('l1BatchIndex: ', l1BatchIndex)
  // Get the the L2 End Batch Block for the intent
  const l1BatchData =
    await s.layer1Layer2DestinationOutputOracleContract.getL2OutputAfter(
      intentFulfillmentBlock,
    )
  console.log('l1BatchData : ', l1BatchData)
  const l2EndBatchBlockHex = hexlify(toBytes(l1BatchData.l2BlockNumber))
  const l2EndBatchBlockData = await s.layer2DestinationProvider.send(
    'eth_getBlockByNumber',
    [l2EndBatchBlockHex, false],
  )
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
  // storageHashOutputOracle = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const storageHashOutputOracle = solidityPackedKeccak256(
    ['bytes'],
    [
      s.abiCoder.encode(
        ['uint256'],
        // [config.l2OutputOracleSlotNumber + l1BatchIndex * 2],
        [config.l2OutputOracleSlotNumber + Number(l1BatchIndex) * 2],
        // [
        //   solidityPackedKeccak256(
        //     ['uint256'],
        //     [config.l2OutputOracleSlotNumber],
        //   ) +
        //     Number(l1BatchIndex) * 2,
        // ],
      ),
    ],
  )

  console.log('storageHashOutputOracle: ', storageHashOutputOracle)
  console.log(
    'storageAt: ',
    await s.layer1Provider.getStorage(
      config.layer1.l2BaseOutputOracleAddress,
      '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74dfa3',
      // hexlify(toBytes(6124738)),
    ),
  )
  const arrayLengthSlot = zeroPadValue(toBytes(0x3), 32)
  console.log('arrayLengthSlot: ', arrayLengthSlot)
  const firstElementSlot = solidityPackedKeccak256(
    ['bytes32'],
    [arrayLengthSlot],
  )
  console.log('firstElementSlot: ', firstElementSlot)
  const l1BatchIndexHex = zeroPadValue(toBytes(l1BatchIndex), 32)
  console.log('l1BatchIndexHex : ', l1BatchIndexHex)
  // const l1BatchSlot = concat([firstElementSlot, l1BatchIndexHex])
  // const l1BatchSlot = (
  //   parseInt(firstElementSlot, 16) + parseInt(l1BatchIndexHex, 16)
  // ).toString(16)
  const l1BatchSlot = toBeHex(
    BigInt(firstElementSlot) + BigInt(Number(l1BatchIndex) * 2),
    32,
  )

  console.log('l1BatchSlot     : ', l1BatchSlot)

  // Desired  '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74dfa3'
  // Original '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74c311'
  // Get the L1 Batch Block we are proving against
  // Get all the proving data

  try {
    // const proveOutputTX = await s.layer2SourceProverContract.proveOutputRoot(
    //   l2EndBatchBlockData.stateRoot,
    //   l2MesagePasserProof.storageHash,
    //   l2EndBatchBlockData.hash,
    //   l1Batch,
    //   l1StorageProof[0].proof,
    //   await prover.rlpEncodeDataLibList(l1l2OutputOraceContractData),
    //   l1AccountProof,
    //   L1_WORLD_STATE_ROOT,
    // )
    // await proveOutputTX.wait()
    return 'layer2WorldStateRoot'
  } catch (e) {
    console.log(e)
  }
}

async function proveIntent(intentHash) {
  try {
    // const proveIntentTx = await prover.proveIntent(
    //   claimant,
    //   inboxContract,
    //   intentHash,
    //   Number(outputIndex) - 1, // see comment in contract
    //   proof.storageProof[0].proof,
    //   // ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
    //   // await prover.rlpEncodeDataLibList(l2InboxContractData),
    //   await prover.rlpEncodeDataLibList([
    //     proverNonce,
    //     proverFiller,
    //     proverStorageHash,
    //     proverCodeHash,
    //   ]),
    //   proof.accountProof,
    //   l2OutputStorageRoot,
    // )
    // wait proveIntentTx.wait()
    return intentHash
  } catch (e) {
    console.log(e)
  }
}

async function withdrawReward(intentHash) {
  try {
    const withdrawTx =
      await s.layer2SourceIntentSourceContract.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('withdraw complete: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    console.log(e)
  }
}

async function main() {
  // define the variables used for each state of the intent lifecycle
  let intentHash,
    intentFulfillTransaction,
    layer1WorldStateRoot,
    layer2WorldStateRoot,
    intentProofTx,
    withdrawRewardTx
  try {
    // intentHash = await createIntent()
    intentHash =
      '0x8e035df9221b39512f9a7e17b4f3d41fce1572a448b98b96e7af6c29fc4be0f9'
    console.log('Created Intent Hash: ', intentHash)
    // intentFulfillTransaction = await fulfillIntent(intentHash)
    intentFulfillTransaction =
      '0xa372d5b8062a2624aeba2aa77b499b37e89f4e2f93a679418d10c1f7bf049259'
    console.log('intentFulfillTransaction', intentFulfillTransaction)
    // wait for 180 seconds for L1 batch to be Settled
    // await setTimeout(180000)
    // console.log('Waited 180 seconds')
    // layer1WorldStateRoot = await proveL1WorldState()
    const layer1WorldStateRoot =
      '0xc3ec687942c104609632c78a124cc429f59e0fce28702358aeb8f80431376795'
    // currentBlock:  6124968
    // currentBlockTag:  0x5d75a8
    // proven L1 world state root: layer1WorldStateRoot}
    // layer1WorldStateRoot:  0xc3ec687942c104609632c78a124cc429f59e0fce28702358aeb8f80431376795
    console.log('layer1WorldStateRoot: ', layer1WorldStateRoot)
    layer2WorldStateRoot = await proveL2WorldState(intentFulfillTransaction)
    console.log('layer2WorldStateRoot: ', layer2WorldStateRoot)
    // intentProofTx = await proveIntent(intentHash)
    // console.log('intentProofTx: ', intentProofTx)
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
