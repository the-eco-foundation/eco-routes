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
import { expect } from 'chai'

async function getBlockRLPEncodedData() {
  console.log('In proveSettlementLayerState')

  const blockTag = '0xcc7205'

  const block: Block = await s.baseSepoliaProvider.send(
    'eth_getBlockByNumber',
    [blockTag, false],
  )
  console.log('block: ', block)

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
  console.log('Block: ', blockTag)
  console.log(
    'Calculated Block Hash: ',
    solidityPackedKeccak256(['bytes'], [rlpEncodedBlockData]),
  )
  console.log('block.stateRoot:', block.stateRoot)
  return rlpEncodedBlockData
  //   have successfully proven L1 state
}

function getIntentStorageSlot(intentHash) {
  return solidityPackedKeccak256(['bytes32', 'uint256'], [intentHash, 0])
}

// Proving Sepolia State for BaseSepolia on ECOTestNet
async function proveSepoliaSettlementLayerStateOnEcoTestNet() {
  console.log('In proveSettlementLayerState')
  const setlementBlock = await s.baseSepolial1Block.number()
  const settlmentBlockTag = toQuantity(setlementBlock)

  const block: Block = await s.sepoliaProvider.send('eth_getBlockByNumber', [
    settlmentBlockTag,
    false,
  ])
  // const block: Block = await s.layer2DestinationProvider.send(
  //   'eth_getBlockByNumber',
  //   [config.cannon.layer2.endBatchBlock, false],
  // )
  console.log('block: ', block)

  let tx
  let settlementWorldStateRoot
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
    tx = await s.ecoTestNetProverContract.proveSettlementLayerStatePriveleged(
      getBytes(hexlify(rlpEncodedBlockData)),
      networks.sepolia.chainId,
    )
    await tx.wait()
    console.log('Prove Settlement world state tx: ', tx.hash)
    settlementWorldStateRoot = block.stateRoot
    console.log(
      'Proven L1 world state block: ',
      setlementBlock,
      settlmentBlockTag,
    )
    console.log('Proven Settlement world state root:', settlementWorldStateRoot)
    return { settlmentBlockTag, settlementWorldStateRoot }
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
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

async function destinationStateProvingTestsEcoTestNet() {
  // Test RootClaim for Prover
  console.log('Testing rootClaim from Prover')
  const cannonRootClaimFromProver =
    await s.ecoTestNetProverContract.generateOutputRoot(
      0,
      cannon.destinationChain.endBatchBlockStateRoot,
      cannon.destinationChain.messagePasserStateRoot,
      cannon.destinationChain.endBatchBlockHash,
    )
  const cannonRootClaim = solidityPackedKeccak256(
    ['uint256', 'bytes32', 'bytes32', 'bytes32'],
    [
      0,
      cannon.destinationChain.endBatchBlockStateRoot,
      cannon.destinationChain.messagePasserStateRoot,
      cannon.destinationChain.endBatchBlockHash,
    ],
  )
  expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
  expect(cannonRootClaimFromProver).to.equal(
    cannon.destinationChain.disputeGameFactory.faultDisputeGame.rootClaim,
  )
  console.log('Cannon RootClaim:', cannonRootClaim)
  console.log('RootClaim from Prover matches RootClaim from Cannon')
  // Prove DisputGameFactory Storage Slot is correct
  console.log('Testing DisputeGameStorageSlot from Prover')
  const arrayLengthSlot = zeroPadValue(
    toBeArray(
      cannon.destinationChain.disputeGameFactory.faultDisputeGame
        .listSlotNumber,
    ),
    32,
  )
  const firstElementSlot = solidityPackedKeccak256(
    ['bytes32'],
    [arrayLengthSlot],
  )
  const disputeGameStorageSlot = toBeHex(
    BigInt(firstElementSlot) +
      BigInt(
        Number(
          cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameIndex,
        ),
      ),
    32,
  )
  expect(disputeGameStorageSlot).to.equal(
    cannon.destinationChain.disputeGameFactory.faultDisputeGame
      .gameIDStorageSlot,
  )
  console.log('DisputeGameStorageSlot:', disputeGameStorageSlot)
  console.log(
    'DisputeGameStorageSlot from Prover matches DisputeGameStorageSlot from Cannon',
  )
  // StorageProof for DisputeGameFactory
  console.log(
    'Prove storage showing the DisputeGameFactory created the FaultDisputGame',
  )
  console.log(
    'gameIdRLPEncoded: ',
    encodeRlp(
      toBeHex(
        stripZerosLeft(
          cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
        ),
      ),
    ),
  )
  await s.ecoTestNetProverContract.proveStorage(
    cannon.destinationChain.disputeGameFactory.faultDisputeGame
      .gameIDStorageSlot,
    encodeRlp(
      toBeHex(
        stripZerosLeft(
          cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
        ),
      ),
    ),
    // encodeRlp(t.cannon.gameId),
    cannon.destinationChain.disputeGameFactory.storageProof,
    cannon.destinationChain.disputeGameFactory.stateRoot,
  )
  console.log('Proved DisputeGameFactory StorageProof')
  // Prove DisputeGameFactory AccountProof
  console.log(
    'Prove account showing that the above ProveStorage is for a valid WorldState',
  )
  await s.ecoTestNetProverContract.proveAccount(
    cannon.destinationChain.disputeGameFactory.address,
    await s.ecoTestNetProverContract.rlpEncodeDataLibList(
      cannon.destinationChain.disputeGameFactory.contractData,
    ),
    cannon.destinationChain.disputeGameFactory.accountProof,
    cannon.settlementChain.worldStateRoot,
  )
  console.log('Proved DisputeGameFactory AccountProof')
  // Prove FaultDisputeGame Status Storage
  console.log(
    'Prove storage showing the FaultDisputeGame has a status which shows the Defender Won',
  )
  await s.ecoTestNetProverContract.proveStorage(
    cannon.destinationChain.faultDisputeGame.status.storageSlot,
    encodeRlp(
      toBeHex(
        // stripZerosLeft(
        cannon.destinationChain.faultDisputeGame.status.storageData,
        // ),
      ),
    ),
    cannon.destinationChain.faultDisputeGame.status.storageProof,
    cannon.destinationChain.faultDisputeGame.stateRoot,
  )
  console.log('Proved FaultDisputeGame Status Storage')
  // Prove FaultDisputeGame Root Claim Storage
  console.log(
    'Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block',
  )
  console.log(
    'Encoded RLP rootClaim : ',
    encodeRlp(
      toBeHex(
        stripZerosLeft(
          cannon.destinationChain.faultDisputeGame.rootClaim.storageData,
        ),
      ),
    ),
  )
  await s.ecoTestNetProverContract.proveStorage(
    cannon.destinationChain.faultDisputeGame.rootClaim.storageSlot,
    encodeRlp(
      toBeHex(
        stripZerosLeft(
          cannon.destinationChain.faultDisputeGame.rootClaim.storageData,
        ),
      ),
    ),
    // encodeRlp(t.cannon.faultDisputeGameRootClaimStorage),
    cannon.destinationChain.faultDisputeGame.rootClaim.storageProof,
    cannon.destinationChain.faultDisputeGame.stateRoot,
  )
  console.log('Proved FaultDisputeGame Root Claim Storage')
  // Prove FaultDisputeGame AccountProof
  console.log(
    'Prove account showing that the above ProveStorages are for a valid WorldState',
  )
  await s.ecoTestNetProverContract.proveAccount(
    cannon.destinationChain.faultDisputeGame.address,
    await s.ecoTestNetProverContract.rlpEncodeDataLibList(
      cannon.destinationChain.faultDisputeGame.contractData,
    ),
    cannon.destinationChain.faultDisputeGame.accountProof,
    cannon.settlementChain.worldStateRoot,
  )
  console.log('Proved FaultDisputeGame AccountProof')
}

async function proveWorldStateBaseSepoliaOnEcoTestNet() {
  console.log('In proveL2WorldStateBaseSepolia')
  const RLPEncodedBaseSepoliaEndBatchBlock = await getBlockRLPEncodedData()
  console.log(
    'RLPEncodedBaseSepoliaEndBatchBlock: ',
    RLPEncodedBaseSepoliaEndBatchBlock,
  )
  const RLPEncodedDisputeGameFactoryData =
    await s.ecoTestNetProverContract.rlpEncodeDataLibList(
      cannon.destinationChain.disputeGameFactory.contractData,
    )
  // Prove the L2 World State for Cannon
  const disputeGameFactoryProofData = {
    // destinationWorldStateRoot: cannon.destinationChain.endBatchBlockStateRoot,
    messagePasserStateRoot: cannon.destinationChain.messagePasserStateRoot,
    latestBlockHash: cannon.destinationChain.endBatchBlockHash,
    gameIndex:
      cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameIndex,
    // gameId: toBeHex(stripZerosLeft(config.cannon.gameId)),
    gameId: cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
    disputeFaultGameStorageProof:
      cannon.destinationChain.disputeGameFactory.storageProof,
    rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

    disputeGameFactoryAccountProof:
      cannon.destinationChain.disputeGameFactory.accountProof,
  }

  const RLPEncodedFaultDisputeGameData =
    await s.ecoTestNetProverContract.rlpEncodeDataLibList(
      cannon.destinationChain.faultDisputeGame.contractData,
    )
  const faultDisputeGameProofData = {
    faultDisputeGameStateRoot:
      cannon.destinationChain.faultDisputeGame.stateRoot,
    faultDisputeGameRootClaimStorageProof:
      cannon.destinationChain.faultDisputeGame.rootClaim.storageProof,
    faultDisputeGameStatusSlotData: {
      createdAt:
        cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
      resolvedAt:
        cannon.destinationChain.faultDisputeGame.status.storage.resolvedAt,
      gameStatus:
        cannon.destinationChain.faultDisputeGame.status.storage.gameStatus,
      initialized:
        cannon.destinationChain.faultDisputeGame.status.storage.initialized,
      l2BlockNumberChallenged:
        cannon.destinationChain.faultDisputeGame.status.storage
          .l2BlockNumberChallenged,
      // filler: getBytes(
      //   cannon.destinationChain.faultDisputeGame.status.storage.filler,
      // ),
    },
    faultDisputeGameStatusStorageProof:
      cannon.destinationChain.faultDisputeGame.status.storageProof,
    rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
    faultDisputeGameAccountProof:
      cannon.destinationChain.faultDisputeGame.accountProof,
  }
  console.log('about to proveWorldStateCannon')
  await s.ecoTestNetProverContract.proveWorldStateCannon(
    cannon.intent.destinationChainId,
    RLPEncodedBaseSepoliaEndBatchBlock,
    // cannon.intent.rlpEncodedBlockData,
    cannon.destinationChain.endBatchBlockStateRoot,
    disputeGameFactoryProofData,
    faultDisputeGameProofData,
    cannon.settlementChain.worldStateRoot,
  )
  console.log('Proved L2 World State Cannon')
}

async function proveIntentOnEcoTestNet() {
  console.log('In proveIntent')
  console.log('about to proveIntent')

  // Prove the Intent
  await s.baseSepoliaProverContract.proveIntent(
    cannon.intent.destinationChainId,
    actors.claimant,
    // t.intents.optimismSepolia.rlpEncodedBlockData,
    networks.baseSepolia.inboxAddress,
    cannon.intent.intentHash,
    // 1, // no need to be specific about output indexes yet
    cannon.intent.storageProof,
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      cannon.intent.inboxContractData,
    ),
    cannon.intent.accountProof,
    cannon.destinationChain.endBatchBlockStateRoot,
  )
  console.log('Proved Intent')
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
  // let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    console.log('Walkthrough of ECOTestNet to BaseSepolia')
    // get the latest world state
    // const { settlmentBlockTag, settlementWorldStateRoot } =
    //   await proveSettlementLayerState()
    // console.log('settlmentBlockTag: ', settlmentBlockTag)
    // console.log('settlementWorldStateRoot: ', settlementWorldStateRoot)

    // const blockRLPEncodedData = await getBlockRLPEncodedData()
    // const RLPEncodedDisputeGameFactoryData = await getBlockRLPEncodedData()
    // console.log(
    //   'RLPEncodedDisputeGameFactoryData: ',
    //   RLPEncodedDisputeGameFactoryData,
    // )
    // const intentStorageSlot = getIntentStorageSlot(cannon.intent.intentHash)
    // console.log('intentStorageSlot: ', intentStorageSlot)

    // await proveSepoliaSettlementLayerStateOnEcoTestNet()
    // await destinationStateProvingTestsEcoTestNet()
    await proveWorldStateBaseSepoliaOnEcoTestNet()

    // await proveIntent()

    // console.log('about to withdrawReward')
    // // Withdraw the Reward
    // await withdrawReward(cannon.intent.intentHash)
    // console.log('Withdrew Reward')
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
