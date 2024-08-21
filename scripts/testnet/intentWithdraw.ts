import {
  AbiCoder,
  Block,
  encodeRlp,
  getBytes,
  getAddress,
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
  bedrock,
  cannon,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'
import { expect } from 'chai'

async function getBlockRLPEncodedData() {
  console.log('In getBlockRLPEncodedData')

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
}

async function getBlockRLPEncodedDataOnBaseSepoliaForEcoTestNet() {
  const blockTag = bedrock.destinationChain.endBatchBlock

  const block: Block = await s.ecoTestNetProvider.send('eth_getBlockByNumber', [
    blockTag,
    false,
  ])
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
}

function getIntentStorageSlot(intentHash) {
  return solidityPackedKeccak256(['bytes32', 'uint256'], [intentHash, 0])
}

// Proving Sepolia State for BaseSepolia on ECOTestNet
async function proveSepoliaSettlementLayerStateOnEcoTestNet() {
  console.log('In proveSepoliaSettlementLayerStateOnEcoTestNet')
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

// Proving Sepolia State for BaseSepolia on BaseSepolia
async function proveSepoliaSettlementLayerStateOnBaseSepolia() {
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
    tx = await s.baseSepoliaProverContract.proveSettlementLayerState(
      getBytes(hexlify(rlpEncodedBlockData)),
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

async function proveWorldStateBaseSepoliaOnBaseSepolia() {
  console.log('In proveL2WorldStateBaseSepolia on BaseSepolia')
  const RLPEncodedBaseSepoliaEndBatchBlock = await getBlockRLPEncodedData()
  console.log(
    'RLPEncodedBaseSepoliaEndBatchBlock: ',
    RLPEncodedBaseSepoliaEndBatchBlock,
  )
  const RLPEncodedDisputeGameFactoryData =
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      bedrock.baseSepolia.disputeGameFactory.contractData,
    )
  // Prove the L2 World State for Cannon
  const disputeGameFactoryProofData = {
    // destinationWorldStateRoot: bedrock.baseSepolia.endBatchBlockStateRoot,
    messagePasserStateRoot: bedrock.baseSepolia.messagePasserStateRoot,
    latestBlockHash: bedrock.baseSepolia.endBatchBlockHash,
    gameIndex:
      bedrock.baseSepolia.disputeGameFactory.faultDisputeGame.gameIndex,
    // gameId: toBeHex(stripZerosLeft(config.cannon.gameId)),
    gameId: bedrock.baseSepolia.disputeGameFactory.faultDisputeGame.gameId,
    disputeFaultGameStorageProof:
      bedrock.baseSepolia.disputeGameFactory.storageProof,
    rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

    disputeGameFactoryAccountProof:
      bedrock.baseSepolia.disputeGameFactory.accountProof,
  }

  const RLPEncodedFaultDisputeGameData =
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      bedrock.baseSepolia.faultDisputeGame.contractData,
    )
  const faultDisputeGameProofData = {
    faultDisputeGameStateRoot: bedrock.baseSepolia.faultDisputeGame.stateRoot,
    faultDisputeGameRootClaimStorageProof:
      bedrock.baseSepolia.faultDisputeGame.rootClaim.storageProof,
    faultDisputeGameStatusSlotData: {
      createdAt: bedrock.baseSepolia.faultDisputeGame.status.storage.createdAt,
      resolvedAt:
        bedrock.baseSepolia.faultDisputeGame.status.storage.resolvedAt,
      gameStatus:
        bedrock.baseSepolia.faultDisputeGame.status.storage.gameStatus,
      initialized:
        bedrock.baseSepolia.faultDisputeGame.status.storage.initialized,
      l2BlockNumberChallenged:
        bedrock.baseSepolia.faultDisputeGame.status.storage
          .l2BlockNumberChallenged,
      // filler: getBytes(
      //   bedrock.baseSepolia.faultDisputeGame.status.storage.filler,
      // ),
    },
    faultDisputeGameStatusStorageProof:
      bedrock.baseSepolia.faultDisputeGame.status.storageProof,
    rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
    faultDisputeGameAccountProof:
      bedrock.baseSepolia.faultDisputeGame.accountProof,
  }
  console.log('about to proveWorldStateCannon')
  await s.baseSepoliaProverContract.proveWorldStateCannon(
    cannon.intent.destinationChainId,
    RLPEncodedBaseSepoliaEndBatchBlock,
    // cannon.intent.rlpEncodedBlockData,
    bedrock.baseSepolia.endBatchBlockStateRoot,
    disputeGameFactoryProofData,
    faultDisputeGameProofData,
    bedrock.settlementChain.worldStateRoot,
  )
  console.log('Proved L2 World State Cannon on BaseSepolia')
}

// Prove Destination State of EcoTestNet on BaseSepolia (Intents from BaseSepolia to EcoTestNet)
async function destinationStateProvingTestsBaseSepolia() {
  const outputRoot = solidityPackedKeccak256(
    ['uint256', 'bytes32', 'bytes32', 'bytes32'],
    [
      0,
      bedrock.destinationChain.worldStateRoot,
      bedrock.destinationChain.messageParserStateRoot,
      bedrock.destinationChain.endBatchBlockHash,
      // '0x0df68f220b56ca051718e18e243769fae3296859243b8cf391b9198314f7eef8',
      // '0x0dad8f82574fb890e31def513e65431fae8b7d253769c7b8a8f89d6f2a06e79c',
      // '0x6e423d26e1beba75c5d8d0f02ad9c8ae7e7085f16419b6fa4a3b9d726e1fe1bc',
    ],
  )
  console.log('outputRoot: ', outputRoot)
  expect(outputRoot).to.equal(
    '0xe9d09cfd1f37fe512729fda2b1f432c752e48c102e0d2f480d6a15478b9e70c3',
  )

  // it('has the correct block hash', async () => {
  //   expect((await blockhashOracle.hash()) === bedrock.settlementChain.blockHash)
  // })

  // it('can prove OuputOracle storage', async () => {
  await s.baseSepoliaProverContract.proveStorage(
    bedrock.baseSepolia.outputOracleStorageSlot,
    // '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
    // '0xa082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d', // prefix wih a0 because it's a 32 byte blob
    '0xa0e9d09cfd1f37fe512729fda2b1f432c752e48c102e0d2f480d6a15478b9e70c3', // prefix wih a0 because it's a 32 byte blob
    // '0xa00c8739e718656a0a335f17e926705b6c50534d4b4304a4609880e11a27f9d02e', // prefix wih a0 because it's a 32 byte blob
    bedrock.baseSepolia.storageProof,
    bedrock.baseSepolia.outputOracleStorageRoot,
  )
  console.log('Proved OutputOracle Storage')
  // })

  // it('can prove OutputOracle account', async () => {
  const val = await s.baseSepoliaProverContract.rlpEncodeDataLibList(
    bedrock.destinationChain.contractData,
  )

  s.baseSepoliaProverContract.proveAccount(
    networks.baseSepolia.settlementContracts.ecoTestNet,
    val,
    bedrock.baseSepolia.accountProof,
    bedrock.baseSepolia.worldStateRoot,
  )
  console.log('Proved OutputOracle Account')
}

async function proveWorldStateBedrockEcoTestNetonBaseSepolia() {
  console.log('In proveWorldStateBedrockEcoTestNetonBaseSepolia')
  const RLPEncodedEcoTestNetEndBatchBlock =
    await getBlockRLPEncodedDataOnBaseSepoliaForEcoTestNet()
  await s.baseSepoliaProverContract.proveWorldStateBedrock(
    bedrock.intent.destinationChainId,
    RLPEncodedEcoTestNetEndBatchBlock,
    bedrock.destinationChain.worldStateRoot,
    bedrock.destinationChain.messageParserStateRoot,
    bedrock.destinationChain.batchIndex,
    bedrock.baseSepolia.storageProof,
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      bedrock.destinationChain.contractData,
    ),
    bedrock.baseSepolia.accountProof,
    bedrock.baseSepolia.worldStateRoot,
  )
  console.log('Proved L2 World State Bedrock EcoTestNet on BaseSepolia')
}

async function proveIntentOnEcoTestNet(intentHash) {
  console.log('In proveIntent')
  console.log('about to proveIntent')
  const intentInfo =
    await s.ecoTestNetIntentSourceContractClaimant.getIntent(intentHash)

  console.log(networkIds.ecoTestNet)
  console.log(cannon.intent.destinationChainId)
  console.log(cannon.intent.targetTokens)
  console.log(getBytes(hexlify(cannon.intent.callData)))
  console.log('callDataRetreived: ', intentInfo[3])
  console.log(cannon.intent.expiryTime)
  console.log(cannon.intent.nonce)
  console.log('End of intermediateHash inputs')
  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.ecoTestNet, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        // getBytes(hexlify(cannon.intent.callData)),
        // getBytes(cannon.intent.callData),
        // getBytes(hexlify(intentInfo[3])),
        intentInfo[3],
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )
  const calcintentHash = keccak256(
    abiCoder.encode(
      ['address', 'bytes32'],
      [networks.baseSepolia.inboxAddress, intermediateHash],
    ),
  )
  console.log('calcintentHash: ', calcintentHash)
  // const intentStorageSlot = keccak256(
  //   abiCoder.encode(['bytes32', 'uint256'], [calcintentHash, 0]),
  // )
  const intentStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [calcintentHash, 1])],
  )
  console.log('intentStorageSlot: ', intentStorageSlot)
  // const intermediateHash = keccak256(
  //   abiCoder.encode(
  //     ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
  //     [
  //       sourceChainID,
  //       (await owner.provider.getNetwork()).chainId,
  //       [erc20Address],
  //       [calldata],
  //       timeStamp,
  //       nonce,
  //     ],
  //   ),

  console.log(cannon.intent.destinationChainId)
  console.log(getAddress(actors.claimant))
  console.log(networks.baseSepolia.inboxAddress)
  console.log(intermediateHash)
  console.log(cannon.intent.storageProof)
  console.log(
    await s.ecoTestNetProverContract.rlpEncodeDataLibList(
      cannon.intent.inboxContractData,
    ),
  )
  console.log(cannon.intent.accountProof)
  console.log(cannon.destinationChain.endBatchBlockStateRoot)
  // Prove the Intent
  await s.ecoTestNetProverContract.proveIntent(
    cannon.intent.destinationChainId,
    getAddress(actors.claimant),
    // t.intents.optimismSepolia.rlpEncodedBlockData,
    networks.baseSepolia.inboxAddress,
    intermediateHash,
    // 1, // no need to be specific about output indexes yet
    cannon.intent.storageProof,
    await s.ecoTestNetProverContract.rlpEncodeDataLibList(
      cannon.intent.inboxContractData,
    ),
    cannon.intent.accountProof,
    cannon.destinationChain.endBatchBlockStateRoot,
  )
  console.log('Proved Intent')
}
async function proveIntentOnBaseSepoliaFromEcoTestNet(intentHash) {
  console.log('In proveIntent on BaseSepolia from EcoTestNet')
  console.log('about to proveIntent')
  const intentInfo =
    await s.baseSepoliaIntentSourceContractClaimant.getIntent(intentHash)

  console.log('End of intermediateHash inputs')
  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.baseSepolia, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        // getBytes(hexlify(cannon.intent.callData)),
        // getBytes(cannon.intent.callData),
        // getBytes(hexlify(intentInfo[3])),
        intentInfo[3],
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )
  console.log('intermediateHash: ', intermediateHash)
  const calcintentHash = keccak256(
    abiCoder.encode(
      ['address', 'bytes32'],
      [networks.ecoTestNet.inboxAddress, intermediateHash],
    ),
  )
  console.log('calcintentHash: ', calcintentHash)
  // const intentStorageSlot = keccak256(
  //   abiCoder.encode(['bytes32', 'uint256'], [calcintentHash, 0]),
  // )
  const intentStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [calcintentHash, 1])],
  )
  console.log('intentStorageSlot: ', intentStorageSlot)

  console.log(bedrock.intent.destinationChainId)
  console.log(getAddress(actors.claimant))
  console.log(networks.ecoTestNet.inboxAddress)
  console.log(intermediateHash)
  console.log(bedrock.intent.storageProof)
  console.log(
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      bedrock.intent.inboxContractData,
    ),
  )
  console.log(bedrock.intent.accountProof)
  console.log(bedrock.intent.endBatchBlockStateRoot)
  // Prove the Intent
  await s.baseSepoliaProverContract.proveIntent(
    bedrock.intent.destinationChainId,
    getAddress(actors.claimant),
    // t.intents.optimismSepolia.rlpEncodedBlockData,
    networks.ecoTestNet.inboxAddress,
    intermediateHash,
    // 1, // no need to be specific about output indexes yet
    bedrock.intent.storageProof,
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      bedrock.intent.inboxContractData,
    ),
    bedrock.intent.accountProof,
    bedrock.intent.endBatchBlockStateRoot,
  )
  console.log('Proved Intent')
}

