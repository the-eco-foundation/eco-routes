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
import { intent } from '../../test/testData'
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

export async function getIntentsToProve(
  // settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  // const sourceChainConfig = networks.ecoTestNet.sourceChains
  const sourceChainConfig = [networkIds[471923]]
  // const sourceChainConfig = [networkIds.ecoTestNet]
  console.log('sourceChainConfig: ', sourceChainConfig)
  const settlementBlockNumber = await s.ecoTestNetl1Block.number()
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let ecoTestNetProvenState
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber = networks.baseSepolia.inbox.deploymentBlock || 0n
  const inboxDeploymentBlock = networks.baseSepolia.inbox.deploymentBlock || 0n
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      console.log('sourceChain: ', sourceChain)
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      ecoTestNetProvenState = await proverContract.provenStates(
        networkIds.baseSepolia,
      )
      console.log('ecoTestNetProvenState: ', ecoTestNetProvenState)
      sourceChainInfo.lastProvenBlock = ecoTestNetProvenState.blockNumber
      if (proveAll) {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        sourceChainInfo.needNewProvenState = true
        startingBlockNumber = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      } else {
        if (ecoTestNetProvenState.blockNumber > inboxDeploymentBlock) {
          sourceChainInfo.lastProvenBlock = ecoTestNetProvenState.blockNumber
          if (ecoTestNetProvenState.blockNumber < startingBlockNumber) {
            startingBlockNumber = ecoTestNetProvenState.blockNumber
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
  const settlementBlockNumberHex = toQuantity(settlementBlockNumber)
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents = await s.baseSepoliaInboxContractSolver.queryFilter(
    s.ecoTestNetInboxContractSolver.getEvent('Fulfillment'),
    toQuantity(startingBlockNumber),
    settlementBlockNumberHex,
  )
  console.log('intentHashEvents: ', intentHashEvents)
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
      console.log(intentToProve)
      return intentToProve
    })
    // False removes it true keeps it
    .filter((intentToProve) => {
      console.log('intentToProve: ', intentToProve)
      console.log('intentToProve.sourceChain: ', intentToProve.sourceChain)
      console.log('networkIds.ecoTestNet: ', networkIds.ecoTestNet)
      if (intentToProve.sourceChain != networkIds.ecoTestNet) {
        return false
      } else {
        if (
          intentToProve.blockNumber >
            sourceChains[intentToProve.sourceChain].lastProvenBlock &&
          intentToProve.blockNumber <= settlementBlockNumber
        ) {
          sourceChains[intentToProve.sourceChain].needNewProvenState = true
        } else {
          sourceChains[intentToProve.sourceChain].needNewProvenState = false
        }
      }
      return (
        intentToProve.blockNumber >
        sourceChains[intentToProve.sourceChain].lastProvenBlock
      )
    })
  return { settlementBlockNumberHex, intentsToProve }
  // return [chainId, intentHash, intentFulfillTransaction]
}

async function proveSettlementChainInstantBaseSepoliaEcoTestNet() {
  console.log('In proveSettlementChainInstant')
  let provedSettlementState = false
  let errorCount = 0
  while (!provedSettlementState) {
    const setlementBlock = await s.ecoTestNetl1Block.number()
    console.log('setlementBlock: ', setlementBlock)
    const settlementBlockNumberLatest = toQuantity(setlementBlock)

    const block: Block = await s.baseSepoliaProvider.send(
      'eth_getBlockByNumber',
      [settlementBlockNumberLatest, false],
    )

    let tx
    let settlementWorldStateRootLatest
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
      tx = await s.ecoTestNetProverContract.proveSettlementLayerState(
        getBytes(hexlify(rlpEncodedBlockData)),
        // networkIds.baseSepolia,
      )
      await tx.wait()
      console.log('Prove Settlement world state tx: ', tx.hash)
      settlementWorldStateRootLatest = block.stateRoot
      console.log(
        'Proven L1 world state block: ',
        setlementBlock,
        settlementBlockNumberLatest,
      )
      console.log(
        'Proven Settlement world state root:',
        settlementWorldStateRootLatest,
      )
      provedSettlementState = true
      return {
        settlementBlockNumberLatest,
        settlementWorldStateRootLatest,
      }
    } catch (e) {
      errorCount += 1
      console.log('ProveSettlementState errorCount: ', errorCount)
      // if (e.data && s.baseSepoliaProverContract) {
      //   const decodedError = s.baseSepoliaProverContract.interface.parseError(
      //     e.data,
      //   )
      //   console.log(`Transaction failed: ${decodedError?.name}`)
      //   console.log(
      //     `Error in proveSettlementLayerState EcoTestNet:`,
      //     e.shortMessage,
      //   )
      // } else {
      //   console.log(`Error in proveSettlementLayerState EcoTestNet:`, e)
      // }
    }
  }
}

