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
      // console.log('intenthHashEvent: ', JSON.stringify(intenthHashEvent, 0, 2))
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
  // console.log('layer1Block: ', layer1Block.toString())
  const layer1BlockTag = hexlify(toQuantity(layer1Block))
  // console.log('layer1BlockTag: ', layer1BlockTag)

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
  // console.log('inboxStorageSlot: ', inboxStorageSlot)

  // console.log('l2EndBatchBlockData.number : ', l2EndBatchBlockData.number)
  console.log('l2EndBatchBlockData.number: ', l2EndBatchBlockData.number)
  const intentInboxProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [
      config.layer2Destination.inboxAddress,
      [inboxStorageSlot],
      l2EndBatchBlockData.number,
    ],
  )

  // console.log('intentInboxProof.balance: ', intentInboxProof.balance)
  const balance =
    intentInboxProof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.balance.length & (1 === 1)
        ? zeroPadValue(toBytes(intentInboxProof.balance), 1)
        : intentInboxProof.balance
  // console.log('balance: ', balance)
  // console.log('intentInboxProof.nonce: ', intentInboxProof.nonce)
  const nonce =
    intentInboxProof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        intentInboxProof.nonce.length & (1 === 1)
        ? zeroPadValue(toBytes(intentInboxProof.nonce), 1)
        : intentInboxProof.nonce
  // console.log('nonce: ', nonce)
  // console.log('p1: ', config.actors.claimant)
  // console.log('p2: ', config.layer2Destination.inboxAddress)
  // console.log('p3: ', intentHash)
  // console.log('p4: ', Number(l1BatchIndex) - 1)
  // console.log('p5: ', intentInboxProof.storageProof[0].proof)
  console.log(
    'rlpEncodedInboxData: ',
    await s.layer2SourceProverContract.rlpEncodeDataLibList([
      nonce,
      balance,
      intentInboxProof.storageHash,
      intentInboxProof.codeHash,
    ]),
  )
  console.log('l2AccountProof  : ', intentInboxProof.accountProof)
  console.log('l2WorldStateRoot: ', l2EndBatchBlockData.stateRoot)
  try {
    const proveIntentTx = await s.layer2SourceProverContract.proveIntent(
      config.actors.claimant,
      config.layer2Destination.inboxAddress,
      intentHash,
      Number(l1BatchIndex) - 1, // see comment in contract
      intentInboxProof.storageProof[0].proof,
      // ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
      // await prover.rlpEncodeDataLibList(l2InboxContractData),
      // await s.layer2SourceProverContract.rlpEncodeDataLibList([
      //   nonce,
      //   balance,
      //   intentInboxProof.storageHash,
      //   intentInboxProof.codeHash,
      // ]),
      // intentInboxProof.accountProof,
      // l2EndBatchBlockData.stateRoot,
      '0xf8440180a072e9bfee79134bbfaabc80e6acf981d4eeaf33fc67782a1adbcc44207330188ba0733c0ec5c30f2dff7e7ae4a577acf23266929fe04a5cf6599e0d772374b1ec98',
      [
        '0xf90211a066b58585ae8845b6cd64dd9e7b6557818da20549af841549ab65a5ec85180dc8a05b194d18aaa68bde6a00c1878db50fb8bf3515025bfe7739811be1b21e94e1a2a0a8b1708d7d9b6bf10d630a6f0ea822f945c0d86bed08efdb977421d973e604e0a014f4d0f0a8d560cbe804f1de079661526f9b353349505c72c3ad5fb8b3b90d42a0bc16f1215a618154ccf0e4821b78eb88652830ccce0731528b9d4e2c063e2e36a057451f80529639d6306986860bfd075d69067e2d7c5407100e5170eaa92230eca0c80cb83abf32fe6aee4c872ffddb0284fb71736801457820e8e854487637c64ba06b594fcd30bd95549fe3e03e981b54e97be36359dd08ac8d24108156d8672bf8a01e882efb9b9ce11d29dbc5764a52f61c0bf88d1d114e49b8d53cb43f6b533d79a0f22dcade944449f332837bd652489d784dce5ed46ca6bbcb8fcc0c2366f782dca08c341b5b06ef9d6b60047d8fb7f8cbed4e62d360f7e0af219177dc489562a2ada0f3c8e249858b440a76d6cdfd52eb65145fd94f5d3a1f4dfba41dd838e1cb9465a0ac7a6be5f0e99ee7e402c145f603a44a0f2e3cb0e443f65e5fbc54418c65e2eaa00466ac08837f49a6a366faed5cb348630bed9c1877a6f6b223470f0fdc39c21fa0560c0060311ca8180da6f403b793bd3618376860689a4ece4bce3a78971691e4a046cdba0d9daf45d367502d6982cec8995080270a18c770057fa08f4bf155b5e380',
        '0xf90211a0897cfd838845e8e9e21516b0c95af7e11170e95473b1b2a4377964472a65009aa0894207ce79796418c1084c7f5c04b2a08e876b6ed5c791f747d7af7ab21b3b77a0e77ee924918bf349489a67605e3aa77b58d441a441c12bcbd62b8a3fc46f1e2ba08bb5c601a70a73bf4bb0bdf602d653e7d58afc54bbfb8ceb12868ecbc7bbc118a061687e547d6531cc6ef94a25671855cc53a8b43d1655e308cf63f90b082d847ca0a774eede67c3489c576b05aef82ebf24989cf96d532788e770e2f8e793462357a0b2d97f58c44fbc846cad179dde1e8972656796db4e03ecc82ea663ff7a3c167fa0ca2351f59cb82570e15905b55e3617529c0ba64c8166533d2d8bf372109b1c77a0f904f1fc04acc557226da7fd839a1a0b7214c29492280656a01b774493883c8ba099733ae13ffc39503993e8a960065df7af27c8a81ab003ec3ed52d5311cb8e3ba0b27a84deb69837eeb058dce71668ceb515d954a69f97bedd5abdcc689d87646aa0c3470b124059674c5bb15adbb1009d988c82205e19af9f04f462887655149f3ea06578d00fc2630ee2aa73248e8151bbb94b659537bcd577d3da45788be1bf0c80a066c81fa7578df776b7291eeb8bf452c94b3ab860efabc0057c8c12cd7e4b3c66a0f9400005f7d5649e9f0b1967ac36db21d82251047b69adf473eebaf835212a55a056117df178f2f714d3e5659ed5c03934530f031ad396b4acb446a492ce723f2b80',
        '0xf90211a0d8c0cb7473ff7f3fbf18e5316d6bf8432263475176084111285a68e953c8bb7ba0f2ebcc2a35d04ff152df325c766a8e1901104ca82c5d272d9c6b6b0ac2a11efca065cdbefb25c162acb5d86e4a9410b627fed6e9668ea068d02cfdb843dd5ea6d4a08e7257a8746f55aafcdcc66613f4a5f5d53cf39cbb74d4543d7df0fc744a5a8fa086331b655566898444bf23bbbff1150280c194d0d0c7c6300995a5ebb9583548a08f331c39397ae4f7b642a850407271ce4155f9e977a023d52222e2b39dd33519a0de3758ef7af64ac4283e074c4aae8502860e572d4f5a80ad19148b13eba0546ba0751a36bc62c8c795d324b1f08e55662e7d7c65f1427183391bd56f3539756a59a0702d31f6db047329a9765e6b51eac590c7bf6938ca0e2ea1a38c44d0d53356f9a0bde33b43de2abd3557b7ce83ddedb70f40a1357fda805ab78dbce393ee9668d8a00c83153c66a0ed36cde169a662589e1c5f16ab8c748449bd781db1b5737e2352a05b2aace31f913e93489361d3e5bcc43774e17ab647167676667c616597c435d1a0c34ef72299fe5bff6098c37cd4cd4b80d8dfebd231d508850f29d27aaf61c0eea0d6f0581aeb0e536aff3c94d91cfe441c931b6d7234e2c9c7c18f4bf5c7000c89a0615f3ae5da4dca2af02b0cea0c83213663d6744cdbabdec9ed7e17f722b60182a0557eae95339abfb4d54a45a2fa56c4fa4467d3a5d9c10c8e0bdf40e8fca0a7ac80',
        '0xf90211a050d1ac6c67dda35e340a4da87888832f4d15817c272d646a4b370da7b91b1d5aa0fa6dd3176453eda879f9752f8b6d02d98d3a29078ce4485e55eed9dea695ba77a00d1cf9d2b5a4a15f278ce4f10d0e61b443df14b2693cf2181a08bcf427608447a0384167a08b1c80781bb10ba501415f993f2e2f441c0c2e6d878ddaeb2fa7849da004b6beb0d4c87c818e5fe935f7372827b7ff11ad3aebb1b81db913728fc4158da0a27cc9345df4f3e6702a8f26445c080e9def8c1d20d14c4c6f5a26c51bb20e0ba0cc34aee877384a9ea17a30ba1fc5fbd0b4a93717838dd74a1eb50fb42c80ae2ca0977da0c16121ca178e306fdb6b7e8cda52f4734106bb954cafc3f5ba30ad5fb9a0f95488eaca750a563b748d67a716665da0163f4a2a8ab30bd317fc151fec40a4a0b49657c5b0654a68c3111a70a36769be678ed11ed2ebff6aa59e411db1bc548aa08b201f637817ac256949ac78e879d6563a28c290634ac9de8d33c6261f61be0aa0c5d4a6b46e958b2975afdd3066c65303eaf27ed245da028ceb67f259ba18431da0f9f8de4f8dfc849c7c1eaa9f9c6892336fbb3d0d9da71631ff7812e4e4211a78a01cb3655b9f35f75204a58a1a200394b275d284a9beb499d783fa242b3f42d34ca03545af62dd1f568619939de1977dce4eac6b2499b341be88ffbe9f99c6555813a07744abee69aea6ecc06f471971c448c4abd50af91266fc1c17ff74f08a1de3ab80',
        '0xf90211a03d1d943c9e7e4c951051afe33a297815a20e9c7042612ce5efadac4595f87e50a0c6f3e4e90b667d7b606405b4aa722c2a77c5319b95ee9593b34c931e29c6141ba0555a6a7f0dc9fd638f4b2b76d80a8c73bdfa0cec2c23d4ae95ef4ab2b6e2d286a050e4b5275cde4ef7cec6c549fb165b6cf2f1072dbe8903c68a7f6b4c3ae0e559a0c980f29cbe91b50d4516574fe18cdf63a0f144852bcfafd7bf46f6acab0e92f4a088d9826f28401cb2cf200b23efdcb8265478cf8348bfc1a96aa14bd6385d6846a099432739bd79da136572431d3ccc732c1762cb07b685b3544b512f9613c438eea081c508b643feedf3ce825d1f64e0befe4148a413723c872dc3c2860e49e27c5ca0e9a5a75a376047e1bcedfe2ccf56576d1228bed921fa86aae5defa502dd2c83da093965e57da9bacf141b4fcbc21089371d0b0fc2f37ef94a9f32aa56fd754bc44a0eb2b951212cf9426ea568352477cb399577f70fec9a5606f577c96cf392eb170a0742b967c3eac1dffc518d1b4b76d553fbce0703bccc6409a2da19f2700a64846a018d4fc36167a9e6a58b60bb513807029ffec5d1c36b6bc9f94b2d49d6f5c28d0a035d0bd459f4548a1276e018f901ddd650a958d3054816b96514f80be09edd34fa0ac9519e53896c5336e85c1e1c24c01f707befd4112dd32ae08752a9452871bf4a09e0c10df90409a9f194e679c9aa225a4709cce93b8353872771f90a8d347279180',
        '0xf8d1a0199ce9be696107f237e63786537fc8d50b25790e27d277bc208c8ceb251c412a80a08266a9b830636f92a4582b8d39ae74ae7205a2b5f1cb57cbdefb82d155805004a0676e7c9f54c0476938714121fbf74767d7137c760370da72de76d502d6bdf2e0808080808080a03298ad1e8e6d79ef77e6547a52fb81ac0baac87641a4d2a185fbc38318d0b78580a0cc465286bddc007cc5f18f2a272b33dc5c2257762237dad3db1357cfae9e99e780a02c56089052beca527600bac5fd67bc78560277127bc10900041976ce3036cf5e8080',
        '0xf851808080808080a018c3ed3d2969585e3265694b8d09651d24ff10ae50e69e31f41e0e6740b2fd418080808080a003b83903e1671191c8b527a5292d3955c079ba70720340c69d0d7ecf9afcf0cd80808080',
        '0xf8669d369e27b0a63e9761e45852b16c85e7f60f3ab3725b7b0f7f4de9515149b846f8440180a072e9bfee79134bbfaabc80e6acf981d4eeaf33fc67782a1adbcc44207330188ba0733c0ec5c30f2dff7e7ae4a577acf23266929fe04a5cf6599e0d772374b1ec98',
      ],
      '0x60b1e579eba20ec0bbb1179c92e125341a441f2b66c8c141cd90839161f516f5',
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
      await s.layer2SourceIntentSourceContractClaimant.withdrawRewards(
        intentHash,
      )
    await withdrawTx.wait()
    console.log('withdraw complete: ', withdrawTx.hash)
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
    // // intentHash =
    // //   '0xf749096dffa1c27665cae488e012e245f8ccea481c3ee6be0de79dfde87d4db5'
    // console.log('Created Intent Hash: ', intentHash)
    // intentFulfillTransaction = await fulfillIntent(intentHash)
    // // // intentFulfillTransaction =
    // // //   '0xb8409eaf9602290bf174176ad65bb4e00202538e9d32ab10a48879fdf63ccd60'
    // console.log('intentFulfillTransaction', intentFulfillTransaction)
    // // wait for 600 seconds for L1 batch to be Settled (it takes around 7 mins to show as settled on basescan)
    // console.log('Waiting for 600 seconds for Batch to settle')
    // await setTimeout(600000)
    // console.log('Waited 600 seconds')
    // const { layer1Block, layer1BlockTag, layer1WorldStateRoot } =
    //   await proveL1WorldState()
    // // layer1Block = 6143128
    // // layer1BlockTag = '0x5dbc98'
    // // layer1WorldStateRoot =
    // //   '0x02f6b2ce141a90dd3419db142508c41b205886b8f73ed42d1ab49ae2810f2f72'
    // console.log('layer1Block         : ', layer1Block)
    // console.log('layer1BlockTag      : ', layer1BlockTag)
    // console.log('layer1WorldStateRoot: ', layer1WorldStateRoot)
    // const {
    //   proveL2WorldStateTxHash,
    //   l1BatchIndex,
    //   layer1BaseOutputOracleProof,
    //   l2EndBatchBlockData,
    // } = await proveL2WorldState(
    //   layer1BlockTag,
    //   intentFulfillTransaction,
    //   layer1WorldStateRoot,
    // )
    // // proveL2WorldStateTxHash = '0xc0c48d5db5cb1d27514c45a2fa20849e31fddbabdbc1402cf0a388418368fdcc'
    // // l1BatchIndex = 96026
    // // layer1BaseOutputOracleProofStorageProof =
    // // l2EndBatchBlockData =
    // // console.log('proveL2WorldStateTxHash     : ', proveL2WorldStateTxHash)
    // // console.log('l1BatchIndex                : ', l1BatchIndex)
    // // console.log('layer1BaseOutputOracleProof : ', layer1BaseOutputOracleProof)
    // // console.log('l2EndBatchBlockData         : ', l2EndBatchBlockData)
    // console.log('intentHash: ', intentHash)
    // console.log('layer1WorldStateRoot: ', layer1WorldStateRoot)
    // console.log('l1BatchIndex: ', l1BatchIndex)
    // console.log('l2EndBatchBlockData', l2EndBatchBlockData)
    const intentHash =
      '0x6006ecc3baa99c2667e9b01c0ec929398d05db5880125a330655d38815e4830b'
    const layer1WorldStateRoot =
      '0x26ea99acf2ddc88206d27dbe212ed72ad64f989405a28a07078c41eccc98dc05'
    const l1BatchIndex = 96504
    const l2EndBatchBlockData = {
      number: '0xb0b4b8',
      hash: '0x70d6f2896d1663b0a619b4d2546b61f123ca2bfea4fe9f2949d64b6f81dd3337',
      transactions: [
        '0x2be3c4d4ac2d876398c79da40868fa73b16ed8392826a40607629ad6af884827',
        '0x7b7fb9d0f67818cad470301552ecfd98f7e691fd434f4602baa0a00c6728e530',
        '0x7a18d59d0e8f55341f82c568923e2e951ae61f886e1464f992688e4b2f4d864e',
        '0xc3b5c3f33db1115a3a5009ede6ffb282a926e3e231991e0b95ad667344453f7e',
        '0x38aa29c0aed40b04fdcb3a9efcab9570b8ccb7db94c552579ae2c805305a4d13',
        '0x8d70f61feaa5424067477a5061eb58739db8d29f96701763d1179e28041ac6c2',
        '0xdd2c655e8507e6a4d0d35efc48be61724db3be18ed2ddaefd00f55837914f4cd',
      ],
      logsBloom:
        '0x00000000000040200000000000008020800000001000000000000000000000000008000000000000000200050000000100102000000000000000020200000100000000000000010000000000000020000000002000042000000000100000000000000000080000000100000800000004000000000000200000080000000000000000900000000000000000020000080000000800000000000000000000000000000000000000200000600000000000000000000400000000000002000000000004000000000000000041000004000000000000000000002000000240000000000000080050100040000000000000000008000000002000000001000800000000',
      totalDifficulty: '0x0',
      receiptsRoot:
        '0x7c1a0ca3fd6f1bec6e2d89280c5bf50c527b6e40a4dac6b660ab5bf86f42a877',
      extraData: '0x',
      withdrawalsRoot:
        '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
      baseFeePerGas: '0x11a',
      nonce: '0x0000000000000000',
      miner: '0x4200000000000000000000000000000000000011',
      withdrawals: [],
      excessBlobGas: '0x0',
      difficulty: '0x0',
      gasLimit: '0x2aea540',
      gasUsed: '0x2450c5',
      uncles: [],
      parentBeaconBlockRoot:
        '0xa9232d936b5e27771d89a342bab93b8eeeedcbec70fa131aa2571cf57c24d77c',
      size: '0x196bb',
      sha3Uncles:
        '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
      transactionsRoot:
        '0x1898adf50196be881d48ea3b971c91a96b2d0ce541c74977e1cd86a4c1849fce',
      stateRoot:
        '0x60b1e579eba20ec0bbb1179c92e125341a441f2b66c8c141cd90839161f516f5',
      mixHash:
        '0xbbbb7cf2948d39467fc779751e67ebd1eaecd322e52bfb85f33fc651ec5f03c2',
      parentHash:
        '0x05b75b315566671c174a8c7c3ac09632c58136901577464caf9176a535603714',
      blobGasUsed: '0x0',
      timestamp: '0x6674c850',
    }

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
