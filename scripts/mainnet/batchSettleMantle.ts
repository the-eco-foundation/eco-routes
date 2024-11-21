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
  settlementTypes,
  // provingMechanisms,
  // intent,
} from '../../config/mainnet/config'
import { s } from '../../config/mainnet/setup'
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

async function getMantleRLPEncodedBlock(blockNumber) {
  console.log('In getMantleRLPEncodedBlock')
  // Some fields are not populated in the block
  // Looking for logic sample code here
  // https://github.com/mantlenetworkio/mantle-v2/blob/develop/l2geth/core/types/block.go#L303-L321

  const block: any = await s.mantleProvider.send('eth_getBlockByNumber', [
    blockNumber,
    false,
  ])

  // console.log('  toBeHex(block.number),', toBeHex(block.number))
  console.log(
    'stripZerosLeft(toBeHex(block.number)),',
    stripZerosLeft(toBeHex(block.number)),
  )
  const fallBackDataValue = '0x'
  const fallbackNumberValue = '0x00'
  // const fallbackExcessBlobGas = '0x0'

  const blockHeader = [
    block.parentHash,
    block.sha3Uncles,
    block.miner,
    block.stateRoot,
    block.transactionsRoot,
    block.receiptsRoot,
    block.logsBloom,
    // stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
    toBeHex(block.difficulty), // Add stripzeros left here
    toBeHex(block.number),
    toBeHex(block.gasLimit),
    toBeHex(block.gasUsed),
    block.timestamp,
    block.extraData,
    block.mixHash,
    block.nonce,
    toBeHex(block.baseFeePerGas),
    // block.withdrawalsRoot ? block.withdrawalsRoot : fallBackDataValue, // Handle missing blobGasUsed
    block.blobGasUsed ? block.blobGasUsed : fallbackNumberValue, // Handle missing blobGasUsed
    block.excessBlobGas ? block.excessBlobGas : fallbackNumberValue, // Handle missing blobGasUsed
    // block.parentBeaconBlockRoot
    //   ? block.parentBeaconBlockRoot
    //   : fallBackDataValue, // Handle missing blobGasUsed
  ]
  console.log('block: ', block)
  console.log('blockHeader: ', blockHeader)
  const rlpEncodedBlockData = encodeRlp(blockHeader)
  const blockHash = keccak256(rlpEncodedBlockData)
  console.log('here')

  const fallBackValue2 = '0x0'
  const blockHeader2 = [
    block.parentHash,
    block.sha3Uncles,
    block.miner,
    block.stateRoot,
    block.transactionsRoot,
    block.receiptsRoot,
    block.logsBloom,
    // stripZerosLeft(toBeHex(block.difficulty)), // Add stripzeros left here
    toBeHex(block.difficulty), // Add stripzeros left here
    toBeHex(block.number),
    toBeHex(block.gasLimit),
    toBeHex(block.gasUsed),
    block.timestamp,
    block.extraData,
    block.mixHash,
    block.nonce,
    toBeHex(block.baseFeePerGas),
    block.withdrawalsRoot ? block.withdrawalsRoot : fallBackValue2, // Handle missing blobGasUsed
    block.blobGasUsed ? block.blobGasUsed : fallBackValue2, // Handle missing blobGasUsed
    block.excessBlobGas ? block.excessBlobGas : fallBackValue2, // Handle missing blobGasUsed
    block.parentBeaconBlockRoot ? block.parentBeaconBlockRoot : fallBackValue2, // Handle missing blobGasUsed
  ]
  // Concatenate the block header fields into one string (you can use other encoding if needed)
  const concatenatedHeader = blockHeader2.join('')

  // Convert the concatenated header string to a Buffer
  const headerBuffer = Buffer.from(concatenatedHeader, 'utf8')

  // Calculate the Keccak-256 hash of the concatenated block header
  const blockHash2 = keccak256(headerBuffer)
  console.log('Hash of RLP Encoded Block Data: ', blockHash)
  console.log('ChatGPT Block Hash            : ', blockHash2)
  console.log('Original Block Hash           : ', block.hash)

  // check the hash is valid
  // if (blockHash !== block.hash) {
  //   console.log('Hash of RLP Encoded Block Data: ', blockHash)
  //   console.log('Block Hash: ', block.hash)
  //   console.log('Hashes do not match')
  //   throw Error('Hashes do not match')
  // }
  // console.log('About to return RLP Encoded Block Data: ', rlpEncodedBlockData)
  return rlpEncodedBlockData
}

