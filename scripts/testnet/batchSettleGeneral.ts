import {
  AbiCoder,
  Block,
  Contract,
  encodeRlp,
  getAddress,
  getBytes,
  hexlify,
  keccak256,
  solidityPackedKeccak256,
  stripZerosLeft,
  toBeArray,
  toQuantity,
  toNumber,
  zeroPadValue,
  toBeHex,
} from 'ethers'
import {
  networkIds,
  networks,
  actors,
  // intent,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'
import * as FaultDisputeGameArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/FaultDisputeGame.sol/FaultDisputeGame.json'
// import { intent } from '../../test/testData'

type SourceChainInfo = {
  sourceChain: number
  lastProvenBlock: BigInt
  needNewProvenState: boolean
}
// type SourceChains = SourceChainInfo[]

type Intent = {
  sourceChain: number
  intentHash: string
  claimant: string
  blockNumber: BigInt
}
// type Intents = Intent[]

async function getRLPEncodedBlock(block) {
  console.log('In getRLPEncodedBlock')

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
  return rlpEncodedBlockData
}

export async function getBatchSettled() {
  // Get the latest resolved fault dispute game
  // Get the GameId information for the fault dispute game
  // return faultDisputeGame address, gameId, blockNumber
  // Recommend making approximateUnsettledGames configurable and could go as high as 84 but safest is zero.
  console.log('In getFaultDisputeGame')
  const disputeGameFactoryContract = s.sepoliaSettlementContractOptimism
  const approximateUnsettledGames = 320n // Initial Test on Sepolia gave 327
  let gameIndex =
    (await disputeGameFactoryContract.gameCount()) -
    1n -
    approximateUnsettledGames
  // lastGame = 1712n
  console.log('Starting lastGame: ', gameIndex.toString())
  while (gameIndex > 0) {
    const gameData = await disputeGameFactoryContract.gameAtIndex(gameIndex)
    const faultDisputeGameAddress = gameData.proxy_
    const faultDisputeGameContract = new Contract(
      faultDisputeGameAddress,
      FaultDisputeGameArtifact.abi,
      s.sepoliaProvider,
    )
    const faultDisputeGameResolvedEvents =
      await faultDisputeGameContract.queryFilter(
        faultDisputeGameContract.getEvent('Resolved'),
      )
    if (faultDisputeGameResolvedEvents.length !== 0) {
      const blockNumber = await faultDisputeGameContract.l2BlockNumber()
      return {
        blockNumber,
        gameIndex,
        faultDisputeGameAddress,
        faultDisputeGameContract,
      }
    }
    gameIndex -= 1n
  }
}
export async function getIntentsToProve(
  settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  const sourceChainConfig = networks.optimismSepolia.sourceChains
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let optimismSepoliaProvenState
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber =
    networks.optimismSepolia.proverContract.deploymentBlock || 0n
  const inboxDeploymentBlock = networks.optimismSepolia.inbox.deploymentBlock
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      optimismSepoliaProvenState = await proverContract.provenStates(
        // await s.[sourceChain]ProverContract.provenStates(
        networkIds.optimismSepolia,
      )
      console.log('sourceChain: ', sourceChain)
      console.log('networkIds.sourceChain: ', networkIds[sourceChain])
      sourceChainInfo.lastProvenBlock = optimismSepoliaProvenState.blockNumber
      if (proveAll) {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        sourceChainInfo.needNewProvenState = true
        startingBlockNumber = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      } else {
        if (optimismSepoliaProvenState.blockNumber > inboxDeploymentBlock) {
          sourceChainInfo.lastProvenBlock =
            optimismSepoliaProvenState.blockNumber
          if (optimismSepoliaProvenState.blockNumber < startingBlockNumber) {
            startingBlockNumber = optimismSepoliaProvenState.blockNumber
          }
        } else {
          sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
          scanAllIntentsForInbox = true
        }
      }
      sourceChainInfo.needNewProvenState = false
      sourceChains[networkIds[sourceChain]] = sourceChainInfo
    } catch (e) {
      sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
      sourceChainInfo.needNewProvenState = false
      sourceChains[networkIds[sourceChain]] = sourceChainInfo
      scanAllIntentsForInbox = true
      startingBlockNumber = inboxDeploymentBlock
      console.log('Error in getIntentsToProve: ', e.message)
    }
  }
  if (scanAllIntentsForInbox) {
    startingBlockNumber = inboxDeploymentBlock
  }
  // console.log('sourceChains: ', sourceChains)
  console.log('startingBlockNumber: ', startingBlockNumber.toString())
  console.log('settlementBlockNumber: ', settlementBlockNumber.toString())

  //   if (optimismSepoliaBlockNumber > settlementBlockNumber) {
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents =
    await s.optimismSepoliaInboxContractSolver.queryFilter(
      s.optimismSepoliaInboxContractSolver.getEvent('Fulfillment'),
      toQuantity(startingBlockNumber),
      toQuantity(settlementBlockNumber),
    )
  console.log('intentHashEvents.length: ', intentHashEvents.length)
  // Filter out intents that have already been proven
  // Note this can use the proventStates from the Prover Contract
  // but also need to cater for the case where the proven World state is updated but the intents not proven
  // also mark needProvenState as true for the chains which have new intents to prove
  const intentsToProve = intentHashEvents
    .map((intentHashEvent) => {
      const intentToProve: Intent = {} as Intent
      intentToProve.sourceChain = toNumber(intentHashEvent.topics[2])
      intentToProve.intentHash = intentHashEvent.topics[1]
      intentToProve.claimant = getAddress(
        stripZerosLeft(intentHashEvent.topics[3]),
      )
      intentToProve.blockNumber = BigInt(intentHashEvent.blockNumber)
      return intentToProve
    })
    .filter((intentToProve) => {
      if (
        intentToProve.blockNumber >
          sourceChains[intentToProve.sourceChain].lastProvenBlock &&
        intentToProve.blockNumber <= settlementBlockNumber
      ) {
        sourceChains[intentToProve.sourceChain].needNewProvenState = true
      }
      // False removes it true keeps it
      return (
        intentToProve.blockNumber >
        sourceChains[intentToProve.sourceChain].lastProvenBlock
      )
    })

  console.log('sourceChains: ', sourceChains)
  console.log('intentsToProve: ', intentsToProve)
  return { sourceChains, intentsToProve }
  // return [chainId, intentHash, intentFulfillTransaction]
}

