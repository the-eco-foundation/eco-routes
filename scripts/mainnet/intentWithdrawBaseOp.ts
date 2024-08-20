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

async function proveWorldStateCannon(
  settlementBlockTag,
  faultDisputeGame,
  settlementStateRoot,
) {
  console.log('In proveWorldStateCannon')
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
  // Get the latest Resolved FaultDisputeGame from DisputeGameFactory
  // Create the DisputeGameFactory proof for FaultDisputeGame
  // Create the FaultDisputeGame proof for rootClaim
  // Create the FaultDisputeGame proof for resolved
  // Prove all intents up to the L2 block number
  // Withdraw all intents up to the L2 block number
  // define the variables used for each state of the intent lifecycle
  let intentHash, intentFulfillTransaction
  try {
    console.log('In intentWithdrawBaseOp')
    const { settlementBlockTag, settlementStateRoot } =
      await proveSettlementLayerState()
    console.log('settlementBlockTag: ', settlementBlockTag)
    console.log('settlementStateRoot: ', settlementStateRoot)
    // await getLatestResolvedFaultDisputeGame()
    // await proveDisputeGameFactoryFaultDisputeGame()
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
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
