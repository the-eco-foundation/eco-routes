import {
  AbiCoder,
  Block,
  Contract,
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
  intent,
} from '../../config/mainnet/config'
import { s } from '../../config/mainnet/setup'
import * as FaultDisputeGameArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/FaultDisputeGame.sol/FaultDisputeGame.json'

async function getOptimismRLPEncodedBlock(block) {
  console.log('In getOptimismRLPEncodedBlock')

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

async function proveSettlementLayerState() {
  console.log('In proveSettlementLayerState')
  const settlementBlock = await s.basel1Block.number()
  const settlementBlockTag = toQuantity(settlementBlock)

  const block: Block = await s.mainnetProvider.send('eth_getBlockByNumber', [
    settlementBlockTag,
    false,
  ])

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
    tx = await s.baseProverContract.proveSettlementLayerState(
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
    if (e.data && s.baseProverContract) {
      const decodedError = s.baseProverContract.interface.parseError(e.data)
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in proveL1WorldState:`, e.shortMessage)
    } else {
      console.log(`Error in proveL1WorldState:`, e)
    }
  }
}

async function getFaultDisputeGame() {
  console.log('In getFaultDisputeGame')
  const faultDisputeGame = intent.baseOpCannon.faultDisputeGame
  // The following code shows how to listen for creation events on DisputeGameFactory for faultDisputeGames
  // Currently I have hardcoded the block number for the faultDisputeGame I am using
  // this can be replaced by an event listener for all creation events
  const faultDisputeGameCreationEvents =
    await s.mainnetSettlementContractOptimism.queryFilter(
      s.mainnetSettlementContractOptimism.getEvent('DisputeGameCreated'),
      intent.baseOpCannon.faultDisputeGame.creationBlock,
    )
  const faultDisputeGameAddress = getAddress(
    stripZerosLeft(toBeHex(faultDisputeGameCreationEvents[0].topics[1])),
  )
  console.log('FaultDisputeGame: ', faultDisputeGame)
  // The following code shows how to listen for resolved events for a faultDisputeGame
  // topic 1 contains the FaultDisputeGame address
  // giving an array of created FaultDisputeGames
  // Currently I have hardcoded the block number for the FaultDisputeGame resolve event
  // This can be replaced by a service which listens for events from the faultDisputeGame
  const faultDisputeGameContract = new Contract(
    faultDisputeGameAddress,
    FaultDisputeGameArtifact.abi,
    s.mainnetProvider,
  )
  const faultDisputeGameResolvedEvents =
    await faultDisputeGameContract.queryFilter(
      faultDisputeGameContract.getEvent('Resolved'),
      intent.baseOpCannon.faultDisputeGame.resolvedBlock,
    )
  const faultDisputeGameResolvedEventSignature =
    faultDisputeGameResolvedEvents[0].topics[0]
  const faultDisputeGameStatus = BigInt(
    faultDisputeGameResolvedEvents[0].topics[1],
  )
  console.log(
    'FaultDisputeGameResolvedEventSignature: ',
    faultDisputeGameResolvedEventSignature,
  )
  console.log('FaultDisputeGameStatus: ', faultDisputeGameStatus.toString())
  const endBatchBlockHex = await faultDisputeGameContract.l2BlockNumber()
  console.log('endBatchBlockHex: ', endBatchBlockHex)
  return { faultDisputeGameAddress, faultDisputeGameContract }
}

async function proveWorldStateCannonBaseToOptimism(
  settlementBlockTag,
  settlementStateRoot,
  faultDisputeGameAddress,
  faultDisputeGameContract,
) {
  console.log('In proveWorldStateCannonBaseToOptimism')
  // For more information on how DisputeGameFactory utility functions, see the following code
  // https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/lib/LibUDT.sol#L82
  // get the endBatchBlockData

  // Note: For all proofs we use two block numbers
  // For anything related to the settlement chain we use settlementBlockTag
  // For anything related to the destination chain we use endBatchBlockHex
  const disputeGameFactoryContract = s.mainnetSettlementContractOptimism
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
  const endBatchBlockData = await s.optimismProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedEndBatchBlockData =
    await getOptimismRLPEncodedBlock(endBatchBlockData)

  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.optimismProvider.send('eth_getProof', [
    networks.optimism.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])

  // Get the DisputeGameFactory data GameId
  const faultDisputeGameId = await s.baseProverContract.pack(
    faultDisputeGameData.gameType_,
    faultDisputeGameCreatedAt,
    faultDisputeGameAddress,
  )
  // TODO: this needs to be enhanced to loop through all games until we find the correct gameIndex
  const lastGame = (await disputeGameFactoryContract.gameCount()) - 50n
  console.log('lastGame: ', lastGame)
  // Get the DisputeGameFactory gameIndex for this faultDisputeGame
  const latestGames = await disputeGameFactoryContract.findLatestGames(
    faultDisputeGameData.gameType_,
    lastGame,
    50, // note if looking up more than 50 games it does not consistently return all the contracts have seen it return between 90 and 138 with limited tests
  )
  console.log('latestGames.length: ', latestGames.length)
  // TODO gameIndex needs to come from above data by looking for matching faultDisputeGame rootClaim and extraData
  const gameIndex = intent.baseOpCannon.faultDisputeGame.gameIndex
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
  const disputeGameFactoryProof = await s.mainnetProvider.send('eth_getProof', [
    networks.mainnet.settlementContracts.optimism,
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
    await s.baseProverContract.rlpEncodeDataLibList(
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
  const faultDisputeGameRootClaimProof = await s.mainnetProvider.send(
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
  const faultDisputeGameRootResolvedProof = await s.mainnetProvider.send(
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
    await s.baseProverContract.rlpEncodeDataLibList(
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

  try {
    // Note: ProveStorage and ProveAccount are pure functions and included here just for unit testing
    const { gameProxy_ } = await s.baseProverContract.unpack(
      disputeGameFactoryProofData.gameId,
    )
    // proveStorageDisputeGameFactory
    await s.baseProverContract.proveStorage(
      disputeGameFactoryStorageSlot,
      encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameId))),
      // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
      disputeGameFactoryProof.storageProof[0].proof,
      disputeGameFactoryProof.storageHash,
    )
    // proveAccountDisputeGameFactory
    await s.baseProverContract.proveAccount(
      networks.mainnet.settlementContracts.optimism,
      disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData,
      disputeGameFactoryProofData.disputeGameFactoryAccountProof,
      settlementStateRoot,
    )
    // proveStorageFaultDisputeGameRootClaim
    await s.baseProverContract.proveStorage(
      faultDisputeGameRootClaimStorageSlot,
      encodeRlp(toBeHex(stripZerosLeft(faultDisputeGameData.rootClaim_))),
      // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
      faultDisputeGameRootClaimProof.storageProof[0].proof,
      faultDisputeGameRootClaimProof.storageHash,
    )
    // proveStorageFaultDisputeGameResolved
    await s.baseProverContract.proveStorage(
      faultDisputeGameResolvedStorageSlot,
      await s.baseProverContract.assembleGameStatusStorage(
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
    await s.baseProverContract.proveAccount(
      // faultDisputeGameAddress,
      // '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
      gameProxy_,
      faultDisputeGameProofData.rlpEncodedFaultDisputeGameData,
      faultDisputeGameProofData.faultDisputeGameAccountProof,
      settlementStateRoot,
    )
    // console.log('proveWorldStateCannon')
    const proveWorldStateCannonTx =
      await s.baseProverContract.proveWorldStateCannon(
        networkIds.optimism,
        rlpEncodedEndBatchBlockData,
        endBatchBlockData.stateRoot,
        disputeGameFactoryProofData,
        faultDisputeGameProofData,
        settlementStateRoot,
      )
    await proveWorldStateCannonTx.wait()
    console.log('ProvenWorldStateCannon Base to Optimism')
    return endBatchBlockData
  } catch (e) {
    if (e.data && s.baseProverContract) {
      const decodedError = s.baseProverContract.interface.parseError(e.data)
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in ProveWorldStateCannon:`, e.shortMessage)
    } else {
      console.log(`Error in ProvenWorldStateCannon:`, e)
    }
  }
}