// Include individual proving Mechanisms for each sourceChain
// TODO: Consolidate the multiple functions into a parameterized function
async function proveSepoliaSettlementLayerStateOnBaseSepolia() {
  console.log('In proveSettlementLayerState on BaseSepolia')
  const setlementBlock = await s.baseSepolial1Block.number()
  const settlementBlockTag = toQuantity(setlementBlock)

  const block: Block = await s.sepoliaProvider.send('eth_getBlockByNumber', [
    settlementBlockTag,
    false,
  ])
  // const block: Block = await s.layer2DestinationProvider.send(
  //   'eth_getBlockByNumber',
  //   [config.cannon.layer2.endBatchBlock, false],
  // )
  // console.log('block: ', block)

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
    // console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)
    tx = await s.baseSepoliaProverContract.proveSettlementLayerState(
      getBytes(hexlify(rlpEncodedBlockData)),
    )
    await tx.wait()
    console.log('Prove Settlement world state tx: ', tx.hash)
    settlementWorldStateRoot = block.stateRoot
    console.log(
      'Proven L1 world state block: ',
      setlementBlock,
      settlementBlockTag,
    )
    console.log('Proven Settlement world state root:', settlementWorldStateRoot)
    return { settlementBlockTag, settlementWorldStateRoot }
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(
        `Error in proveSettlementLayerState BaseSepolia:`,
        e.shortMessage,
      )
    } else {
      console.log(`Error in proveSettlementLayerState BaseSepolia:`, e)
    }
  }
  //   have successfully proven L1 state
}

async function proveSepoliaSettlementLayerStateOnEcoTestnet() {
  console.log('In proveSepoliaSettlementLayerStateOnEcoTestnet')
  const setlementBlock = await s.baseSepolial1Block.number()
  const settlementBlockTag = toQuantity(setlementBlock)

  const block: Block = await s.sepoliaProvider.send('eth_getBlockByNumber', [
    settlementBlockTag,
    false,
  ])

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
    // console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)
    tx = await s.ecoTestnetProverContract.proveSettlementLayerStatePriveleged(
      getBytes(hexlify(rlpEncodedBlockData)),
      networkIds.sepolia,
    )
    await tx.wait()
    console.log('Prove Settlement world state tx: ', tx.hash)
    settlementWorldStateRoot = block.stateRoot
    console.log(
      'Proven L1 world state block: ',
      setlementBlock,
      settlementBlockTag,
    )
    console.log('Proven Settlement world state root:', settlementWorldStateRoot)
    return { settlementBlockTag, settlementWorldStateRoot }
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(
        `Error in proveSettlementLayerState EcoTestnet:`,
        e.shortMessage,
      )
    } else {
      console.log(`Error in proveSettlementLayerState EcoTestnet:`, e)
    }
  }
  //   have successfully proven L1 state
}

