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
  toQuantity,
  toNumber,
  toBeHex,
} from 'ethers'
import {
  networkIds,
  networks,
  actors,
  // intent,
} from '../../config/preprod/config'
import { s } from '../../config/preprod/setup'
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

export async function getIntentsToProve(
  // settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get base Last Optimimsm BlockNumber from WorldState

  // const sourceChainConfig = networks.helix.sourceChains
  const sourceChainConfig = [networkIds[8921733]]
  // const sourceChainConfig = [networkIds.helix]
  console.log('sourceChainConfig: ', sourceChainConfig)
  const settlementBlockNumber = await s.helixl1Block.number()
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let helixProvenState
  let scanAllIntentsForInbox = true
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber = networks.base.inbox.deploymentBlock || 0n
  const inboxDeploymentBlock = networks.base.inbox.deploymentBlock || 0n
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      console.log('sourceChain: ', sourceChain)
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      helixProvenState = await proverContract.provenStates(networkIds.base)
      console.log('helixProvenState: ', helixProvenState)
      sourceChainInfo.lastProvenBlock = helixProvenState.blockNumber
      if (proveAll) {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        sourceChainInfo.needNewProvenState = true
        startingBlockNumber = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      } else {
        if (helixProvenState.blockNumber > inboxDeploymentBlock) {
          sourceChainInfo.lastProvenBlock = helixProvenState.blockNumber
          if (helixProvenState.blockNumber < startingBlockNumber) {
            startingBlockNumber = helixProvenState.blockNumber
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
  const intentHashEvents = await s.baseInboxContractSolver.queryFilter(
    s.helixInboxContractSolver.getEvent('Fulfillment'),
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
      console.log('networkIds.helix: ', networkIds.helix)
      if (intentToProve.sourceChain !== networkIds.helix) {
        console.log('intentToProve.sourceChain !== networkIds.helix')
        return false
      } else {
        if (
          intentToProve.blockNumber >
            sourceChains[intentToProve.sourceChain].lastProvenBlock &&
          intentToProve.blockNumber <= settlementBlockNumber
        ) {
          sourceChains[intentToProve.sourceChain].needNewProvenState = true
        } else {
          console.log('intentToProve.sourceChain  blockNumber being rejected')
          console.log('intentToProve.blockNumber: ', intentToProve.blockNumber)
          console.log(
            'sourceChains[intentToProve.sourceChain]: ',
            sourceChains[intentToProve.sourceChain],
          )
          console.log('settlementBlockNumber: ', settlementBlockNumber)
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

async function proveSettlementChainInstantbasehelix() {
  console.log('In proveSettlementChainInstantbasehelix')
  let provedSettlementState = false
  let errorCount = 0
  while (!provedSettlementState) {
    const setlementBlock = await s.helixl1Block.number()
    console.log('setlementBlock: ', setlementBlock)
    const settlementBlockNumberLatest = toQuantity(setlementBlock)

    const block: Block = await s.baseProvider.send('eth_getBlockByNumber', [
      settlementBlockNumberLatest,
      false,
    ])

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
      tx = await s.helixProverContract.proveSettlementLayerState(
        getBytes(hexlify(rlpEncodedBlockData)),
        // networkIds.base,
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
      // if (e.data && s.baseProverContract) {
      //   const decodedError = s.baseProverContract.interface.parseError(
      //     e.data,
      //   )
      //   console.log(`Transaction failed: ${decodedError?.name}`)
      //   console.log(
      //     `Error in proveSettlementLayerState helix:`,
      //     e.shortMessage,
      //   )
      // } else {
      //   console.log(`Error in proveSettlementLayerState helix:`, e)
      // }
    }
  }
}

async function proveIntentHelix(
  intentHash,
  settlementBlockTag,
  settlementWorldStateRoot,
) {
  console.log('In proveIntentHelix')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.baseProvider.send('eth_getProof', [
    networks.base.inbox.address,
    [inboxStorageSlot],
    settlementBlockTag,
    // endBatchBlockData.number,
  ])

  const intentInfo =
    await s.helixIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.helix, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    const proveIntentTx = await s.helixProverContract.proveIntent(
      networkIds.base,
      actors.claimant,
      networks.base.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.helixProverContract.rlpEncodeDataLibList([
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
    if (e.data && s.helixProverContract) {
      const decodedError = s.helixProverContract.interface.parseError(e.data)
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
      case networkIds.base: {
        // await proveIntentbase(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.optimism: {
        // await proveIntentOptimism(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.helix: {
        await proveIntentHelix(
          intent.intentHash,
          settlementBlockTag,
          settlementWorldStateRoot,
        )
        break
      }
    }
  }
}

async function withdrawRewardhelix(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.helixIntentSourceContractClaimant.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.helixIntentSourceContractClaimant) {
      const decodedError =
        s.helixIntentSourceContractClaimant.interface.parseError(e.data)
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
      case networkIds.base: {
        break
      }
      case networkIds.optimism: {
        break
      }
      case networkIds.helix: {
        await withdrawRewardhelix(intent.intentHash)
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
    console.log('Instant Settle of Base Sepolia to helix')

    // Get all the intents that can be proven for the batch by destination chain
    const { intentsToProve } = await getIntentsToProve(
      // blockNumber,
      proveAll,
    )
    console.log('intentsToProve: ', intentsToProve)
    // Prove the latest batch settled
    const { settlementBlockNumberLatest, settlementWorldStateRootLatest } =
      await proveSettlementChainInstantbasehelix()
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
