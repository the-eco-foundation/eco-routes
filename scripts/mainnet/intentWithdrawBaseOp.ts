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

async function getOptimismRLPEncodedBlock(blockNumber) {
  console.log('In getOptimismRLPEncodedBlock')

  const block: Block = await s.optimismProvider.send('eth_getBlockByNumber', [
    blockNumber,
    false,
  ])

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
  console.log('In proveL1WorldState')
  const settlementBlock = await s.basel1Block.number()
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
    tx = await s.baseProverContract.proveSettlementLayerState(
      getBytes(hexlify(rlpEncodedBlockData)),
      networkIds.mainnet,
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

async function proveWorldStateCannon(settlementBlockTag, settlementStateRoot) {
  console.log('In proveWorldStateCannon')

  // Query the Latest Dispute Game Factorry created FaultDisputeGames
  // Work backwards for each fault dispute game check if it is solved by doing a storage proof of it's status

  // When we have the fault Dispuate Game populate the information needed for a proveWorldStateCannon
  const endbatachBlockData = 'Place L2Output Block Data Here'
  return endbatachBlockData
  /*
  console.log('In proveL2WorldStateOptimism on Base')
  const RLPEncodedOptimismEndBatchBlock = await getBlockRLPEncodedData()
  console.log(
    'RLPEncodedOptimismEndBatchBlock: ',
    RLPEncodedOptimismEndBatchBlock,
  )
  const RLPEncodedDisputeGameFactoryData =
    await s.optimismProverContract.rlpEncodeDataLibList(
      faultDisputeGame.l2BlockNumber,
    )
  // Prove the L2 World State for Cannon
  const disputeGameFactoryProofData = {
    // destinationWorldStateRoot: bedrock.optimism.endBatchBlockStateRoot,
    messagePasserStateRoot: bedrock.optimism.messagePasserStateRoot,
    latestBlockHash: bedrock.optimism.endBatchBlockHash,
    gameIndex: bedrock.optimism.disputeGameFactory.faultDisputeGame.gameIndex,
    // gameId: toBeHex(stripZerosLeft(config.cannon.gameId)),
    gameId: bedrock.optimism.disputeGameFactory.faultDisputeGame.gameId,
    disputeFaultGameStorageProof:
      bedrock.optimism.disputeGameFactory.storageProof,
    rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

    disputeGameFactoryAccountProof:
      bedrock.optimism.disputeGameFactory.accountProof,
  }

  const RLPEncodedFaultDisputeGameData =
    await s.optimismProverContract.rlpEncodeDataLibList(
      bedrock.optimism.faultDisputeGame.contractData,
    )
  const faultDisputeGameProofData = {
    faultDisputeGameStateRoot: bedrock.optimism.faultDisputeGame.stateRoot,
    faultDisputeGameRootClaimStorageProof:
      bedrock.optimism.faultDisputeGame.rootClaim.storageProof,
    faultDisputeGameStatusSlotData: {
      createdAt: bedrock.optimism.faultDisputeGame.status.storage.createdAt,
      resolvedAt: bedrock.optimism.faultDisputeGame.status.storage.resolvedAt,
      gameStatus: bedrock.optimism.faultDisputeGame.status.storage.gameStatus,
      initialized: bedrock.optimism.faultDisputeGame.status.storage.initialized,
      l2BlockNumberChallenged:
        bedrock.optimism.faultDisputeGame.status.storage
          .l2BlockNumberChallenged,
      // filler: getBytes(
      //   bedrock.optimism.faultDisputeGame.status.storage.filler,
      // ),
    },
    faultDisputeGameStatusStorageProof:
      bedrock.optimism.faultDisputeGame.status.storageProof,
    rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
    faultDisputeGameAccountProof:
      bedrock.optimism.faultDisputeGame.accountProof,
  }
  console.log('about to proveWorldStateCannon')

  try {
    const proveOutputTX = await s.optimismProverContract.proveWorldStateCannon(
      cannon.intent.destinationChainId,
      RLPEncodedOptimismEndBatchBlock,
      // cannon.intent.rlpEncodedBlockData,
      bedrock.optimism.endBatchBlockStateRoot,
      disputeGameFactoryProofData,
      faultDisputeGameProofData,
      bedrock.settlementChain.worldStateRoot,
    )
    await proveOutputTX.wait()
    console.log('Prove Optimism World State on Base tx: ', proveOutputTX.hash)
    // return {
    //   l1BatchIndex,
    //   endBatchBlockData,
    // }
  } catch (e) {
    if (e.data && s.baseProverContract) {
      const decodedError = s.baseProverContract.interface.parseError(e.data)
      console.log(
        `Transaction failed in proveWorldStateBedrock : ${decodedError?.name}`,
      )
      console.log('Error: ', e)
      console.log(`Error in proveWorldStateBedrock:`, e.shortMessage)
    } else {
      console.log(`Error in proveWorldStateBedrock:`, e)
    }
  }
    */
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
  // define the variables used for each state of the intent lifecycle
  let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    intentHash = intent.hash
    intentFulfillTransaction = intent.fulfillTransaction
    console.log('intentHash: ', intentHash)
    console.log('intentFulfillTransaction: ', intentFulfillTransaction)
    const { settlementBlockTag, settlementStateRoot } =
      await proveSettlementLayerState()
    // const settlementBlockTag = '0x13939e8'
    // const settlementStateRoot =
    //   '0x414b19b24d2ae17ffa4c8093381dff61a6375f760b42d5ce99d74c54dfc21992'
    const { endBatchBlockData } = await proveWorldStateCannon(
      settlementBlockTag,
      settlementStateRoot,
    )
    // console.log('l1BatchIndex: ', l1BatchIndex)
    // console.log('endBatchBlockData: ', endBatchBlockData)
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