async function proveWorldStateOptimismSepoliaOnEcoTestnet(
  settlementBlockTag,
  settlementStateRoot,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  gameIndex,
) {
  console.log('In proveWorldStateCannonBaseToEcoTestnet')
  // For more information on how DisputeGameFactory utility functions, see the following code
  // https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/lib/LibUDT.sol#L82
  // get the endBatchBlockData

  // Note: For all proofs we use two block numbers
  // For anything related to the settlement chain we use settlementBlockTag
  // For anything related to the destination chain we use endBatchBlockHex
  // Get the faultDisputeGame game data
  const faultDisputeGameData = await faultDisputeGameContract.gameData()
  const faultDisputeGameCreatedAt = await faultDisputeGameContract.createdAt()
  const faultDisputeGameResolvedAt = await faultDisputeGameContract.resolvedAt()
  const faultDisputeGameGameStatus = await faultDisputeGameContract.status()
  const faultDisputeGameInitialized = true
  const faultDisputeGameL2BlockNumberChallenged = false
  const faultDisputeGameL2BlockNumber =
    await faultDisputeGameContract.l2BlockNumber()
  const endBatchBlockHex = toQuantity(faultDisputeGameL2BlockNumber)
  const endBatchBlockData = await s.optimismSepoliaProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedEndBatchBlockData =
    await getRLPEncodedBlock(endBatchBlockData)

  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.optimismSepoliaProvider.send(
    'eth_getProof',
    [
      networks.optimismSepolia.proving.l2l1MessageParserAddress,
      [],
      endBatchBlockHex,
    ],
  )

  // Get the DisputeGameFactory data GameId
  const faultDisputeGameId = await s.ecoTestnetProverContract.pack(
    faultDisputeGameData.gameType_,
    faultDisputeGameCreatedAt,
    faultDisputeGameAddress,
  )

  // disputeGameFactoryStorageSlot is where the gameId is stored
  // In solidity
  // uint256(keccak256(abi.encode(L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER)))
  //                       + disputeGameFactoryProofData.gameIndex
  const disputeGameFactorySlotNumber = 104
  const disputeGameFactoryGameIndex = gameIndex
  const arrayLengthSlot = zeroPadValue(
    toBeArray(disputeGameFactorySlotNumber),
    32,
  )
  const firstElementSlot = solidityPackedKeccak256(
    ['bytes32'],
    [arrayLengthSlot],
  )
  const disputeGameFactoryStorageSlot = toBeHex(
    BigInt(firstElementSlot) + BigInt(Number(disputeGameFactoryGameIndex)),
    32,
  )
  const disputeGameFactoryProof = await s.sepoliaProvider.send('eth_getProof', [
    networks.sepolia.settlementContracts.optimismSepolia,
    [disputeGameFactoryStorageSlot],
    settlementBlockTag,
  ])
  const disputeGameFactoryContractData = [
    toBeHex(disputeGameFactoryProof.nonce), // nonce
    stripZerosLeft(toBeHex(disputeGameFactoryProof.balance)), // balance
    disputeGameFactoryProof.storageHash, // storageHash
    disputeGameFactoryProof.codeHash, // CodeHash
  ]
  const RLPEncodedDisputeGameFactoryData =
    await s.ecoTestnetProverContract.rlpEncodeDataLibList(
      disputeGameFactoryContractData,
    )
  // populate fields for the DisputeGameFactory proof
  const disputeGameFactoryProofData = {
    messagePasserStateRoot: l2MesagePasserProof.storageHash,
    latestBlockHash: endBatchBlockData.hash,
    gameIndex: disputeGameFactoryGameIndex,
    gameId: faultDisputeGameId,
    disputeFaultGameStorageProof: disputeGameFactoryProof.storageProof[0].proof,
    rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,
    disputeGameFactoryAccountProof: disputeGameFactoryProof.accountProof,
  }

  // populate fields for the FaultDisputeGame rootclaim proof
  // Storage proof for faultDisputeGame root claim
  // rootClaimSlot - hardcooded value for the slot which is a keecak256 hash  the slot for rootClaim
  const zeroSlot = solidityPackedKeccak256(
    ['bytes32'],
    [zeroPadValue(toBeArray(0), 32)],
  )
  console.log('zeroSlot: ', zeroSlot)

  const faultDisputeGameRootClaimStorageSlot =
    '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1'
  console.log('faultDisputeGameAddress: ', faultDisputeGameAddress)
  console.log('settlementBlockTag: ', settlementBlockTag)
  const faultDisputeGameRootClaimProof = await s.sepoliaProvider.send(
    'eth_getProof',
    [
      faultDisputeGameAddress,
      [faultDisputeGameRootClaimStorageSlot],
      settlementBlockTag,
    ],
  )
  // Storage proof for faultDisputeGame resolved
  // rootClaimSlot - hardcoded value for slot zero which is where the status is stored
  const faultDisputeGameResolvedStorageSlot =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  // '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1'
  const faultDisputeGameRootResolvedProof = await s.sepoliaProvider.send(
    'eth_getProof',
    [
      faultDisputeGameAddress,
      [faultDisputeGameResolvedStorageSlot],
      settlementBlockTag,
    ],
  )
  const faultDisputeGameContractData = [
    toBeHex(faultDisputeGameRootClaimProof.nonce), // nonce
    stripZerosLeft(toBeHex(faultDisputeGameRootClaimProof.balance)), // balance
    faultDisputeGameRootClaimProof.storageHash, // storageHash
    faultDisputeGameRootClaimProof.codeHash, // CodeHash
  ]
  const RLPEncodedFaultDisputeGameContractData =
    await s.ecoTestnetProverContract.rlpEncodeDataLibList(
      faultDisputeGameContractData,
    )
  const faultDisputeGameProofData = {
    // faultDisputeGameStateRoot: endBatchBlockData.stateRoot,
    faultDisputeGameStateRoot: faultDisputeGameRootClaimProof.storageHash,
    faultDisputeGameRootClaimStorageProof:
      faultDisputeGameRootClaimProof.storageProof[0].proof,
    faultDisputeGameStatusSlotData: {
      createdAt: faultDisputeGameCreatedAt,
      resolvedAt: faultDisputeGameResolvedAt,
      gameStatus: faultDisputeGameGameStatus,
      initialized: faultDisputeGameInitialized,
      l2BlockNumberChallenged: faultDisputeGameL2BlockNumberChallenged,
    },
    // populate fields for the FaultDisputeGame resolved proof
    faultDisputeGameStatusStorageProof:
      faultDisputeGameRootResolvedProof.storageProof[0].proof,
    rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameContractData,
    faultDisputeGameAccountProof: faultDisputeGameRootClaimProof.accountProof,
  }

  // try {
  // Note: ProveStorage and ProveAccount are pure functions and included here just for unit testing
  const { gameProxy_ } = await s.ecoTestnetProverContract.unpack(
    disputeGameFactoryProofData.gameId,
  )
  // proveStorageDisputeGameFactory
  await s.ecoTestnetProverContract.proveStorage(
    disputeGameFactoryStorageSlot,
    encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameId))),
    // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
    disputeGameFactoryProof.storageProof[0].proof,
    disputeGameFactoryProof.storageHash,
  )
  // proveAccountDisputeGameFactory
  await s.ecoTestnetProverContract.proveAccount(
    networks.sepolia.settlementContracts.optimismSepolia,
    disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData,
    disputeGameFactoryProofData.disputeGameFactoryAccountProof,
    settlementStateRoot,
  )
  // proveStorageFaultDisputeGameRootClaim
  await s.ecoTestnetProverContract.proveStorage(
    faultDisputeGameRootClaimStorageSlot,
    encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameData.rootClaim_))),
    // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
    faultDisputeGameRootClaimProof.storageProof[0].proof,
    faultDisputeGameRootClaimProof.storageHash,
  )
  // proveStorageFaultDisputeGameResolved
  console.log(
    'faultDisputeGameResolvedStorageSlot: ',
    faultDisputeGameResolvedStorageSlot,
  )
  await s.ecoTestnetProverContract.proveStorage(
    faultDisputeGameResolvedStorageSlot,
    await s.ecoTestnetProverContract.assembleGameStatusStorage(
      faultDisputeGameCreatedAt,
      faultDisputeGameResolvedAt,
      faultDisputeGameGameStatus,
      faultDisputeGameInitialized,
      faultDisputeGameL2BlockNumberChallenged,
    ),
    faultDisputeGameRootResolvedProof.storageProof[0].proof,
    faultDisputeGameRootResolvedProof.storageHash,
  )
  // proveAccountFaultDisputeGame
  await s.ecoTestnetProverContract.proveAccount(
    // faultDisputeGameAddress,
    // '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
    gameProxy_,
    faultDisputeGameProofData.rlpEncodedFaultDisputeGameData,
    faultDisputeGameProofData.faultDisputeGameAccountProof,
    settlementStateRoot,
  )
  try {
    // console.log('proveWorldStateCannon')
    const proveWorldStateCannonTx =
      await s.ecoTestnetProverContract.proveWorldStateCannon(
        networkIds.optimismSepolia,
        rlpEncodedEndBatchBlockData,
        endBatchBlockData.stateRoot,
        disputeGameFactoryProofData,
        faultDisputeGameProofData,
        settlementStateRoot,
      )
    await proveWorldStateCannonTx.wait()
    console.log('ProveWorldStateCannon Base to Optimism')
    return endBatchBlockData
  } catch (e) {
    if (e.data && s.ecoTestnetProverContract) {
      const decodedError = s.ecoTestnetProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in ProveWorldStateCannon ecoTestnet:`, e.shortMessage)
    } else {
      console.log(`Error in ProveWorldStateCannon ecoTestnet:`, e)
    }
  }
}

async function proveWorldStateOptimismSepoliaOnBaseSepolia(
  settlementBlockTag,
  settlementStateRoot,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  gameIndex,
) {
  console.log('In proveWorldStateCannonBaseToBaseSepolia')
  // For more information on how DisputeGameFactory utility functions, see the following code
  // https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/lib/LibUDT.sol#L82
  // get the endBatchBlockData

  // Note: For all proofs we use two block numbers
  // For anything related to the settlement chain we use settlementBlockTag
  // For anything related to the destination chain we use endBatchBlockHex
  // Get the faultDisputeGame game data
  const faultDisputeGameData = await faultDisputeGameContract.gameData()
  const faultDisputeGameCreatedAt = await faultDisputeGameContract.createdAt()
  const faultDisputeGameResolvedAt = await faultDisputeGameContract.resolvedAt()
  const faultDisputeGameGameStatus = await faultDisputeGameContract.status()
  const faultDisputeGameInitialized = true
  const faultDisputeGameL2BlockNumberChallenged = false
  const faultDisputeGameL2BlockNumber =
    await faultDisputeGameContract.l2BlockNumber()
  const endBatchBlockHex = toQuantity(faultDisputeGameL2BlockNumber)
  const endBatchBlockData = await s.optimismSepoliaProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedEndBatchBlockData =
    await getRLPEncodedBlock(endBatchBlockData)

  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.optimismSepoliaProvider.send(
    'eth_getProof',
    [
      networks.optimismSepolia.proving.l2l1MessageParserAddress,
      [],
      endBatchBlockHex,
    ],
  )

  // Get the DisputeGameFactory data GameId
  const faultDisputeGameId = await s.baseSepoliaProverContract.pack(
    faultDisputeGameData.gameType_,
    faultDisputeGameCreatedAt,
    faultDisputeGameAddress,
  )

  // disputeGameFactoryStorageSlot is where the gameId is stored
  // In solidity
  // uint256(keccak256(abi.encode(L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER)))
  //                       + disputeGameFactoryProofData.gameIndex
  const disputeGameFactorySlotNumber = 104
  const disputeGameFactoryGameIndex = gameIndex
  const arrayLengthSlot = zeroPadValue(
    toBeArray(disputeGameFactorySlotNumber),
    32,
  )
  const firstElementSlot = solidityPackedKeccak256(
    ['bytes32'],
    [arrayLengthSlot],
  )
  const disputeGameFactoryStorageSlot = toBeHex(
    BigInt(firstElementSlot) + BigInt(Number(disputeGameFactoryGameIndex)),
    32,
  )
  const disputeGameFactoryProof = await s.sepoliaProvider.send('eth_getProof', [
    networks.sepolia.settlementContracts.optimismSepolia,
    [disputeGameFactoryStorageSlot],
    settlementBlockTag,
  ])
  const disputeGameFactoryContractData = [
    toBeHex(disputeGameFactoryProof.nonce), // nonce
    stripZerosLeft(toBeHex(disputeGameFactoryProof.balance)), // balance
    disputeGameFactoryProof.storageHash, // storageHash
    disputeGameFactoryProof.codeHash, // CodeHash
  ]
  const RLPEncodedDisputeGameFactoryData =
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      disputeGameFactoryContractData,
    )
  // populate fields for the DisputeGameFactory proof
  const disputeGameFactoryProofData = {
    messagePasserStateRoot: l2MesagePasserProof.storageHash,
    latestBlockHash: endBatchBlockData.hash,
    gameIndex: disputeGameFactoryGameIndex,
    gameId: faultDisputeGameId,
    disputeFaultGameStorageProof: disputeGameFactoryProof.storageProof[0].proof,
    rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,
    disputeGameFactoryAccountProof: disputeGameFactoryProof.accountProof,
  }

  // populate fields for the FaultDisputeGame rootclaim proof
  // Storage proof for faultDisputeGame root claim
  // rootClaimSlot - hardcooded value for the slot which is a keecak256 hash  the slot for rootClaim
  const zeroSlot = solidityPackedKeccak256(
    ['bytes32'],
    [zeroPadValue(toBeArray(0), 32)],
  )
  console.log('zeroSlot: ', zeroSlot)

  const faultDisputeGameRootClaimStorageSlot =
    '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1'
  console.log('faultDisputeGameAddress: ', faultDisputeGameAddress)
  console.log('settlementBlockTag: ', settlementBlockTag)
  const faultDisputeGameRootClaimProof = await s.sepoliaProvider.send(
    'eth_getProof',
    [
      faultDisputeGameAddress,
      [faultDisputeGameRootClaimStorageSlot],
      settlementBlockTag,
    ],
  )
  // Storage proof for faultDisputeGame resolved
  // rootClaimSlot - hardcoded value for slot zero which is where the status is stored
  const faultDisputeGameResolvedStorageSlot =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  // '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1'
  const faultDisputeGameRootResolvedProof = await s.sepoliaProvider.send(
    'eth_getProof',
    [
      faultDisputeGameAddress,
      [faultDisputeGameResolvedStorageSlot],
      settlementBlockTag,
    ],
  )
  const faultDisputeGameContractData = [
    toBeHex(faultDisputeGameRootClaimProof.nonce), // nonce
    stripZerosLeft(toBeHex(faultDisputeGameRootClaimProof.balance)), // balance
    faultDisputeGameRootClaimProof.storageHash, // storageHash
    faultDisputeGameRootClaimProof.codeHash, // CodeHash
  ]
  const RLPEncodedFaultDisputeGameContractData =
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
      faultDisputeGameContractData,
    )
  const faultDisputeGameProofData = {
    // faultDisputeGameStateRoot: endBatchBlockData.stateRoot,
    faultDisputeGameStateRoot: faultDisputeGameRootClaimProof.storageHash,
    faultDisputeGameRootClaimStorageProof:
      faultDisputeGameRootClaimProof.storageProof[0].proof,
    faultDisputeGameStatusSlotData: {
      createdAt: faultDisputeGameCreatedAt,
      resolvedAt: faultDisputeGameResolvedAt,
      gameStatus: faultDisputeGameGameStatus,
      initialized: faultDisputeGameInitialized,
      l2BlockNumberChallenged: faultDisputeGameL2BlockNumberChallenged,
    },
    // populate fields for the FaultDisputeGame resolved proof
    faultDisputeGameStatusStorageProof:
      faultDisputeGameRootResolvedProof.storageProof[0].proof,
    rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameContractData,
    faultDisputeGameAccountProof: faultDisputeGameRootClaimProof.accountProof,
  }

  // try {
  // Note: ProveStorage and ProveAccount are pure functions and included here just for unit testing
  const { gameProxy_ } = await s.baseSepoliaProverContract.unpack(
    disputeGameFactoryProofData.gameId,
  )
  // proveStorageDisputeGameFactory
  await s.baseSepoliaProverContract.proveStorage(
    disputeGameFactoryStorageSlot,
    encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameId))),
    // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
    disputeGameFactoryProof.storageProof[0].proof,
    disputeGameFactoryProof.storageHash,
  )
  // proveAccountDisputeGameFactory
  await s.baseSepoliaProverContract.proveAccount(
    networks.sepolia.settlementContracts.optimismSepolia,
    disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData,
    disputeGameFactoryProofData.disputeGameFactoryAccountProof,
    settlementStateRoot,
  )
  // proveStorageFaultDisputeGameRootClaim
  await s.baseSepoliaProverContract.proveStorage(
    faultDisputeGameRootClaimStorageSlot,
    encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameData.rootClaim_))),
    // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
    faultDisputeGameRootClaimProof.storageProof[0].proof,
    faultDisputeGameRootClaimProof.storageHash,
  )
  // proveStorageFaultDisputeGameResolved
  console.log(
    'faultDisputeGameResolvedStorageSlot: ',
    faultDisputeGameResolvedStorageSlot,
  )
  await s.baseSepoliaProverContract.proveStorage(
    faultDisputeGameResolvedStorageSlot,
    await s.baseSepoliaProverContract.assembleGameStatusStorage(
      faultDisputeGameCreatedAt,
      faultDisputeGameResolvedAt,
      faultDisputeGameGameStatus,
      faultDisputeGameInitialized,
      faultDisputeGameL2BlockNumberChallenged,
    ),
    faultDisputeGameRootResolvedProof.storageProof[0].proof,
    faultDisputeGameRootResolvedProof.storageHash,
  )
  // proveAccountFaultDisputeGame
  await s.baseSepoliaProverContract.proveAccount(
    // faultDisputeGameAddress,
    // '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
    gameProxy_,
    faultDisputeGameProofData.rlpEncodedFaultDisputeGameData,
    faultDisputeGameProofData.faultDisputeGameAccountProof,
    settlementStateRoot,
  )
  try {
    // console.log('proveWorldStateCannon')
    const proveWorldStateCannonTx =
      await s.baseSepoliaProverContract.proveWorldStateCannon(
        networkIds.optimismSepolia,
        rlpEncodedEndBatchBlockData,
        endBatchBlockData.stateRoot,
        disputeGameFactoryProofData,
        faultDisputeGameProofData,
        settlementStateRoot,
      )
    await proveWorldStateCannonTx.wait()
    console.log('ProveWorldStateCannon Base to Optimism')
    return endBatchBlockData
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in ProveWorldStateCannon baseSepolia:`, e.shortMessage)
    } else {
      console.log(`Error in ProveWorldStateCannon baseSepolia:`, e)
    }
  }
}

