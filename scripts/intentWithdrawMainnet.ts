import {
  BigNumberish,
  Block,
  BytesLike,
  encodeRlp,
  getBytes,
  hexlify,
  solidityPackedKeccak256,
  stripZerosLeft,
  toBeArray,
  toQuantity,
  zeroPadValue,
  toBeHex,
} from 'ethers'
import config from '../config/config'
import { s } from './setupMainnet'

async function proveL1WorldState() {
  console.log('In proveL1WorldState')
  const layer1Block = await s.layer2Layer1BlockAddressContract.number()
  const layer1BlockTag = toQuantity(layer1Block)

  const block: Block = await s.layer1Provider.send('eth_getBlockByNumber', [
    layer1BlockTag,
    false,
  ])
  // console.log('block: ', block)

  let tx
  let layer1WorldStateRoot
  try {
    const rlpEncodedBlockData = encodeRlp([
      block.parentHash,
      block.sha3Uncles,
      block.miner,
      block.stateRoot,
      block.transactionsRoot,
      block.receiptsRoot,
      block.logsBloom,
      stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
      toBeHex(block.number),
      toBeHex(block.gasLimit),
      toBeHex(block.gasUsed),
      block.timestamp,
      block.extraData,
      block.mixHash,
      block.nonce,
      toBeHex(block.baseFeePerGas),
      block.withdrawalsRoot,
      stripZerosLeft(toBeHex(block.blobGasUsed)),
      stripZerosLeft(toBeHex(block.excessBlobGas)),
      block.parentBeaconBlockRoot,
    ])
    console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)
    tx = await s.layer2SourceProverContract.proveL1WorldState(
      getBytes(hexlify(rlpEncodedBlockData)),
    )
    await tx.wait()
    console.log('Prove L1 world state tx: ', tx.hash)
    layer1WorldStateRoot = block.stateRoot
    console.log('Proven L1 world state block: ', layer1Block, layer1BlockTag)
    console.log('Proven L1 world state root:', layer1WorldStateRoot)
    return { layer1BlockTag, layer1WorldStateRoot }
  } catch (e) {
    if (e.data && s.layer2SourceProverContract) {
      const decodedError = s.layer2SourceProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in proveL1WorldState:`, e.shortMessage)
    } else {
      console.log(`Error in proveL1WorldState:`, e)
    }
  }
  //   have successfully proven L1 state
}

async function proveL2WorldState(
  layer1BlockTag,
  intentFulfillTransaction,
  layer1WorldStateRoot,
) {
  console.log('In proveL2WorldState')
  // Get the L1 Batch Number for the transaction we are proving
  const txDetails = await s.layer2DestinationProvider.getTransaction(
    intentFulfillTransaction,
  )
  const intentFulfillmentBlock = txDetails!.blockNumber
  const intentFulfillmentBlockHex = toQuantity(intentFulfillmentBlock)
  console.log('intentFulfillmentBlock: ', intentFulfillmentBlock)
  console.log('intentFulfillmentBlockHex: ', intentFulfillmentBlockHex)
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
  const l2EndBatchBlockHex = toQuantity(l1BatchData.l2BlockNumber)
  const l2EndBatchBlockData = await s.layer2DestinationProvider.send(
    'eth_getBlockByNumber',
    [l2EndBatchBlockHex, false],
  )
  // Get the Message Parser State Root at the block the intent was fulfilled
  const l2MesagePasserProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [config.base.l2l1MessageParserAddress, [], intentFulfillmentBlockHex],
  )
  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBeArray(config.l2OutputOracleSlotNumber),
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
  // https://viem.sh/docs/utilities/fromHex#hextobigint
  // https://viem.sh/docs/utilities/toHex
  // const l1BatchSlot = numberToHex(
  //   hexToBigInt(firstElementSlot, { size: 32 }) +
  //     BigInt(Number(l1BatchIndex) * 2),
  //   { size: 32 },
  // )
  // console.log('firstElementSlot: ', firstElementSlot)
  // console.log(
  //   'firstElementSlotBigInt: ',
  //   hexToBigInt(firstElementSlot, { size: 32 }),
  // )
  // // console.log('BigInt(firstElementSlot) :', BigInt(firstElementSlot))
  // console.log('l1BatchIndex: ', l1BatchIndex)
  // console.log('Number(l1BatchIndex) * 2', Number(l1BatchIndex) * 2)
  // console.log(
  //   'BigInt(Number(l1BatchIndex) * 2)',
  //   BigInt(Number(l1BatchIndex) * 2),
  // )
  // console.log(
  //   'BigIntBatchSlot: ',
  //   hexToBigInt(firstElementSlot, { size: 32 }) +
  //     BigInt(Number(l1BatchIndex) * 2 + 8),
  // )
  // return
  // const l1BatchSlot =
  //   '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f723ffb'
  console.log('l1BatchSlot: ', l1BatchSlot)

  const layer1BaseOutputOracleProof = await s.layer1Provider.send(
    'eth_getProof',
    [config.mainnet.l2BaseOutputOracleAddress, [l1BatchSlot], layer1BlockTag],
  )
  const layer1BaseOutputOracleContractData = [
    '0x01', // nonce
    '0x', // balance
    layer1BaseOutputOracleProof.storageHash, // storageHash
    layer1BaseOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    console.log(
      'config.mainnet.l2BaseOutputOracleAddress: ',
      config.mainnet.l2BaseOutputOracleAddress,
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

    // generate the Output Root
    // const outputRoot = await s.layer2SourceProverContract.generateOutputRoot(
    //   0,
    //   layer1WorldStateRoot,
    //   l2MesagePasserProof.storageHash,
    //   l2EndBatchBlockData.hash,
    // )
    // console.log('outputRoot: ', outputRoot)

    // // prove storage
    // const l1StorageProof =
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     layer1BaseOutputOracleContractData,
    //   )
    // console.log('l1StorageProof: ', l1StorageProof)
    // await s.layer2SourceProverContract.proveStorage(
    //   l1BatchSlot,
    //   // outputRoot,
    //   // '0xa082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d'
    //   '0xa09e0623fba42b56d581e1cd5111fb734ad924d191eff3299c4313e122e906e981',
    //   // bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
    //   l1StorageProof,
    //   layer1BaseOutputOracleProof.storageHash,
    // )

    // console.log('Proved Storage')

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
    console.log('Prove L2 World State tx: ', proveOutputTX.hash)
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
      console.log('Error: ', e)
      console.log(`Error in proveL2WorldState:`, e.shortMessage)
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
    [config.base.inboxAddress, [inboxStorageSlot], l2EndBatchBlockData.number],
  )

  const balance =
    intentInboxProof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        intentInboxProof.balance.length & (1 === 1)
        ? zeroPadValue(toBeArray(intentInboxProof.balance), 1)
        : intentInboxProof.balance
  const nonce =
    intentInboxProof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        intentInboxProof.nonce.length & (1 === 1)
        ? zeroPadValue(toBeArray(intentInboxProof.nonce), 1)
        : intentInboxProof.nonce
  try {
    const proveIntentTx = await s.layer2SourceProverContract.proveIntent(
      config.actors.claimant,
      config.base.inboxAddress,
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
    console.log('Prove Intent tx:', proveIntentTx.tx)
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
    intentHash = config.mainnetIntent.intentHash
    intentFulfillTransaction = config.mainnetIntent.intentFulfillTransaction
    console.log('intentHash: ', intentHash)
    console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    const { layer1BlockTag, layer1WorldStateRoot } = await proveL1WorldState()
    // Original
    // const layer1BlockTag = '0x1347f89'
    // const layer1WorldStateRoot =
    //   '0xc31af802e82d28ba983b8e03fb70bb221a07a32979aec35ab65b38201ee62722'
    // Latest
    // const layer1BlockTag = '0x134c5cb'
    // const layer1WorldStateRoot =
    //   '0x69d3c2c844414686d48dffee7c5b3d319f538fb5a182e9a802d79c91e07c6fac'
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
