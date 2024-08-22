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
import { int } from 'hardhat/internal/core/params/argumentTypes'
import * as FaultDisputeGameArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/FaultDisputeGame.sol/FaultDisputeGame.json'
// import { network } from 'hardhat'

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
  const endBatchBlockHex = toQuantity(
    await faultDisputeGameContract.l2BlockNumber(),
  )
  const endBatchBlockData = await s.optimismProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedBlockData =
    await getOptimismRLPEncodedBlock(endBatchBlockData)
  // console.log('endBatchBlockData: ', endBatchBlockData)
  console.log('rlpEncodedBlockData: ', rlpEncodedBlockData)

  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.optimismProvider.send('eth_getProof', [
    networks.optimism.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])
  // Get the faultDisputeGame game data
  const faultDisputeGameData = await faultDisputeGameContract.gameData()
  const faultDisputeGameCreatedAt = await faultDisputeGameContract.createdAt()
  console.log('faultDisputeGameData: ', faultDisputeGameData)
  console.log(
    'faultDisputeGameData.gameType_: ',
    faultDisputeGameData.gameType_,
  )
  console.log(
    'faultDisputeGameData.rootClaim_: ',
    faultDisputeGameData.rootClaim_,
  )
  console.log(
    'faultDisputeGameData.extraData_: ',
    faultDisputeGameData.extraData_,
  )
  // Get the DisputeGameFactory data GameId
  const faultDisputeGameId = await s.baseProverContract.pack(
    faultDisputeGameData.gameType_,
    faultDisputeGameCreatedAt,
    faultDisputeGameAddress,
  )
  console.log('gameId: ', faultDisputeGameId)

  const DisputeGameFactoryProof = await s.mainnetProvider.send('eth_getProof', [
    networks.mainnet.settlementContracts.optimism,
    [l1BatchSlot],
    settlementBlockTag,
  ])

  // populate fields for the DisputeGameFactory proof
  // const disputeGameFactoryProofData = {
  //   // destinationWorldStateRoot: bedrock.baseSepolia.endBatchBlockStateRoot,
  //   messagePasserStateRoot: l2MesagePasserProof.storageHash,
  //   latestBlockHash: endBatchBlockData.hash,
  //   gameIndex: intent.baseOpCannon.faultDisputeGame.gameIndex,

  //   // gameId: toBeHex(stripZerosLeft(config.cannon.gameId)),
  //   gameId: faultDisputeGameId,
  //   disputeFaultGameStorageProof:
  //     bedrock.baseSepolia.disputeGameFactory.storageProof,
  //   rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

  //   disputeGameFactoryAccountProof:
  //     bedrock.baseSepolia.disputeGameFactory.accountProof,
  // }

  // populate fields for the FaultDisputeGame rootclaim proof
  // populate fields for the FaultDisputeGame resolved proof
  // const RLPEncodedFaultDisputeGameData = await prover.rlpEncodeDataLibList(
  //   bedrock.baseSepolia.faultDisputeGame.contractData,
  // )
  // const faultDisputeGameProofData = {
  //   faultDisputeGameStateRoot: bedrock.baseSepolia.faultDisputeGame.stateRoot,
  //   faultDisputeGameRootClaimStorageProof:
  //     bedrock.baseSepolia.faultDisputeGame.rootClaim.storageProof,
  //   faultDisputeGameStatusSlotData: {
  //     createdAt: bedrock.baseSepolia.faultDisputeGame.status.storage.createdAt,
  //     resolvedAt:
  //       bedrock.baseSepolia.faultDisputeGame.status.storage.resolvedAt,
  //     gameStatus:
  //       bedrock.baseSepolia.faultDisputeGame.status.storage.gameStatus,
  //     initialized:
  //       bedrock.baseSepolia.faultDisputeGame.status.storage.initialized,
  //     l2BlockNumberChallenged:
  //       bedrock.baseSepolia.faultDisputeGame.status.storage
  //         .l2BlockNumberChallenged,
  //     // filler: getBytes(
  //     //   bedrock.baseSepolia.faultDisputeGame.status.storage.filler,
  //     // ),
  //   },
  //   faultDisputeGameStatusStorageProof:
  //     bedrock.baseSepolia.faultDisputeGame.status.storageProof,
  //   rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
  //   faultDisputeGameAccountProof:
  //     bedrock.baseSepolia.faultDisputeGame.accountProof,
  // }
  // prove the world state cannon
  // await prover.proveWorldStateCannon(
  //   networkIds.baseSepolia,
  //   bedrock.baseSepolia.rlpEncodedendBatchBlockData,
  //   // RLPEncodedBaseSepoliaEndBatchBlock,
  //   bedrock.baseSepolia.endBatchBlockStateRoot,
  //   disputeGameFactoryProofData,
  //   faultDisputeGameProofData,
  //   bedrock.settlementChain.worldStateRoot,
  // )
  console.log('ProvenWorldStateCannon Base to Optimism')
  return endBatchBlockData
}

async function proveIntent(intentHash, endBatchBlockData) {
  console.log('In proveIntent')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
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

  const balance = stripZerosLeft(toBeHex(intentInboxProof.balance)) // balance
  const nonce = toBeHex(intentInboxProof.nonce) // nonce
  try {
    const proveIntentTx = await s.baseProverContract.proveIntent(
      networkIds.optimism,
      actors.claimant,
      networks.optimism.inboxAddress,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.baseProverContract.rlpEncodeDataLibList([
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
    const settlementBlockTag = intent.baseOpCannon.settlementBlockTag
    const settlementStateRoot = intent.baseOpCannon.settlementStateRoot
    faultDisputeGame = intent.baseOpCannon.faultDisputeGame
    intentHash = intent.baseOpCannon.hash
    intentFulfillTransaction = intent.baseOpCannon.fulfillTransaction
    console.log('intentHash: ', intentHash)
    console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    console.log('faultDisputeGame: ', faultDisputeGame)
    // const { settlementBlockTag, settlementStateRoot } =
    //   await proveSettlementLayerState()
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
    // console.log('endBatchBlockData: ', endBatchBlockData)
    // await proveFaultFaultDisputeGameRootClaim()
    // await proveFaultDisputeGameResolved()
    // await proveIntents()
    // await withdrawIntents()
    // intentHash = intent.hash
    // intentFulfillTransaction = intent.fulfillTransaction
    // console.log('intentHash: ', intentHash)
    // console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    // const { settlementBlockTag, settlementStateRoot } =
    //   await proveSettlementLayerState()
    // const { l1BatchIndex, endBatchBlockData } = await proveWorldStateBedrock(
    //   settlementBlockTag,
    //   intentFulfillTransaction,
    //   settlementStateRoot,
    // )
    // await proveIntent(intentHash, l1BatchIndex, endBatchBlockData)
    // await withdrawReward(intentHash)
    console.log('End of Main')
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
