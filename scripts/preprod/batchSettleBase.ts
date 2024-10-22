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
} from '../../config/preprod/config'
import { s } from '../../config/preprod/setup'

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
  // check the hash is valid
  const hash = keccak256(rlpEncodedBlockData)
  console.log('Hash of RLP Encoded Block Data: ', hash)
  console.log('Block Hash: ', block.hash)
  if (hash !== block.hash) {
    console.log('Hashes do not match')
    throw Error('Hashes do not match')
  }
  return rlpEncodedBlockData
}

export async function getBatchSettledBaseBedrock() {
  console.log('In getBatchSettled')
  // Get the Output Index and Block Number from L2 OUTPUT ORACLE that was sent before this block
  // Get the event from the latest Block checking transaction hash
  const blockNumber = BigInt(await s.mainnetProvider.getBlockNumber())
  const l2OutputOracleEvents =
    await s.mainnetSettlementContractBase.queryFilter(
      s.mainnetSettlementContractBase.getEvent('OutputProposed'),
      toQuantity(blockNumber - 2000n),
      toQuantity(blockNumber),
    )
  console.log(
    'l2OuputOraclEvent: ',
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].blockNumber,
  )
  const endBatchBlockData = await s.mainnetProvider.getBlock(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].blockNumber,
  )
  const l2OutputIndex = toNumber(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[2],
  )
  const l2BlockNumber = BigInt(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[3],
  )

  return {
    endBatchBlockData,
    l2OutputIndex,
    l2BlockNumber,
  }
}