async function proveIntent(intentHash, endBatchBlockData) {
  console.log('In proveIntent')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 0])],
  )
  const intentInboxProof = await s.optimismProvider.send('eth_getProof', [
    networks.optimism.inboxAddress,
    [inboxStorageSlot],
    endBatchBlockData.number,
  ])

  const intentInfo =
    await s.baseIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.base, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    const proveIntentTx = await s.baseProverContract.proveIntent(
      networkIds.optimism,
      actors.claimant,
      networks.optimism.inboxAddress,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.baseProverContract.rlpEncodeDataLibList([
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
    if (e.data && s.baseProverContract) {
      const decodedError = s.baseProverContract.interface.parseError(e.data)
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
      await s.baseIntentSourceContractClaimant.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.baseIntentSourceContractClaimant) {
      const decodedError =
        s.baseIntentSourceContractClaimant.interface.parseError(e.data)
      console.log(
        `Transaction failed in withdrawReward : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in withdrawReward:`, e)
    }
  }
}

async function main() {
  let intentHash, intentFulfillTransaction, faultDisputeGame
  try {
    console.log('In intentWithdrawBaseOp')
    // const settlementBlockTag = intent.baseOpCannon.settlementBlockTag
    // const settlementStateRoot = intent.baseOpCannon.settlementStateRoot
    faultDisputeGame = intent.baseOpCannon.faultDisputeGame
    intentHash = intent.baseOpCannon.hash
    intentFulfillTransaction = intent.baseOpCannon.fulfillTransaction
    console.log('intentHash: ', intentHash)
    console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    console.log('faultDisputeGame: ', faultDisputeGame)
    const { settlementBlockTag, settlementStateRoot } =
      await proveSettlementLayerState()
    console.log('settlementBlockTag: ', settlementBlockTag)
    console.log('settlementStateRoot: ', settlementStateRoot)
    // await getLatestResolvedFaultDisputeGame()
    const { faultDisputeGameAddress, faultDisputeGameContract } =
      await getFaultDisputeGame()
    const endBatchBlockData = await proveWorldStateCannonBaseToOptimism(
      settlementBlockTag,
      settlementStateRoot,
      faultDisputeGameAddress,
      faultDisputeGameContract,
    )
    await proveIntent(intentHash, endBatchBlockData)
    await withdrawReward(intentHash)
    console.log('End of Main')
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