async function withdrawRewardOnEcoTestNet(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.ecoTestNetIntentSourceContractClaimant.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.ecoTestNetIntentSourceContractClaimant) {
      const decodedError =
        s.ecoTestNetIntentSourceContractClaimant.interface.parseError(e.data)
      console.log(
        `Transaction failed in withdrawReward : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in withdrawReward:`, e)
    }
  }
}

async function withdrawRewardOnBaseSepoliaFromEcoTestNet(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.baseSepoliaIntentSourceContractClaimant.withdrawRewards(
        intentHash,
      )
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.baseSepoliaIntentSourceContractClaimant) {
      const decodedError =
        s.ecoTestNetIntentSourceContractClaimant.interface.parseError(e.data)
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
    console.log('Walkthrough of BaseSepolia to ECOTestNet')
    // get the latest world state
    const { settlmentBlockTag, settlementWorldStateRoot } =
      await proveSepoliaSettlementLayerStateOnEcoTestNet()
    console.log('settlmentBlockTag: ', settlmentBlockTag)
    console.log('settlementWorldStateRoot: ', settlementWorldStateRoot)

    // const blockRLPEncodedData = await getBlockRLPEncodedData()
    const RLPEncodedDisputeGameFactoryData = await getBlockRLPEncodedData()
    console.log(
      'RLPEncodedDisputeGameFactoryData: ',
      RLPEncodedDisputeGameFactoryData,
    )
    const intentStorageSlot = getIntentStorageSlot(cannon.intent.intentHash)
    console.log('intentStorageSlot: ', intentStorageSlot)

    await proveSepoliaSettlementLayerStateOnEcoTestNet()
    await destinationStateProvingTestsEcoTestNet()
    await proveWorldStateBaseSepoliaOnEcoTestNet()

    await proveIntentOnEcoTestNet(cannon.intent.intentHash)

    console.log('about to withdrawReward')
    // Withdraw the Reward
    await withdrawRewardOnEcoTestNet(cannon.intent.intentHash)
    console.log('Withdrew Reward')
    console.log('Walkthrough of ECOTestNet to BaseSepolia')
    await proveSepoliaSettlementLayerStateOnBaseSepolia()
    await proveWorldStateBaseSepoliaOnBaseSepolia()
    console.log('about to proveWorldStateBedrockEcoTestNetonBaseSepolia')
    await destinationStateProvingTestsBaseSepolia()
    await proveWorldStateBedrockEcoTestNetonBaseSepolia()
    console.log('about to proveIntentOnBaseSepoliaFromEcoTestNet')
    await proveIntentOnBaseSepoliaFromEcoTestNet(bedrock.intent.intentHash)
    await proveIntentOnBaseSepoliaFromEcoTestNet(bedrock.intent.intentHash)

    console.log('about to withdrawRewardOnBaseSepoliaFromEcoTestNet')
    await withdrawRewardOnBaseSepoliaFromEcoTestNet(bedrock.intent.intentHash)

    // const RLPEncodedEcoTestNetEndBatchBlock =
    //   await getBlockRLPEncodedDataOnBaseSepoliaForEcoTestNet()
    // console.log(
    //   'RLPEncodedEcoTestNetEndBatchBlock: ',
    //   RLPEncodedEcoTestNetEndBatchBlock,
    // )
    // const RLPEncodedBaseSepoliaEndBatchBlock = await getBlockRLPEncodedData()
    // console.log(
    //   'RLPEncodedBaseSepoliaEndBatchBlock: ',
    //   RLPEncodedBaseSepoliaEndBatchBlock,
    // )
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