export async function getIntentsToProve(
  settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get Base Last OptimimsmMainnet BlockNumber from WorldState

  const sourceChainConfig = networks.base.sourceChains
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let baseProvenState
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber = networks.base.inbox.deploymentBlock || 0n
  const inboxDeploymentBlock = networks.base.inbox.deploymentBlock
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      baseProvenState = await proverContract.provenStates(networkIds.base)
      sourceChainInfo.lastProvenBlock = baseProvenState.blockNumber
      if (proveAll) {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        sourceChainInfo.needNewProvenState = true
        startingBlockNumber = inboxDeploymentBlock
        scanAllIntentsForInbox = true
      } else {
        if (baseProvenState.blockNumber > inboxDeploymentBlock) {
          sourceChainInfo.lastProvenBlock = baseProvenState.blockNumber
          if (baseProvenState.blockNumber < startingBlockNumber) {
            startingBlockNumber = baseProvenState.blockNumber
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
  const intentHashEvents = await s.baseInboxContractSolver.queryFilter(
    s.baseInboxContractSolver.getEvent('Fulfillment'),
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
async function proveMainnetSettlementLayerStateOnOptimism() {
  console.log('In proveSettlementLayerState on Optimism')
  let provedSettlementState = false
  let errorCount = 0
  while (!provedSettlementState) {
    const setlementBlock = await s.optimisml1Block.number()
    const settlementBlockTag = toQuantity(setlementBlock)

    const block: Block = await s.mainnetProvider.send('eth_getBlockByNumber', [
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
      tx = await s.optimismProverContract.proveSettlementLayerState(
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
        'Proven Settlement world state root:',
        settlementWorldStateRoot,
      )
      provedSettlementState = true
      return { settlementBlockTag, settlementWorldStateRoot }
    } catch (e) {
      errorCount += 1
      console.log('ProveSettlementState errorCount: ', errorCount)
    }
  }
}

async function proveWorldStateBedrockOnOptimismForBase(
  l2OutputIndex,
  l2BlockNumber,
  settlementBlockTag,
  settlementWorldStateRoot,
) {
  console.log('In proveWorldStateBedrockOnOptimismForBase')
  const endBatchBlockHex = toQuantity(l2BlockNumber)
  // const endBatchBlockHex = l3BlockNumber
  console.log('End Batch Block Number: ', endBatchBlockHex)
  const endBatchBlockData = await s.baseProvider.send('eth_getBlockByNumber', [
    endBatchBlockHex,
    false,
  ])
  const rlpEncodedBlockData = await getRLPEncodedBlock(endBatchBlockData)
  const l1BatchIndex = l2OutputIndex
  console.log('l1BatchIndex: ', l1BatchIndex)
  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.baseProvider.send('eth_getProof', [
    networks.base.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])

  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBeArray(networks.base.proving.l2OutputOracleSlotNumber),
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

  const layer1BaseOutputOracleProof = await s.mainnetProvider.send(
    'eth_getProof',
    [
      networks.mainnet.settlementContracts.base,
      [l1BatchSlot],
      settlementBlockTag,
    ],
  )
  const layer1BaseOutputOracleContractData = [
    toBeHex(layer1BaseOutputOracleProof.nonce), // nonce
    stripZerosLeft(toBeHex(layer1BaseOutputOracleProof.balance)), // balance
    layer1BaseOutputOracleProof.storageHash, // storageHash
    layer1BaseOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    console.log('settlemntBlockTag: ', settlementBlockTag)
    console.log('l1batchSlot: ', l1BatchSlot)
    console.log('Proving World State Bedrock on Optimism')
    console.log('Network ID: ', networkIds.base)
    console.log('RLP Encoded Block Data: ', rlpEncodedBlockData)
    console.log(
      'End Batch Block Data State Root: ',
      endBatchBlockData.stateRoot,
    )
    console.log('Message Passer Proof: ', l2MesagePasserProof.storageHash)
    console.log('L1 Batch Index: ', l1BatchIndex)
    console.log(
      'Layer1 Base Output Oracle Stoirage Proof: ',
      layer1BaseOutputOracleProof.storageProof[0].proof,
    )
    console.log(
      'Layer1 Base Output Oracle Contract Data: ',
      await s.optimismProverContract.rlpEncodeDataLibList(
        layer1BaseOutputOracleContractData,
      ),
    )
    console.log(
      'Layer1 Base Output Oracle Account Proof: ',
      layer1BaseOutputOracleProof.accountProof,
    )
    console.log('Settlement World State Root: ', settlementWorldStateRoot)
    const proveOutputTX = await s.optimismProverContract.proveWorldStateBedrock(
      networkIds.base,
      rlpEncodedBlockData,
      endBatchBlockData.stateRoot,
      l2MesagePasserProof.storageHash,
      // endBatchBlockData.hash,
      l1BatchIndex,
      layer1BaseOutputOracleProof.storageProof[0].proof,
      await s.optimismProverContract.rlpEncodeDataLibList(
        layer1BaseOutputOracleContractData,
      ),
      layer1BaseOutputOracleProof.accountProof,
      settlementWorldStateRoot,
    )
    await proveOutputTX.wait()
    console.log(
      'Prove Bedrock L2 World State base on Optimism tx: ',
      proveOutputTX.hash,
    )
    return endBatchBlockData
  } catch (e) {
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
      console.log(
        `Transaction failed in proveWorldStateBedrock base on Optimism: ${decodedError?.name}`,
      )
      console.log('Error: ', e)
      console.log(
        `Error in proveWorldStateBedrock base on Optimism:`,
        e.shortMessage,
      )
    } else {
      console.log(`Error in proveWorldStateBedrock baseon Optimism:`, e)
    }
  }
}

export async function proveDestinationChainBatchSettled(
  l2OutputIndex,
  l2BlockNumber,
  sourceChains,
) {
  console.log('In proveDestinationChainBatchSettled')
  let endBatchBlockData
  const { settlementBlockTag, settlementWorldStateRoot } =
    await proveMainnetSettlementLayerStateOnOptimism()
  await Promise.all(
    await Object.entries(sourceChains).map(
      async ([sourceChainkey, sourceChain]) => {
        if (sourceChain.needNewProvenState) {
          // TODO: remove switch statement and use the sourceChain Layer to get the correct proving mechanism
          switch (sourceChain.sourceChain) {
            case networkIds.base: {
              // endBatchBlockData = await proveWorldStatesBedrockL3L2Base(
              //   faultDisputeGameAddress,
              //   faultDisputeGameContract,
              //   gameIndex,
              //   l3OutputIndex,
              //   l3BlockNumber,
              // )
              break
            }
            case networkIds.optimism: {
              endBatchBlockData = await proveWorldStateBedrockOnOptimismForBase(
                l2OutputIndex,
                l2BlockNumber,
                settlementBlockTag,
                settlementWorldStateRoot,
              )
              break
            }
            case networkIds.helix: {
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

async function proveIntentBase(intentHash, endBatchBlockData) {
  console.log('In proveIntentBase')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.optimismProvider.send('eth_getProof', [
    networks.optimism.inbox.address,
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
      networks.optimism.inbox.address,
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

async function proveIntentOptimism(intentHash, endBatchBlockData) {
  console.log('In proveIntentOptimism')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.baseProvider.send('eth_getProof', [
    networks.base.inbox.address,
    [inboxStorageSlot],
    endBatchBlockData.number,
  ])

  const intentInfo =
    await s.optimismIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.optimism, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )

  try {
    const proveIntentTx = await s.optimismProverContract.proveIntent(
      networkIds.base,
      actors.claimant,
      networks.base.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.optimismProverContract.rlpEncodeDataLibList([
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
    if (e.data && s.optimismProverContract) {
      const decodedError = s.optimismProverContract.interface.parseError(e.data)
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
      case networkIds.base: {
        await proveIntentBase(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.optimism: {
        await proveIntentOptimism(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.helix: {
        // will use instantSettle for this
        // await proveIntentHelix(intent.intentHash, endBatchBlockData)
        break
      }
    }
  }
}

async function withdrawRewardBase(intentHash) {
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

async function withdrawRewardOptimism(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.optimismIntentSourceContractClaimant.withdrawRewards(intentHash)
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.optimismIntentSourceContractClaimant) {
      const decodedError =
        s.optimismIntentSourceContractClaimant.interface.parseError(e.data)
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
        await withdrawRewardBase(intent.intentHash)
        break
      }
      case networkIds.optimism: {
        await withdrawRewardOptimism(intent.intentHash)
        break
      }
      case networkIds.helix: {
        // will use instantSettle for this
        // await withdrawRewardHelix(intent.intentHash)
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
    console.log('Batch Settle of Base Mainnet')
    // Get the latest Batch Settled for Base Mainnet
    const { l2OutputIndex, l2BlockNumber } = await getBatchSettledBaseBedrock()

    // Get all the intents that can be proven for the batch by destination chain
    const { sourceChains, intentsToProve } = await getIntentsToProve(
      l2BlockNumber,
      proveAll,
    )
    // Prove the latest batch settled
    const endBatchBlockData = await proveDestinationChainBatchSettled(
      l2OutputIndex,
      l2BlockNumber,
      sourceChains,
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
