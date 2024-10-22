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
// import { version } from 'os'
// import { latestBlock } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time'
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
  // Get the Latest Batch Settled for BaseSepolia to Ethereum
  // Get the latest resolved fault dispute game
  // Get the GameId information for the fault dispute game
  // return faultDisputeGame address, gameId, blockNumber
  // Recommend making approximateUnsettledGames configurable and could go as high as 84 but safest is zero.
  // Get the Output Index and Block Number from L2 OUTPUT ORACLE that was sent before this block
  console.log('In getBatchSettled')
  const disputeGameFactoryContract = s.sepoliaSettlementContractBase
  const approximateUnsettledGames = 70n // Initial Test on Sepolia gave 327
  let blockNumber, gameIndex, faultDisputeGameAddress, faultDisputeGameContract
  gameIndex =
    (await disputeGameFactoryContract.gameCount()) -
    1n -
    approximateUnsettledGames
  // lastGame = 1712n
  while (gameIndex > 0) {
    const gameData = await disputeGameFactoryContract.gameAtIndex(gameIndex)
    faultDisputeGameAddress = gameData.proxy_
    faultDisputeGameContract = new Contract(
      faultDisputeGameAddress,
      FaultDisputeGameArtifact.abi,
      s.sepoliaProvider,
    )
    const faultDisputeGameResolvedEvents =
      await faultDisputeGameContract.queryFilter(
        faultDisputeGameContract.getEvent('Resolved'),
      )
    if (faultDisputeGameResolvedEvents.length !== 0) {
      blockNumber = await faultDisputeGameContract.l2BlockNumber()
      break
    }
    gameIndex -= 1n
  }
  // Get the Output Index and Block Number from L2 OUTPUT ORACLE that was sent before this block
  // Get the event from the latest Block checking transaction hash
  console.log('BlockNumber from Base L2 OutputOracle: ', blockNumber)
  const l2OutputOracleEvents =
    await s.baseSepoliaSettlementContractEcoTestnet.queryFilter(
      s.baseSepoliaSettlementContractEcoTestnet.getEvent('OutputProposed'),
      toQuantity(blockNumber - 200n),
      toQuantity(blockNumber),
    )
  const l3OutputIndex = toNumber(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[2],
  )
  const l3BlockNumber = BigInt(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[3],
  )

  return {
    blockNumber,
    gameIndex,
    faultDisputeGameAddress,
    faultDisputeGameContract,
    l3OutputIndex,
    l3BlockNumber,
  }
}
export async function getIntentsToProve(
  settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  const sourceChainConfig = networks.ecoTestnet.sourceChains
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let ecoTestnetProvenState
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber = networks.ecoTestnet.inbox.deploymentBlock || 0n
  const inboxDeploymentBlock = networks.ecoTestnet.inbox.deploymentBlock || 0n
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      ecoTestnetProvenState = await proverContract.provenStates(
        networkIds.ecoTestnet,
      )
      sourceChainInfo.lastProvenBlock = ecoTestnetProvenState.blockNumber
      if (proveAll) {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        sourceChainInfo.needNewProvenState = true
        startingBlockNumber = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      } else {
        if (ecoTestnetProvenState.blockNumber > inboxDeploymentBlock) {
          sourceChainInfo.lastProvenBlock = ecoTestnetProvenState.blockNumber
          if (ecoTestnetProvenState.blockNumber < startingBlockNumber) {
            startingBlockNumber = ecoTestnetProvenState.blockNumber
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
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents = await s.ecoTestnetInboxContractSolver.queryFilter(
    s.ecoTestnetInboxContractSolver.getEvent('Fulfillment'),
    toQuantity(startingBlockNumber),
    toQuantity(settlementBlockNumber),
  )
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

  return { sourceChains, intentsToProve }
  // return [chainId, intentHash, intentFulfillTransaction]
}

// Include individual proving Mechanisms for each sourceChain

// TODO: Consolidate the multiple functions into a parameterized function

async function proveSepoliaSettlementLayerStateOnOptimismSepolia() {
  console.log('In proveSettlementLayerState on OptimismSepolia')
  const setlementBlock = await s.optimismSepolial1Block.number()
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
    tx = await s.optimismSepoliaProverContract.proveSettlementLayerState(
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
    console.log(
      'Proven Settlement world state root optimismSepolia:',
      settlementWorldStateRoot,
    )
    return { settlementBlockTag, settlementWorldStateRoot }
  } catch (e) {
    if (e.data && s.optimismSepoliaProverContract) {
      const decodedError = s.optimismSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(
        `Error in proveSettlementLayerState OptimismSepolia:`,
        e.shortMessage,
      )
    } else {
      console.log(`Error in proveSettlementLayerState OptimismSepolia:`, e)
    }
  }
  //   have successfully proven L1 state
}

async function proveWorldStateBaseSepoliaOnOptimismSepolia(
  settlementBlockTag,
  settlementStateRoot,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  gameIndex,
) {
  console.log('In proveWorldStateCannonBaseToOptimismSepolia')
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
  const endBatchBlockData = await s.baseSepoliaProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedEndBatchBlockData =
    await getRLPEncodedBlock(endBatchBlockData)

  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.baseSepoliaProvider.send('eth_getProof', [
    networks.baseSepolia.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])

  // Get the DisputeGameFactory data GameId
  const faultDisputeGameId = await s.optimismSepoliaProverContract.pack(
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
    networks.sepolia.settlementContracts.baseSepolia,
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
    await s.optimismSepoliaProverContract.rlpEncodeDataLibList(
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

  const faultDisputeGameRootClaimStorageSlot =
    '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1'
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
    await s.optimismSepoliaProverContract.rlpEncodeDataLibList(
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
  const { gameProxy_ } = await s.optimismSepoliaProverContract.unpack(
    disputeGameFactoryProofData.gameId,
  )
  // proveStorageDisputeGameFactory
  await s.optimismSepoliaProverContract.proveStorage(
    disputeGameFactoryStorageSlot,
    encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameId))),
    // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
    disputeGameFactoryProof.storageProof[0].proof,
    disputeGameFactoryProof.storageHash,
  )
  // proveAccountDisputeGameFactory
  await s.optimismSepoliaProverContract.proveAccount(
    networks.sepolia.settlementContracts.baseSepolia,
    disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData,
    disputeGameFactoryProofData.disputeGameFactoryAccountProof,
    settlementStateRoot,
  )
  // proveStorageFaultDisputeGameRootClaim
  await s.optimismSepoliaProverContract.proveStorage(
    faultDisputeGameRootClaimStorageSlot,
    encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameData.rootClaim_))),
    // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
    faultDisputeGameRootClaimProof.storageProof[0].proof,
    faultDisputeGameRootClaimProof.storageHash,
  )
  // proveStorageFaultDisputeGameResolved
  await s.optimismSepoliaProverContract.proveStorage(
    faultDisputeGameResolvedStorageSlot,
    await s.optimismSepoliaProverContract.assembleGameStatusStorage(
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
  await s.optimismSepoliaProverContract.proveAccount(
    // faultDisputeGameAddress,
    // '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
    gameProxy_,
    faultDisputeGameProofData.rlpEncodedFaultDisputeGameData,
    faultDisputeGameProofData.faultDisputeGameAccountProof,
    settlementStateRoot,
  )
  try {
    const proveWorldStateCannonTx =
      await s.optimismSepoliaProverContract.proveWorldStateCannon(
        networkIds.baseSepolia,
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
    if (e.data && s.optimismSepoliaProverContract) {
      const decodedError = s.optimismSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in ProveWorldStateCannon baseSepolia:`, e.shortMessage)
    } else {
      console.log(`Error in ProveWorldStateCannon baseSepolia:`, e)
    }
  }
}

async function proveWorldStateBedrockOnOptimismSepoliaforEcoTestnet(
  l3OutputIndex,
  l3BlockNumber,
  settlementBlockTag,
  settlementWorldStateRoot,
) {
  console.log('In proveWorldStateBedrockOnOptimismSepoliaforEcoTestnet')
  const endBatchBlockHex = toQuantity(l3BlockNumber)
  // const endBatchBlockHex = l3BlockNumber
  console.log('End Batch Block Number: ', endBatchBlockHex)
  const endBatchBlockData = await s.ecoTestnetProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedBlockData = await getRLPEncodedBlock(endBatchBlockData)
  const l1BatchIndex = l3OutputIndex
  console.log('l1BatchIndex: ', l1BatchIndex)
  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.ecoTestnetProvider.send('eth_getProof', [
    networks.ecoTestnet.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])
  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBeArray(networks.ecoTestnet.proving.l2OutputOracleSlotNumber),
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

  const layer1EcoTestnetOutputOracleProof = await s.baseSepoliaProvider.send(
    'eth_getProof',
    [
      networks.baseSepolia.settlementContracts.ecoTestnet,
      [l1BatchSlot],
      settlementBlockTag,
    ],
  )
  const layer1EcoTestnetOutputOracleContractData = [
    toBeHex(layer1EcoTestnetOutputOracleProof.nonce), // nonce
    stripZerosLeft(toBeHex(layer1EcoTestnetOutputOracleProof.balance)), // balance
    layer1EcoTestnetOutputOracleProof.storageHash, // storageHash
    layer1EcoTestnetOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    const proveOutputTX =
      await s.optimismSepoliaProverContract.proveWorldStateBedrock(
        networkIds.ecoTestnet,
        rlpEncodedBlockData,
        endBatchBlockData.stateRoot,
        l2MesagePasserProof.storageHash,
        // endBatchBlockData.hash,
        l1BatchIndex,
        layer1EcoTestnetOutputOracleProof.storageProof[0].proof,
        await s.optimismSepoliaProverContract.rlpEncodeDataLibList(
          layer1EcoTestnetOutputOracleContractData,
        ),
        layer1EcoTestnetOutputOracleProof.accountProof,
        settlementWorldStateRoot,
      )
    await proveOutputTX.wait()
    console.log(
      'Prove Bedrock L3 World State optimismSepolia tx: ',
      proveOutputTX.hash,
    )
    return endBatchBlockData
  } catch (e) {
    if (e.data && s.optimismSepoliaProverContract) {
      const decodedError = s.optimismSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(
        `Transaction failed in proveWorldStateBedrock optimismSepolia: ${decodedError?.name}`,
      )
      console.log('Error: ', e)
      console.log(
        `Error in proveWorldStateBedrock optimismSepolia:`,
        e.shortMessage,
      )
    } else {
      console.log(`Error in proveWorldStateBedrock optimismSepolia:`, e)
    }
  }
}

async function proveWorldStatesBedrockL3L2Op(
  faultDisputeGameAddress,
  faultDisputeGameContract,
  gameIndex,
  l3OutputIndex,
  l3BlockNumber,
) {
  console.log('In proveWorldStatesBedrockL3L2Op')
  const { settlementBlockTag, settlementWorldStateRoot } =
    await proveSepoliaSettlementLayerStateOnOptimismSepolia() // Prove the Sepolia Settlement Layer State

  // Prove Base World State on Optimism Sepolia
  const endBatchBlockDataL2 = await proveWorldStateBaseSepoliaOnOptimismSepolia(
    settlementBlockTag,
    settlementWorldStateRoot,
    faultDisputeGameAddress,
    faultDisputeGameContract,
    gameIndex,
  )
  // Prove ECO Testnet World State on Optimism Sepolia
  console.log('Base endBatchBlockData.number: ', endBatchBlockDataL2.number)
  console.log(
    'Base endBatchBlockData.stateRoot: ',
    endBatchBlockDataL2.stateRoot,
  )
  const endBatchBlockData =
    await proveWorldStateBedrockOnOptimismSepoliaforEcoTestnet(
      l3OutputIndex,
      l3BlockNumber,
      endBatchBlockDataL2.number,
      endBatchBlockDataL2.stateRoot,
    )
  return endBatchBlockData
}

export async function proveDestinationChainBatchSettled(
  gameIndex,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  sourceChains,
  l3OutputIndex,
  l3BlockNumber,
) {
  console.log('In proveDestinationChainBatchSettled')
  let endBatchBlockData
  await Promise.all(
    await Object.entries(sourceChains).map(
      async ([sourceChainkey, sourceChain]) => {
        if (sourceChain.needNewProvenState) {
          // TODO: remove switch statement and use the sourceChain Layer to get the correct proving mechanism
          switch (sourceChain.sourceChain) {
            case networkIds.baseSepolia: {
              // endBatchBlockData = await proveWorldStatesBedrockL3L2Base(
              //   faultDisputeGameAddress,
              //   faultDisputeGameContract,
              //   gameIndex,
              //   l3OutputIndex,
              //   l3BlockNumber,
              // )
              break
            }
            case networkIds.optimismSepolia: {
              endBatchBlockData = await proveWorldStatesBedrockL3L2Op(
                faultDisputeGameAddress,
                faultDisputeGameContract,
                gameIndex,
                l3OutputIndex,
                l3BlockNumber,
              )
              break
            }
            case networkIds.ecoTestnet: {
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

async function proveIntentOptimismSepolia(intentHash, endBatchBlockData) {
  console.log('In proveIntentOptimismSepolia')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.ecoTestnetProvider.send('eth_getProof', [
    networks.ecoTestnet.inbox.address,
    [inboxStorageSlot],
    endBatchBlockData.number,
  ])

  const intentInfo =
    await s.optimismSepoliaIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.optimismSepolia, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    const proveIntentTx = await s.optimismSepoliaProverContract.proveIntent(
      networkIds.ecoTestnet,
      actors.claimant,
      networks.ecoTestnet.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.optimismSepoliaProverContract.rlpEncodeDataLibList([
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
    if (e.data && s.optimismSepoliaProverContract) {
      const decodedError = s.optimismSepoliaProverContract.interface.parseError(
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
  for (const intent of intentsToProve) {
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        // await proveIntentBaseSepolia(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.optimismSepolia: {
        await proveIntentOptimismSepolia(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.ecoTestnet: {
        // await proveIntentEcoTestnet(intent.intentHash, endBatchBlockData)
        break
      }
    }
  }
}

async function withdrawRewardOptimismSepolia(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.optimismSepoliaIntentSourceContractClaimant.withdrawRewards(
        intentHash,
      )
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.optimismSepoliaIntentSourceContractClaimant) {
      const decodedError =
        s.optimismSepoliaIntentSourceContractClaimant.interface.parseError(
          e.data,
        )
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
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        // await withdrawRewardBaseSepolia(intent.intentHash)
        break
      }
      case networkIds.optimismSepolia: {
        await withdrawRewardOptimismSepolia(intent.intentHash)
        break
      }
      case networkIds.ecoTestnet: {
        // await withdrawRewardEcoTestnet(intent.intentHash)
        break
      }
    }
  }
}

async function main() {
  const proveAll: boolean = true
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  try {
    console.log('In Main')
    console.log('Batch Settle of Eco Testnet')
    // Get the latest Batch Settled for Base Sepolia
    const {
      blockNumber,
      gameIndex, // latest Output Index from L2OutputOracle
      faultDisputeGameAddress,
      faultDisputeGameContract,
      l3OutputIndex,
      l3BlockNumber,
    } = await getBatchSettled()
    console.log('settlementBlockNumber: ', blockNumber)
    console.log('settlementGameIndex: ', gameIndex)
    console.log('faultDisputeGameAddress: ', faultDisputeGameAddress)
    console.log('l3OutputIndex: ', l3OutputIndex)
    console.log('l3BlockNumber: ', l3BlockNumber)

    // Get all the intents that can be proven for the batch by destination chain
    const { sourceChains, intentsToProve } = await getIntentsToProve(
      l3BlockNumber,
      proveAll,
    )
    console.log('intentsToProve: ', intentsToProve)
    // Prove the latest batch settled
    const endBatchBlockData = await proveDestinationChainBatchSettled(
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
      sourceChains,
      l3OutputIndex,
      l3BlockNumber,
    )
    // Prove all the intents
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