export async function getBatchSettled() {
  // Get the Latest Batch Settled for Mantle to Ethereum
  // Recommend making approximateUnsettledGames configurable and could go as high as 84 but safest is zero.
  // Get the Output Index and Block Number from L2 OUTPUT ORACLE that was sent before this block
  console.log('In getBatchSettled')
  // Get the Output Index and Block Number from L2 OUTPUT ORACLE that was sent before this block
  const endBatchBlockData = await s.mainnetProvider.send(
    'eth_getBlockByNumber',
    ['latest', false],
  )
  const ethereumBlockNumber = BigInt(endBatchBlockData.number)
  // Get the event from the latest Block checking transaction hash
  console.log('Ethereum latest BlockNumber : ', ethereumBlockNumber)
  // const ThreeSecondBlocksInOneWeek = 302400n
  const L2OutputOracleEventsBlocksToRetrieve = 300n // Mainnet is only 12 seconds so can look at all blocks
  const l2OutputOracleEvents =
    await s.mainnetSettlementContractMantle.queryFilter(
      s.mainnetSettlementContractMantle.getEvent('OutputProposed'),
      // toQuantity(blockNumber - OneSecondBlocksInTwoWeeks),
      // toQuantity(blockNumber - L2OutputOracleEventsBlocksToIgnore),
      toQuantity(ethereumBlockNumber - L2OutputOracleEventsBlocksToRetrieve),
      toQuantity(ethereumBlockNumber),
    )
  // Need to loop backwards from the last event checking the block.timestamp
  // Till we find a block.timestamp that is less than the current time - networks.ecoTestnet.proving.finalityDelaySeconds
  // let eventIndex = l2OutputOracleEvents.length - 1
  // let outputIndex, mantleBlockNumber
  // while (eventIndex >= 0) {
  // const dateInSeconds = Math.floor(Date.now() / 1000)
  // const endBatchblock = await s.mantleProvider.send('eth_getBlockByNumber', [
  //   toQuantity(l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[3]),
  //   false,
  // ])
  const outputIndex = toNumber(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[2],
  )
  const mantleEndBatchBlockNumber = BigInt(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[3],
  )

  return {
    ethereumBlockNumber,
    outputIndex,
    mantleEndBatchBlockNumber,
  }
}
export async function getIntentsToProve(
  settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  // const sourceChainConfig = networks.ecoTestnet.sourceChains
  const sourceChainConfig = ['base', 'optimism']
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let mantleProvenState
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber = 71150569n
  const inboxDeploymentBlock = 71150569n
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      mantleProvenState = await proverContract.provenStates(networkIds.mantle)
      sourceChainInfo.lastProvenBlock = mantleProvenState.blockNumber || 0n
      if (proveAll) {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        sourceChainInfo.needNewProvenState = true
        startingBlockNumber = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      } else {
        if (mantleProvenState.blockNumber > inboxDeploymentBlock) {
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
  const intentHashEvents = await s.mantleInboxContractSolver.queryFilter(
    s.mantleInboxContractSolver.getEvent('Fulfillment'),
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

async function proveSettlementLayerState() {
  console.log('In proveL1WorldState')
  const settlementBlock = await s.optimisml1Block.number()
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
    tx = await s.optimismProverContract.proveSettlementLayerState(
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
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
      console.log(`Transaction failed: ${decodedError?.name}`)
      console.log(`Error in proveL1WorldState:`, e.shortMessage)
    } else {
      console.log(`Error in proveL1WorldState:`, e)
    }
  }
}

// TODO: Consolidate the multiple functions into a parameterized function
async function proveWorldStateBedrock(
  // intentFulfillTransaction,
  settlementBlockTag,
  settlementStateRoot,
  l1BatchIndex,
  mantleEndBatchBlockNumber,
) {
  console.log('In proveWorldStateBedrock')
  // const ethereumBlockNumber = 21231486n
  // const mantleEndBatchBlockNumber = 72006146n
  // const l1BatchIndex = 6018
  // Get the L1 Batch Number for the transaction we are proving
  // const txDetails = await s.baseProvider.getTransaction(
  //   intentFulfillTransaction,
  // )
  // const intentFulfillmentBlock = txDetails!.blockNumber
  // const l1BatchIndex =
  //   await s.mainnetSettlementContractBase.getL2OutputIndexAfter(
  //     intentFulfillmentBlock,
  //   )
  // console.log('Layer 1 Batch Number: ', l1BatchIndex.toString())
  // // Get the the L2 End Batch Block for the intent
  // const l1BatchData = await s.mainnetSettlementContractBase.getL2OutputAfter(
  //   intentFulfillmentBlock,
  // )
  const endBatchBlockHex = toQuantity(mantleEndBatchBlockNumber)
  console.log('End Batch Block: ', endBatchBlockHex)
  const rlpEncodedBlockData = await getMantleRLPEncodedBlock(endBatchBlockHex)
  const endBatchBlockData = await s.mantleProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.mantleProvider.send('eth_getProof', [
    networks.mantle.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])
  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBeArray(networks.mantle.proving.l2OutputOracleSlotNumber),
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

  const layer1MantleOutputOracleProof = await s.mainnetProvider.send(
    'eth_getProof',
    [
      networks.mainnet.settlementContracts.mantle,
      [l1BatchSlot],
      settlementBlockTag,
    ],
  )
  const layer1MantleOutputOracleContractData = [
    toBeHex(layer1MantleOutputOracleProof.nonce), // nonce
    stripZerosLeft(toBeHex(layer1MantleOutputOracleProof.balance)), // balance
    layer1MantleOutputOracleProof.storageHash, // storageHash
    layer1MantleOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    const proveOutputTX = await s.optimismProverContract.proveWorldStateBedrock(
      networkIds.mantle,
      rlpEncodedBlockData,
      endBatchBlockData.stateRoot,
      l2MesagePasserProof.storageHash,
      // endBatchBlockData.hash,
      l1BatchIndex,
      layer1MantleOutputOracleProof.storageProof[0].proof,
      await s.optimismProverContract.rlpEncodeDataLibList(
        layer1MantleOutputOracleContractData,
      ),
      layer1MantleOutputOracleProof.accountProof,
      settlementStateRoot,
    )
    await proveOutputTX.wait()
    console.log('Prove L2 World State tx: ', proveOutputTX.hash)
    return {
      endBatchBlockData,
    }
  } catch (e) {
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
      console.log(
        `Transaction failed in proveWorldStateBedrock : ${decodedError?.name}`,
      )
      console.log('Error: ', e)
      console.log(`Error in proveWorldStateBedrock:`, e.shortMessage)
    } else {
      console.log(`Error in proveWorldStateBedrock:`, e)
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
  // await getMantleRLPEncodedBlock('0x44aabf2')
  // throw Error('Test')
  // const proveAll: boolean = true
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  try {
    console.log('In Main')
    console.log('Batch Settle for Mantle')
    // Get the latest Batch Settled for Base Sepolia
    const { ethereumBlockNumber, outputIndex, mantleEndBatchBlockNumber } =
      await getBatchSettled()
    console.log('Ethereum Block Number: ', ethereumBlockNumber)
    console.log('Mantle EndBatchBlockNumber: ', mantleEndBatchBlockNumber)
    console.log('Output Index: ', outputIndex)

    const { settlementBlockTag, settlementStateRoot } =
      await proveSettlementLayerState()
    const { endBatchBlockData } = await proveWorldStateBedrock(
      settlementBlockTag,
      settlementStateRoot,
      outputIndex,
      mantleEndBatchBlockNumber,
    )

    console.log('endBatchBlockData: ', endBatchBlockData)

    // // Prove all the intents
    // await proveIntents(intentsToProve, endBatchBlockData)
    // await withdrawFunds(intentsToProve)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
