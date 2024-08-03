import {
  Block,
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
import config from '../../config/testnet/config'
import { s } from './cannon/setup'
import { expect } from 'chai'

// Testing Data

// Standalone State Tests
/*
Ethereum
- Block
Base
- Fault Dispute Game
- Block
- Intents - None
ECO
- Batch
- Block
- Intents - None
Optimism
- Fault Dispute Game
- Block
- Intents - None
*/

// ECO Base Initial Tests (Cannon and Bedrock)

// ECO Base Optimism Tests (Cannon and Bedrock)

// Chain Based Proving

// Prove Settlement Layer State - Ethereum Only

// Prove Destination Layer State - Base, Sepolia, Optimism

// Prove Intents - Base, Sepolia, Optimism

// Withdraw Rewards - Base, Sepolia, Optimism

async function proveSettlementLayerState() {
  console.log('In proveSettlementLayerState')
  const layer1Block = await s.layer2Layer1BlockAddressContract.number()
  const layer1BlockTag = toQuantity(layer1Block)

  const block: Block = await s.layer1Provider.send('eth_getBlockByNumber', [
    layer1BlockTag,
    false,
  ])
  // const block: Block = await s.layer2DestinationProvider.send(
  //   'eth_getBlockByNumber',
  //   [config.cannon.layer2.endBatchBlock, false],
  // )
  console.log('block: ', block)

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
    tx = await s.layer2SourceProverContract.proveSettlementLayerState(
      getBytes(hexlify(rlpEncodedBlockData)),
      config.optimismSepolia.chainId,
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
      console.log(`Error in proveSettlementLayerState:`, e.shortMessage)
    } else {
      console.log(`Error in proveSettlementLayerState:`, e)
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
  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.layer2DestinationProvider.send(
    'eth_getProof',
    [config.optimismSepolia.l2l1MessageParserAddress, [], l2EndBatchBlockHex],
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
  console.log('l1BatchSlot: ', l1BatchSlot)

  const layer1BaseOutputOracleProof = await s.layer1Provider.send(
    'eth_getProof',
    [config.sepolia.l2BaseOutputOracleAddress, [l1BatchSlot], layer1BlockTag],
  )
  const layer1BaseOutputOracleContractData = [
    toBeHex(layer1BaseOutputOracleProof.nonce), // nonce
    stripZerosLeft(toBeHex(layer1BaseOutputOracleProof.balance)), // balance
    layer1BaseOutputOracleProof.storageHash, // storageHash
    layer1BaseOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    const proveOutputTX =
      await s.layer2SourceProverContract.proveWorldStateCannon(
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
    [
      config.optimismSepolia.inboxAddress,
      [inboxStorageSlot],
      l2EndBatchBlockData.number,
    ],
  )

  const balance = stripZerosLeft(toBeHex(intentInboxProof.balance)) // balance
  const nonce = toBeHex(intentInboxProof.nonce) // nonce
  try {
    const proveIntentTx = await s.layer2SourceProverContract.proveIntent(
      config.actors.claimant,
      config.optimismSepolia.inboxAddress,
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
    console.log('Prove Intent tx:', proveIntentTx.hash)
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
  // Point in time proving for latest batch
  let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    // intentHash = config.intents.optimismSepolia.intentHash
    // intentFulfillTransaction =
    //   config.intents.optimismSepolia.intentFulfillTransaction
    // console.log('intentHash: ', intentHash)
    // console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    // // get the latest world state
    // const { layer1BlockTag, layer1WorldStateRoot } = await proveSettlementLayerState()
    // console.log('layer1BlockTag: ', layer1BlockTag)
    // console.log('layer1WorldStateRoot: ', layer1WorldStateRoot)
    // const layer1BlockTag = config.intents.optimismSepolia.layer1BlockTag
    // const layer1WorldStateRoot =
    //   config.intents.optimismSepolia.layer1WorldStateRoot
    // // get the latest dispute game that has been solved
    // //
    // const { l1BatchIndex, l2EndBatchBlockData } = await proveL2WorldState(
    //   layer1BlockTag,
    //   intentFulfillTransaction,
    //   layer1WorldStateRoot,
    // )
    // console.log
    // await proveIntent(intentHash, l1BatchIndex, l2EndBatchBlockData)
    // await withdrawReward(intentHash)
    // await s.layer2SourceProverContract.proveSettlementLayerState(
    //   config.cannon.layer1.rlpEncodedBlockData,
    //   config.sepolia.chainId,
    // )

    // console.log('Testing rootClaim from Prover')
    // const cannonRootClaimFromProver =
    //   await s.layer2SourceProverContract.generateOutputRoot(
    //     0,
    //     config.cannon.layer2.endBatchBlockStateRoot,
    //     config.cannon.layer2.messagePasserStateRoot,
    //     config.cannon.layer2.endBatchBlockHash,
    //   )
    // const cannonRootClaim = solidityPackedKeccak256(
    //   ['uint256', 'bytes32', 'bytes32', 'bytes32'],
    //   [
    //     0,
    //     config.cannon.layer2.endBatchBlockStateRoot,
    //     config.cannon.layer2.messagePasserStateRoot,
    //     config.cannon.layer2.endBatchBlockHash,
    //   ],
    // )
    // expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
    // expect(cannonRootClaimFromProver).to.equal(
    //   config.cannon.layer2.disputeGameFactory.faultDisputeGame.rootClaim,
    // )

    // console.log('Testing DisputeGameStorageSlot from Prover')
    // const arrayLengthSlot = zeroPadValue(
    //   toBeArray(
    //     config.cannon.layer2.disputeGameFactory.faultDisputeGame.listSlot,
    //   ),
    //   32,
    // )
    // const firstElementSlot = solidityPackedKeccak256(
    //   ['bytes32'],
    //   [arrayLengthSlot],
    // )
    // const disputeGameStorageSlot = toBeHex(
    //   BigInt(firstElementSlot) +
    //     BigInt(
    //       Number(
    //         config.cannon.layer2.disputeGameFactory.faultDisputeGame.gameIndex,
    //       ),
    //     ),
    //   32,
    // )
    // expect(disputeGameStorageSlot).to.equal(
    //   config.cannon.layer2.disputeGameFactory.faultDisputeGame
    //     .gameIDStorageSlot,
    // )
    // console.log(
    //   'Prove storage showing the DisputeGameFactory created the FaultDisputGame',
    // )
    // console.log(
    //   'gameIdRLPEncoded: ',
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         config.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
    //       ),
    //     ),
    //   ),
    // )
    // await s.layer2SourceProverContract.proveStorage(
    //   config.cannon.layer2.disputeGameFactory.faultDisputeGame
    //     .gameIDStorageSlot,
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         config.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
    //       ),
    //     ),
    //   ),
    //   // encodeRlp(t.cannon.gameId),
    //   config.cannon.layer2.disputeGameFactory.storageProof,
    //   config.cannon.layer2.disputeGameFactory.stateRoot,
    // )

    // console.log(
    //   'Prove account showing that the above ProveStorage is for a valid WorldState',
    // )
    // await s.layer2SourceProverContract.proveAccount(
    //   config.cannon.layer2.disputeGameFactory.address,
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     config.cannon.layer2.disputeGameFactory.contractData,
    //   ),
    //   config.cannon.layer2.disputeGameFactory.accountProof,
    //   config.cannon.layer1.worldStateRoot,
    // )

    // console.log(
    //   'Prove storage showing the FaultDisputeGame has a status which shows the Defender Won',
    // )
    // await s.layer2SourceProverContract.proveStorage(
    //   config.cannon.layer2.faultDisputeGame.status.storageSlot,
    //   encodeRlp(
    //     toBeHex(
    //       // stripZerosLeft(
    //       config.cannon.layer2.faultDisputeGame.status.storageData,
    //       // ),
    //     ),
    //   ),
    //   config.cannon.layer2.faultDisputeGame.status.storageProof,
    //   config.cannon.layer2.faultDisputeGame.stateRoot,
    // )

    // console.log(
    //   'Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block',
    // )
    // console.log(
    //   'Encoded RLP rootClaim : ',
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         config.cannon.layer2.faultDisputeGame.rootClaim.storageData,
    //       ),
    //     ),
    //   ),
    // )
    // await s.layer2SourceProverContract.proveStorage(
    //   config.cannon.layer2.faultDisputeGame.rootClaim.storageSlot,
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         config.cannon.layer2.faultDisputeGame.rootClaim.storageData,
    //       ),
    //     ),
    //   ),
    //   // encodeRlp(t.cannon.faultDisputeGameRootClaimStorage),
    //   config.cannon.layer2.faultDisputeGame.rootClaim.storageProof,
    //   config.cannon.layer2.faultDisputeGame.stateRoot,
    // )

    // console.log(
    //   'Prove account showing that the above ProveStorages are for a valid WorldState',
    // )
    // await s.layer2SourceProverContract.proveAccount(
    //   config.cannon.layer2.faultDisputeGame.address,
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     config.cannon.layer2.faultDisputeGame.contractData,
    //   ),
    //   config.cannon.layer2.faultDisputeGame.accountProof,
    //   config.cannon.layer1.worldStateRoot,
    // )

    // console.log('Beginning Proving L2 World State Cannon')
    // const block: Block = await s.layer2DestinationProvider.send(
    //   'eth_getBlockByNumber',
    //   [config.cannon.layer2.endBatchBlock, false],
    // )
    // // console.log('block: ', block)

    // const rlpEncodedBlockData = encodeRlp([
    //   block.parentHash,
    //   block.sha3Uncles,
    //   block.miner,
    //   block.stateRoot,
    //   block.transactionsRoot,
    //   block.receiptsRoot,
    //   block.logsBloom,
    //   stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
    //   toBeHex(block.number),
    //   toBeHex(block.gasLimit),
    //   toBeHex(block.gasUsed),
    //   block.timestamp,
    //   block.extraData,
    //   block.mixHash,
    //   block.nonce,
    //   toBeHex(block.baseFeePerGas),
    //   block.withdrawalsRoot,
    //   stripZerosLeft(toBeHex(block.blobGasUsed)),
    //   stripZerosLeft(toBeHex(block.excessBlobGas)),
    //   block.parentBeaconBlockRoot,
    // ])
    // console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)
    // const RLPEncodedDisputeGameFactoryData =
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     config.cannon.layer2.disputeGameFactory.contractData,
    //   )

    // const disputeGameFactoryProofData = {
    //   l2WorldStateRoot: config.cannon.layer2.endBatchBlockStateRoot,
    //   l2MessagePasserStateRoot: config.cannon.layer2.messagePasserStateRoot,
    //   l2LatestBlockHash: config.cannon.layer2.endBatchBlockHash,
    //   gameIndex:
    //     config.cannon.layer2.disputeGameFactory.faultDisputeGame.gameIndex,
    //   // gameId: toBeHex(stripZerosLeft(config.cannon.gameId)),
    //   gameId: config.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
    //   l1DisputeFaultGameStorageProof:
    //     config.cannon.layer2.disputeGameFactory.storageProof,
    //   rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

    //   disputeGameFactoryAccountProof:
    //     config.cannon.layer2.disputeGameFactory.accountProof,
    // }

    // const RLPEncodedFaultDisputeGameData =
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     config.cannon.layer2.faultDisputeGame.contractData,
    //   )
    // const faultDisputeGameProofData = {
    //   faultDisputeGameStateRoot:
    //     config.cannon.layer2.faultDisputeGame.stateRoot,
    //   faultDisputeGameRootClaimStorageProof:
    //     config.cannon.layer2.faultDisputeGame.rootClaim.storageProof,
    //   // faultDisputeGameStatusStorage: config.cannon.faultDisputeGameStatusStorage,
    //   // faultDisputeGameStatusStorage: encodeRlp(
    //   //   toBeHex(
    //   //     stripZerosLeft(config.cannon.layer2.faultDisputeGame.status.storageData),
    //   //   ),
    //   // ),
    //   faultDisputeGameStatusSlotData: {
    //     createdAt:
    //       config.cannon.layer2.faultDisputeGame.status.storage.createdAt,
    //     resolvedAt:
    //       config.cannon.layer2.faultDisputeGame.status.storage.resolvedAt,
    //     gameStatus:
    //       config.cannon.layer2.faultDisputeGame.status.storage.gameStatus,
    //     initialized:
    //       config.cannon.layer2.faultDisputeGame.status.storage.initialized,
    //     l2BlockNumberChallenged:
    //       config.cannon.layer2.faultDisputeGame.status.storage
    //         .l2BlockNumberChallenged,
    //     filler: getBytes(
    //       config.cannon.layer2.faultDisputeGame.status.storage.filler,
    //     ),
    //   },
    //   faultDisputeGameStatusStorageProof:
    //     config.cannon.layer2.faultDisputeGame.status.storageProof,
    //   rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
    //   faultDisputeGameAccountProof:
    //     config.cannon.layer2.faultDisputeGame.accountProof,
    // }
    // console.log('about to proveWorldStateCannon')
    // await s.layer2SourceProverContract.proveWorldStateCannon(
    //   config.cannon.intent.destinationChainId,
    //   config.cannon.intent.rlpEncodedBlockData,
    //   config.cannon.layer2.endBatchBlockStateRoot,
    //   disputeGameFactoryProofData,
    //   faultDisputeGameProofData,
    //   config.cannon.layer1.worldStateRoot,
    // )
    // console.log('Proved L2 World State Cannon')
    // console.log('about to proveIntent')
    // console.log(config.cannon.intent.destinationChainId)
    // console.log(config.actors.claimant)
    // console.log(config.optimismSepolia.inboxAddress)
    // console.log(config.cannon.intent.intentHash)
    // console.log(config.cannon.intent.storageProof)
    // console.log(
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     config.cannon.intent.inboxContractData,
    //   ),
    // )
    // console.log(config.cannon.intent.accountProof)
    // console.log(config.cannon.layer2.endBatchBlockStateRoot)
    // await s.layer2SourceProverContract.proveIntent(
    //   config.cannon.intent.destinationChainId,
    //   config.actors.claimant,
    //   // t.intents.optimismSepolia.rlpEncodedBlockData,
    //   config.optimismSepolia.inboxAddress,
    //   config.cannon.intent.intentHash,
    //   // 1, // no need to be specific about output indexes yet
    //   config.cannon.intent.storageProof,
    //   await s.layer2SourceProverContract.rlpEncodeDataLibList(
    //     config.cannon.intent.inboxContractData,
    //   ),
    //   config.cannon.intent.accountProof,
    //   config.cannon.layer2.endBatchBlockStateRoot,
    // )
    // console.log('Proved Intent')
    console.log('about to withdrawReward')
    await withdrawReward(config.cannon.intent.intentHash)
    console.log('Withdrew Reward')
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