async function proveWorldStatesCannonL2L3(
  faultDisputeGameAddress,
  faultDisputeGameContract,
  gameIndex,
) {
  console.log('In proveWorldStatesCannonL2L3')
  const { settlementBlockTag, settlementWorldStateRoot } =
    await proveSepoliaSettlementLayerStateOnEcoTestnet() // Prove the Sepolia Settlement Layer State

  const endBatchBlockData = await proveWorldStateOptimismSepoliaOnEcoTestnet(
    settlementBlockTag,
    settlementWorldStateRoot,
    faultDisputeGameAddress,
    faultDisputeGameContract,
    gameIndex,
  )
  return endBatchBlockData
}

async function proveWorldStatesCannon(
  faultDisputeGameAddress,
  faultDisputeGameContract,
  gameIndex,
) {
  console.log('In proveWorldStatesCannon')
  const { settlementBlockTag, settlementWorldStateRoot } =
    await proveSepoliaSettlementLayerStateOnBaseSepolia() // Prove the Sepolia Settlement Layer State

  const endBatchBlockData = await proveWorldStateOptimismSepoliaOnBaseSepolia(
    settlementBlockTag,
    settlementWorldStateRoot,
    faultDisputeGameAddress,
    faultDisputeGameContract,
    gameIndex,
  )
  return endBatchBlockData
}

