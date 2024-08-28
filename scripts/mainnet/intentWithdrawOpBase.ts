import {
  AbiCoder,
  Block,
  encodeRlp,
  getBytes,
  hexlify,
  keccak256,
  solidityPackedKeccak256,
  stripZerosLeft,
  toBeArray,
  toQuantity,
  zeroPadValue,
  toBeHex,
} from 'ethers'
import {
  networkIds,
  networks,
  actors,
  intent,
} from '../../config/mainnet/config'
import { s } from '../../config/mainnet/setup'
// import { network } from 'hardhat'

async function getBaseRLPEncodedBlock(blockNumber) {
  console.log('In getBaseRLPEncodedBlock')

  const block: Block = await s.baseProvider.send('eth_getBlockByNumber', [
    blockNumber,
    false,
  ])

  console.log('  toBeHex(block.number),', toBeHex(block.number))
  console.log(
    'stripZerosLeft(toBeHex(block.number)),',
    stripZerosLeft(toBeHex(block.number)),
  )
  const rlpEncodedBlockData = encodeRlp([
    block.parentHash,
    block.sha3Uncles,
    block.miner,
    block.stateRoot,
    block.transactionsRoot,
    block.receiptsRoot,
    block.logsBloom,
    stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
    stripZerosLeft(toBeHex(block.number)),
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
  return rlpEncodedBlockData
}

async function proveSettlementLayerState() {
  console.log('In proveL1WorldState')
  const settlementBlock = await s.optimisml1Block.number()
  const settlementBlockTag = toQuantity(settlementBlock)

  const block: Block = await s.mainnetProvider.send('eth_getBlockByNumber', [
    settlementBlockTag,
    false,
  ])
  // console.log('block: ', block)

  let tx
  let settlementStateRoot
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
    tx = await s.optimismProverContract.proveSettlementLayerState(
      getBytes(hexlify(rlpEncodedBlockData)),
    )
    await tx.wait()
    console.log('Prove Settlement state tx: ', tx.hash)
    settlementStateRoot = block.stateRoot
    console.log(
      'Proven settlement state block: ',
      settlementBlock,
      settlementBlockTag,
    )
    console.log('Proven settlement state root:', settlementStateRoot)
    return { settlementBlockTag, settlementStateRoot }
  } catch (e) {
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in proveL1WorldState:`, e.shortMessage)
    } else {
      console.log(`Error in proveL1WorldState:`, e)
    }
  }
}

async function proveWorldStateBedrock(
  intentFulfillTransaction,
  settlementBlockTag,
  settlementStateRoot,
) {
  console.log('In proveWorldStateBedrock')
  // Get the L1 Batch Number for the transaction we are proving
  const txDetails = await s.baseProvider.getTransaction(
    intentFulfillTransaction,
  )
  const intentFulfillmentBlock = txDetails!.blockNumber
  const l1BatchIndex =
    await s.mainnetSettlementContractBase.getL2OutputIndexAfter(
      intentFulfillmentBlock,
    )
  console.log('Layer 1 Batch Number: ', l1BatchIndex.toString())
  // Get the the L2 End Batch Block for the intent
  const l1BatchData = await s.mainnetSettlementContractBase.getL2OutputAfter(
    intentFulfillmentBlock,
  )
  const endBatchBlockHex = toQuantity(l1BatchData.l2BlockNumber)
  const rlpEncodedBlockData = await getBaseRLPEncodedBlock(endBatchBlockHex)
  const endBatchBlockData = await s.baseProvider.send('eth_getBlockByNumber', [
    endBatchBlockHex,
    false,
  ])
  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.baseProvider.send('eth_getProof', [
    networks.base.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])
  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBeArray(networks.base.proving.l2OutputOracleSlotNumber),
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
  console.log('l1BatchSlot: ', l1BatchSlot)

  const layer1BaseOutputOracleProof = await s.mainnetProvider.send(
    'eth_getProof',
    [
      networks.mainnet.settlementContracts.base,
      [l1BatchSlot],
      settlementBlockTag,
    ],
  )
  const layer1BaseOutputOracleContractData = [
    toBeHex(layer1BaseOutputOracleProof.nonce), // nonce
    stripZerosLeft(toBeHex(layer1BaseOutputOracleProof.balance)), // balance
    layer1BaseOutputOracleProof.storageHash, // storageHash
    layer1BaseOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    const proveOutputTX = await s.optimismProverContract.proveWorldStateBedrock(
      networkIds.base,
      rlpEncodedBlockData,
      endBatchBlockData.stateRoot,
      l2MesagePasserProof.storageHash,
      // endBatchBlockData.hash,
      l1BatchIndex,
      layer1BaseOutputOracleProof.storageProof[0].proof,
      await s.optimismProverContract.rlpEncodeDataLibList(
        layer1BaseOutputOracleContractData,
      ),
      layer1BaseOutputOracleProof.accountProof,
      settlementStateRoot,
    )
    await proveOutputTX.wait()
    console.log('Prove L2 World State tx: ', proveOutputTX.hash)
    return {
      endBatchBlockData,
    }
  } catch (e) {
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
      console.log(
        `Transaction failed in proveWorldStateBedrock : ${decodedError?.name}`,
      )
      console.log('Error: ', e)
      console.log(`Error in proveWorldStateBedrock:`, e.shortMessage)
    } else {
      console.log(`Error in proveWorldStateBedrock:`, e)
    }
  }
}

async function proveIntent(intentHash, endBatchBlockData) {
  console.log('In proveIntent')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 0])],
  )
  const intentInboxProof = await s.baseProvider.send('eth_getProof', [
    networks.base.inboxAddress,
    [inboxStorageSlot],
    endBatchBlockData.number,
  ])

  const intentInfo =
    await s.optimismIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.optimism, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  const balance = stripZerosLeft(toBeHex(intentInboxProof.balance)) // balance
  const nonce = toBeHex(intentInboxProof.nonce) // nonce
  try {
    const proveIntentTx = await s.optimismProverContract.proveIntent(
      networkIds.base,
      actors.claimant,
      networks.base.inboxAddress,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.optimismProverContract.rlpEncodeDataLibList([
        nonce,
        balance,
        intentInboxProof.storageHash,
        intentInboxProof.codeHash,
      ]),
      intentInboxProof.accountProof,
      endBatchBlockData.stateRoot,
    )
    await proveIntentTx.wait()
    console.log('Prove Intent tx:', proveIntentTx.hash)
    return proveIntentTx.hash
  } catch (e) {
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
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
      await s.optimismIntentSourceContractClaimant.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.optimismIntentSourceContractClaimant) {
      const decodedError =
        s.optimismIntentSourceContractClaimant.interface.parseError(e.data)
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
    intentHash = intent.opBaseBedrock.hash
    intentFulfillTransaction = intent.opBaseBedrock.fulfillTransaction
    console.log('intentHash: ', intentHash)
    console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    const { settlementBlockTag, settlementStateRoot } =
      await proveSettlementLayerState()
    const { endBatchBlockData } = await proveWorldStateBedrock(
      intentFulfillTransaction,
      settlementBlockTag,
      settlementStateRoot,
    )
    await proveIntent(intentHash, endBatchBlockData)
    await withdrawReward(intentHash)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
