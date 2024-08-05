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
  console.log('block.stateRoot:', block.stateRoot)
  return rlpEncodedBlockData
  //   have successfully proven L1 state
}

function getIntentStorageSlot(intentHash) {
  return solidityPackedKeccak256(['bytes32', 'uint256'], [intentHash, 0])
}

// Proving Sepolia State for BaseSepolia
async function proveSepoliaSettlementLayerState() {
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

// Get Block RLP Encoded data

async function proveWorldStateBaseSepolia() {
  console.log('In proveL2WorldStateBaseSepolia')
  const RLPEncodedDisputeGameFactoryData = await getBlockRLPEncodedData()
  console.log(
    'RLPEncodedDisputeGameFactoryData: ',
    RLPEncodedDisputeGameFactoryData,
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
    await s.baseSepoliaProverContract.rlpEncodeDataLibList(
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
  await s.baseSepoliaProverContract.proveWorldStateCannon(
    cannon.intent.destinationChainId,
    cannon.intent.rlpEncodedBlockData,
    cannon.destinationChain.endBatchBlockStateRoot,
    disputeGameFactoryProofData,
    faultDisputeGameProofData,
    cannon.settlementChain.worldStateRoot,
  )
  console.log('Proved L2 World State Cannon')
}

async function proveIntent() {
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
    // get the latest world state
    // const { settlmentBlockTag, settlementWorldStateRoot } =
    //   await proveSettlementLayerState()
    // console.log('settlmentBlockTag: ', settlmentBlockTag)
    // console.log('settlementWorldStateRoot: ', settlementWorldStateRoot)

    // const blockRLPEncodedData = await getBlockRLPEncodedData()
    const RLPEncodedDisputeGameFactoryData = await getBlockRLPEncodedData()
    console.log(
      'RLPEncodedDisputeGameFactoryData: ',
      RLPEncodedDisputeGameFactoryData,
    )
    const intentStorageSlot = getIntentStorageSlot(cannon.intent.intentHash)
    console.log('intentStorageSlot: ', intentStorageSlot)

    // await proveSepoliaSettlementLayerState()

    await proveWorldStateBaseSepolia()

    await proveIntent()

    console.log('about to withdrawReward')
    // Withdraw the Reward
    await withdrawReward(cannon.intent.intentHash)
    console.log('Withdrew Reward')
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