export async function proveDestinationChainBatchSettled(
  gameIndex,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  sourceChains,
) {
  console.log('In proveDestinationChainBatchSettled')
  let endBatchBlockData
  await Promise.all(
    await Object.entries(sourceChains).map(
      async ([sourceChainkey, sourceChain]) => {
        console.log('key: ', sourceChainkey)
        console.log('sourceChain: ', sourceChain)
        if (sourceChain.needNewProvenState) {
          // TODO: remove switch statement and use the sourceChain Layer to get the correct proving mechanism
          switch (sourceChain.sourceChain) {
            case networkIds.baseSepolia: {
              console.log('In baseSepolia proveDestinationChainBatchSettled')
              endBatchBlockData = await proveWorldStatesCannon(
                faultDisputeGameAddress,
                faultDisputeGameContract,
                gameIndex,
              )
              console.log('baseSepolia endBatchBlockData: ', endBatchBlockData)
              break
            }
            case networkIds.optimismSepolia: {
              console.log(
                'In optimismSepolia proveDestinationChainBatchSettled',
              )
              break
            }
            case networkIds.ecoTestnet: {
              console.log('In ecoTestnet')
              endBatchBlockData = await proveWorldStatesCannonL2L3(
                faultDisputeGameAddress,
                faultDisputeGameContract,
                gameIndex,
              )
              console.log('ecoTestnet endBatchBlockData: ', endBatchBlockData)
              break
            }
            default: {
              break
            }
          }
        }
      },
    ),
  )
  return endBatchBlockData
}