export async function proveSettlementChainInstant() {
  // gameIndex,
  // faultDisputeGameAddress,
  // faultDisputeGameContract,
  // sourceChains,
  console.log('In proveSettlementChainInstant')

  let seetlementBlockData
  const settlementBlockNumber = await s.ecoTestNetl1Block.number()
  // await Promise.all(
  //   await Object.entries(sourceChains).map(
  //     async ([sourceChainkey, sourceChain]) => {
  //       if (sourceChain.needNewProvenState) {
  //         // TODO: remove switch statement and use the sourceChain Layer to get the correct proving mechanism
  //         switch (sourceChain.sourceChain) {
  //           case networkIds.baseSepolia: {
  //             break
  //           }
  //           case networkIds.optimismSepolia: {
  //             endBatchBlockData = await proveWorldStatesCannon(
  //               faultDisputeGameAddress,
  //               faultDisputeGameContract,
  //               gameIndex,
  //             )
  //             break
  //           }
  //           case networkIds.ecoTestNet: {
  //             endBatchBlockData = await proveWorldStatesCannonL2L3(
  //               faultDisputeGameAddress,
  //               faultDisputeGameContract,
  //               gameIndex,
  //             )
  //             break
  //           }
  //           default: {
  //             break
  //           }
  //         }
  //       }
  //     },
  //   ),
  // )
  return endBatchBlockData
}

async function proveIntentEcoTestNet(
  intentHash,
  settlementBlockTag,
  settlementWorldStateRoot,
) {
  console.log('In proveIntentEcoTestNet')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.baseSepoliaProvider.send('eth_getProof', [
    networks.baseSepolia.inbox.address,
    [inboxStorageSlot],
    settlementBlockTag,
    // endBatchBlockData.number,
  ])

  const intentInfo =
    await s.ecoTestNetIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.ecoTestNet, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    const proveIntentTx = await s.ecoTestNetProverContract.proveIntent(
      networkIds.baseSepolia,
      actors.claimant,
      networks.baseSepolia.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.ecoTestNetProverContract.rlpEncodeDataLibList([
        toBeHex(intentInboxProof.nonce), // nonce
        stripZerosLeft(toBeHex(intentInboxProof.balance)),
        intentInboxProof.storageHash,
        intentInboxProof.codeHash,
      ]),
      intentInboxProof.accountProof,
      settlementWorldStateRoot,
      // endBatchBlockData.stateRoot,
    )
    await proveIntentTx.wait()
    console.log('Prove Intent tx:', proveIntentTx.hash)
    return proveIntentTx.hash
  } catch (e) {
    if (e.data && s.ecoTestNetProverContract) {
      const decodedError = s.ecoTestNetProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed in proveIntent : ${decodedError?.name}`)
      console.log('proveIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in proveIntent:`, e)
    }
  }
}

export async function proveIntents(
  intentsToProve,
  settlementBlockTag,
  settlementWorldStateRoot,
) {
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
        // await proveIntentOptimismSepolia(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.ecoTestNet: {
        await proveIntentEcoTestNet(
          intent.intentHash,
          settlementBlockTag,
          settlementWorldStateRoot,
        )
        break
      }
    }
  }
}

async function withdrawRewardEcoTestNet(intentHash) {
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

export async function withdrawFunds(intentsToProve) {
  console.log('In withdrawFunds')
  for (const intent of intentsToProve) {
    console.log('intent: ', intent)
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        await withdrawRewardBaseSepolia(intent.intentHash)
        break
      }
      case networkIds.optimismSepolia: {
        await withdrawRewardOptimismSepolia(intent.intentHash)
        break
      }
      case networkIds.ecoTestNet: {
        await withdrawRewardEcoTestNet(intent.intentHash)
        break
      }
    }
  }
}

async function main() {
  const proveAll: boolean = false
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  // let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    console.log('Instant Settle of Base Sepolia to EcoTestNet')

    // Get all the intents that can be proven for the batch by destination chain
    const { intentsToProve } = await getIntentsToProve(
      // blockNumber,
      proveAll,
    )
    console.log('intentsToProve: ', intentsToProve)
    // Prove the latest batch settled
    const { settlementBlockNumberLatest, settlementWorldStateRootLatest } =
      await proveSettlementChainInstantBaseSepoliaEcoTestNet()
    // Prove all the intents
    console.log('intentsToProve: ', intentsToProve)
    await proveIntents(
      intentsToProve,
      settlementBlockNumberLatest,
      settlementWorldStateRootLatest,
    )
    await withdrawFunds(intentsToProve)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