async function proveIntentBaseSepolia(intentHash, endBatchBlockData) {
  console.log('In proveIntentBaseSepolia')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  console.log(
    'networks.optimismSepolia.inbox.address: ',
    networks.optimismSepolia.inbox.address,
  )
  console.log('inboxStorageSlot: ', inboxStorageSlot)
  console.log('endBatchBlockData.number: ', endBatchBlockData.number)
  const intentInboxProof = await s.optimismSepoliaProvider.send(
    'eth_getProof',
    [
      networks.optimismSepolia.inbox.address,
      [inboxStorageSlot],
      endBatchBlockData.number,
    ],
  )

  const intentInfo =
    await s.baseSepoliaIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.baseSepolia, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    console.log('Proving Intent')
    console.log('networkIds.optimismSepolia: ', networkIds.optimismSepolia)
    console.log('actors.claimant: ', actors.claimant)
    console.log(
      'networks.optimismSepolia.inbox.address: ',
      networks.optimismSepolia.inbox.address,
    )
    console.log('intermediateHash: ', intermediateHash)
    console.log(
      'intentInboxProof.storageProof[0].proof: ',
      intentInboxProof.storageProof[0].proof,
    )
    console.log(
      'baseProverContract.rlpEncodeDataLibList: ',
      await s.baseSepoliaProverContract.rlpEncodeDataLibList([
        toBeHex(intentInboxProof.nonce), // nonce
        stripZerosLeft(toBeHex(intentInboxProof.balance)),
        intentInboxProof.storageHash,
        intentInboxProof.codeHash,
      ]),
    )
    console.log('endBatchBlockData.stateRoot: ', endBatchBlockData.stateRoot)
    const proveIntentTx = await s.baseSepoliaProverContract.proveIntent(
      networkIds.optimismSepolia,
      actors.claimant,
      networks.optimismSepolia.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.baseSepoliaProverContract.rlpEncodeDataLibList([
        toBeHex(intentInboxProof.nonce), // nonce
        stripZerosLeft(toBeHex(intentInboxProof.balance)),
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
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed in proveIntent : ${decodedError?.name}`)
      console.log('proveIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in proveIntent:`, e)
    }
  }
}

async function proveIntentEcoTestnet(intentHash, endBatchBlockData) {
  console.log('In proveIntentEcoTestnet')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  console.log(
    'networks.optimismSepolia.inbox.address: ',
    networks.optimismSepolia.inbox.address,
  )
  console.log('inboxStorageSlot: ', inboxStorageSlot)
  console.log('endBatchBlockData.number: ', endBatchBlockData.number)
  const intentInboxProof = await s.optimismSepoliaProvider.send(
    'eth_getProof',
    [
      networks.optimismSepolia.inbox.address,
      [inboxStorageSlot],
      endBatchBlockData.number,
    ],
  )

  const intentInfo =
    await s.ecoTestnetIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.ecoTestnet, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    console.log('Proving Intent')
    console.log('networkIds.optimismSepolia: ', networkIds.optimismSepolia)
    console.log('actors.claimant: ', actors.claimant)
    console.log(
      'networks.optimismSepolia.inbox.address: ',
      networks.optimismSepolia.inbox.address,
    )
    console.log('intermediateHash: ', intermediateHash)
    console.log(
      'intentInboxProof.storageProof[0].proof: ',
      intentInboxProof.storageProof[0].proof,
    )
    console.log(
      'baseProverContract.rlpEncodeDataLibList: ',
      await s.ecoTestnetProverContract.rlpEncodeDataLibList([
        toBeHex(intentInboxProof.nonce), // nonce
        stripZerosLeft(toBeHex(intentInboxProof.balance)),
        intentInboxProof.storageHash,
        intentInboxProof.codeHash,
      ]),
    )
    console.log('endBatchBlockData.stateRoot: ', endBatchBlockData.stateRoot)
    const proveIntentTx = await s.ecoTestnetProverContract.proveIntent(
      networkIds.optimismSepolia,
      actors.claimant,
      networks.optimismSepolia.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.ecoTestnetProverContract.rlpEncodeDataLibList([
        toBeHex(intentInboxProof.nonce), // nonce
        stripZerosLeft(toBeHex(intentInboxProof.balance)),
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
    if (e.data && s.ecoTestnetProverContract) {
      const decodedError = s.ecoTestnetProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed in proveIntent : ${decodedError?.name}`)
      console.log('proveIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in proveIntent:`, e)
    }
  }
}

export async function proveIntents(intentsToProve, endBatchBlockData) {
  // loop through chainIds and intents
  // prove each intent
  console.log('In proveIntents')
  console.log('intentsToProve: ', intentsToProve)
  // await Promise.all(
  for (const intent of intentsToProve) {
    // await Object.entries(intentsToProve).map(async ([intentKey, intent]) => {
    // console.log('intentKey: ', intentKey)
    console.log('intent: ', intent)
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        await proveIntentBaseSepolia(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.optimismSepolia: {
        break
      }
      case networkIds.ecoTestnet: {
        await proveIntentEcoTestnet(intent.intentHash, endBatchBlockData)
        break
      }
    }
  }
  // }),
  // )
}

async function withdrawRewardBaseSepolia(intentHash) {
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
        s.baseSepoliaIntentSourceContractClaimant.interface.parseError(e.data)
      console.log(
        `Transaction failed in withdrawReward : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in withdrawReward:`, e)
    }
  }
}

async function withdrawRewardEcoTestnet(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.ecoTestnetIntentSourceContractClaimant.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.ecoTestnetIntentSourceContractClaimant) {
      const decodedError =
        s.ecoTestnetIntentSourceContractClaimant.interface.parseError(e.data)
      console.log(
        `Transaction failed in withdrawReward : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in withdrawReward:`, e)
    }
  }
}

export async function withdrawFunds(intentsToProve) {
  console.log('In withdrawFunds')
  for (const intent of intentsToProve) {
    // await Object.entries(intentsToProve).map(async ([intentKey, intent]) => {
    // console.log('intentKey: ', intentKey)
    console.log('intent: ', intent)
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        await withdrawRewardBaseSepolia(intent.intentHash)
        break
      }
      case networkIds.optimismSepolia: {
        break
      }
      case networkIds.ecoTestnet: {
        await withdrawRewardEcoTestnet(intent.intentHash)
        break
      }
    }
  }
}

async function main() {
  const proveAll: boolean = true
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  // let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    // const destinations = await getDestinationChains()
    // await Promise.all(
    //   await Object.entries(destinations).map(
    //     async ([destinationKey, destinationInfo]) => {
    //       await proveAndWithdrawIntentsForDestination(destinationInfo)
    //     },
    //   ),
    // )
    console.log('Batch Settle of OP Sepolia')
    // Get the latest Batch Settled for OP Sepolia
    const {
      blockNumber,
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
    } = await getBatchSettled()
    console.log('blockNumber: ', blockNumber)
    console.log('gameIndex: ', gameIndex.toString())
    console.log('faultDisputeGameAddress: ', faultDisputeGameAddress)

    // Get all the intents that can be proven for the batch by destination chain
    const { sourceChains, intentsToProve } = await getIntentsToProve(
      blockNumber,
      proveAll,
    )
    // Prove the latest batch settled
    const endBatchBlockData = await proveDestinationChainBatchSettled(
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
      sourceChains,
    )
    // Prove all the intents
    console.log('endBatchBlockData: ', endBatchBlockData)
    await proveIntents(intentsToProve, endBatchBlockData)
    await withdrawFunds(intentsToProve)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
