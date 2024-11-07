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
  console.log('In getBatchSettled')
  // // Get the Output Index and Block Number from L2 OUTPUT ORACLE that was sent before this block
  // // Get the event from the latest Block checking transaction hash
  const blockNumber = BigInt(await s.baseSepoliaProvider.getBlockNumber())
  const l2OutputOracleEvents =
    await s.baseSepoliaSettlementContractEcoTestNet.queryFilter(
      s.baseSepoliaSettlementContractEcoTestNet.getEvent('OutputProposed'),
      toQuantity(blockNumber - 2000n),
      toQuantity(blockNumber),
    )
  console.log(
    'l2OuputOraclEvent: ',
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].blockNumber,
  )
  const endBatchBlockDataL2 = await s.baseSepoliaProvider.getBlock(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].blockNumber,
  )
  const l3OutputIndex = toNumber(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[2],
  )
  const l3BlockNumber = BigInt(
    l2OutputOracleEvents[l2OutputOracleEvents.length - 1].topics[3],
  )

  return {
    endBatchBlockDataL2,
    l3OutputIndex,
    l3BlockNumber,
  }
}

export async function getIntentsToProve(
  settlementBlockNumber: BigInt,
  proveAll: boolean,
) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  const sourceChainConfig = networks.ecoTestNet.sourceChains
  const sourceChains: Record<number, SourceChainInfo> = {}
  // get the starting block to scan for intents
  let ecoTestNetProvenState
  let scanAllIntentsForInbox = false
  // TODO change to use contract factory for deploys then can use ethers deploymentTransaction to get the blockNumber
  let startingBlockNumber = networks.ecoTestNet.inbox.deploymentBlock || 0n
  const inboxDeploymentBlock = networks.ecoTestNet.inbox.deploymentBlock || 0n
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      ecoTestNetProvenState = await proverContract.provenStates(
        networkIds.ecoTestNet,
      )
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
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents = await s.ecoTestNetInboxContractSolver.queryFilter(
    s.ecoTestNetInboxContractSolver.getEvent('Fulfillment'),
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
}

// Include individual proving Mechanisms for each sourceChain

// TODO: Consolidate the multiple functions into a parameterized function

async function proveSepoliaSettlementLayerStateOnBaseSepolia() {
  console.log('In proveSettlementLayerState on BaseSepolia')
  let provedSettlementState = false
  let errorCount = 0
  while (!provedSettlementState) {
    const setlementBlock = await s.baseSepolial1Block.number()
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
      tx = await s.baseSepoliaProverContract.proveSettlementLayerState(
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
        'Proven Settlement world state root baseSepolia:',
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

async function proveSelfStateBaseSepolia(
  settlementBlockTag,
  settlementStateRoot,
  endBatchBlockDataL2,
) {
  console.log('In proveSelfStateBaseSepolia')
  let provedSelfState = false
  let errorCount = 0
  while (!provedSelfState) {
    const baseBlockNumber = await s.baseSepoliaProvider.getBlockNumber()
    const baseBlockTag = toQuantity(baseBlockNumber)

    const block: Block = await s.baseSepoliaProvider.send(
      'eth_getBlockByNumber',
      [baseBlockTag, false],
    )

    let tx
    let baseWorldStateRoot
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
      tx = await s.baseSepoliaProverContract.proveSelfState(
        getBytes(hexlify(rlpEncodedBlockData)),
      )
      await tx.wait()
      baseWorldStateRoot = block.stateRoot
      provedSelfState = true
      return { baseBlockTag, baseWorldStateRoot }
    } catch (e) {
      errorCount += 1
      console.log('proveSelfStateBaseSepolia errorCount: ', errorCount)
      console.log(`Error in ProveWorldStateBaseSepoliaOnBaseSepolia:`, e)
    }
  }
}

async function proveWorldStateBedrockOnBaseSepoliaforEcoTestNet(
  l3OutputIndex,
  l3BlockNumber,
  baseBlockTag,
  baseWorldStateRoot,
) {
  console.log('In proveWorldStateBedrockOnBaseSepoliaforEcoTestNet')
  const endBatchBlockHex = toQuantity(l3BlockNumber)
  // const endBatchBlockHex = l3BlockNumber
  const endBatchBlockData = await s.ecoTestNetProvider.send(
    'eth_getBlockByNumber',
    [endBatchBlockHex, false],
  )
  const rlpEncodedBlockData = await getRLPEncodedBlock(endBatchBlockData)
  const l1BatchIndex = l3OutputIndex
  // Get the Message Parser State Root at the end block of the batch
  const l2MesagePasserProof = await s.ecoTestNetProvider.send('eth_getProof', [
    networks.ecoTestNet.proving.l2l1MessageParserAddress,
    [],
    endBatchBlockHex,
  ])
  // Get the storage Slot information
  // l1BatchSlot = calculated from the batch number *2 + output slot 3
  // In Solidity
  // bytes32 outputRootStorageSlot =
  // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  const arrayLengthSlot = zeroPadValue(
    toBeArray(networks.ecoTestNet.proving.l2OutputOracleSlotNumber),
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

  const layer1EcoTestNetOutputOracleProof = await s.baseSepoliaProvider.send(
    'eth_getProof',
    [
      networks.baseSepolia.settlementContracts.ecoTestNet,
      [l1BatchSlot],
      baseBlockTag,
    ],
  )
  const layer1EcoTestNetOutputOracleContractData = [
    toBeHex(layer1EcoTestNetOutputOracleProof.nonce), // nonce
    stripZerosLeft(toBeHex(layer1EcoTestNetOutputOracleProof.balance)), // balance
    layer1EcoTestNetOutputOracleProof.storageHash, // storageHash
    layer1EcoTestNetOutputOracleProof.codeHash, // CodeHash
  ]
  try {
    const proveOutputTX =
      await s.baseSepoliaProverContract.proveWorldStateBedrock(
        networkIds.ecoTestNet,
        rlpEncodedBlockData,
        endBatchBlockData.stateRoot,
        l2MesagePasserProof.storageHash,
        // endBatchBlockData.hash,
        l1BatchIndex,
        layer1EcoTestNetOutputOracleProof.storageProof[0].proof,
        await s.baseSepoliaProverContract.rlpEncodeDataLibList(
          layer1EcoTestNetOutputOracleContractData,
        ),
        layer1EcoTestNetOutputOracleProof.accountProof,
        baseWorldStateRoot,
      )
    await proveOutputTX.wait()
    console.log(
      'Prove Bedrock L3 World State baseSepolia tx: ',
      proveOutputTX.hash,
    )
  } catch (e) {
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(
        `Transaction failed in proveWorldStateBedrock baseSepolia: ${decodedError?.name}`,
      )
      console.log('Error: ', e)
      console.log(
        `Error in proveWorldStateBedrock baseSepolia:`,
        e.shortMessage,
      )
    } else {
      console.log(`Error in proveWorldStateBedrock baseSepolia:`, e)
    }
  }
}

async function proveWorldStatesBedrockL3L2Base(
  endBatchBlockDataL2,
  l3OutputIndex,
  l3BlockNumber,
) {
  console.log('In proveWorldStatesBedrockL3L2Base')
  const { settlementBlockTag, settlementWorldStateRoot } =
    await proveSepoliaSettlementLayerStateOnBaseSepolia() // Prove the Sepolia Settlement Layer State

  // Prove Selt State on Base Sepolia
  const { baseBlockTag, baseWorldStateRoot } = await proveSelfStateBaseSepolia(
    settlementBlockTag,
    settlementWorldStateRoot,
    endBatchBlockDataL2,
  )
  // Prove ECO TestNet World State on Base Sepolia
  await proveWorldStateBedrockOnBaseSepoliaforEcoTestNet(
    l3OutputIndex,
    l3BlockNumber,
    baseBlockTag,
    baseWorldStateRoot,
  )
}

export async function proveDestinationChainBatchSettled(
  sourceChains,
  endBatchBlockDataL2,
  l3OutputIndex,
  l3BlockNumber,
) {
  console.log('In proveDestinationChainBatchSettled')
  await Promise.all(
    await Object.entries(sourceChains).map(
      async ([sourceChainkey, sourceChain]) => {
        if (sourceChain.needNewProvenState) {
          // TODO: remove switch statement and use the sourceChain Layer to get the correct proving mechanism
          switch (sourceChain.sourceChain) {
            case networkIds.baseSepolia: {
              await proveWorldStatesBedrockL3L2Base(
                endBatchBlockDataL2,
                l3OutputIndex,
                l3BlockNumber,
              )
              break
            }
            case networkIds.optimismSepolia: {
              break
            }
            case networkIds.ecoTestNet: {
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
}

async function proveIntentBaseSepolia(intentHash, l3BlockNumber) {
  console.log('In proveIntentBaseSepolia')
  console.log('intentHash: ', intentHash)
  const endBatchBlockData: Block = await s.ecoTestNetProvider.send(
    'eth_getBlockByNumber',
    [toQuantity(l3BlockNumber), false],
  )
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.ecoTestNetProvider.send('eth_getProof', [
    networks.ecoTestNet.inbox.address,
    [inboxStorageSlot],
    toQuantity(endBatchBlockData.number),
  ])

  const intentInfo =
    await s.baseSepoliaIntentSourceContractClaimant.getIntent(intentHash)

  const abiCoder = AbiCoder.defaultAbiCoder()
  const intermediateHash = keccak256(
    abiCoder.encode(
      ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
      [
        networkIds.baseSepolia, // sourceChainID
        intentInfo[1], // destinationChainID
        intentInfo[2], // targetTokens
        intentInfo[3], // callData
        intentInfo[6], // expiryTime
        getBytes(intentInfo[8]), // nonce),
      ],
    ),
  )
  try {
    const proveIntentTx = await s.baseSepoliaProverContract.proveIntent(
      networkIds.ecoTestNet,
      actors.claimant,
      networks.ecoTestNet.inbox.address,
      intermediateHash,
      intentInboxProof.storageProof[0].proof,
      await s.baseSepoliaProverContract.rlpEncodeDataLibList([
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
    if (e.data && s.baseSepoliaProverContract) {
      const decodedError = s.baseSepoliaProverContract.interface.parseError(
        e.data,
      )
      console.log(`Transaction failed in proveIntent : ${decodedError?.name}`)
      console.log('proveIntent decodedError: ', decodedError)
    } else {
      console.log(`Error in proveIntent:`, e)
    }
  }
}

async function proveIntentEcoTestNet(intentHash, endBatchBlockData) {
  console.log('In proveIntentEcoTestNet')
  const inboxStorageSlot = solidityPackedKeccak256(
    ['bytes'],
    [s.abiCoder.encode(['bytes32', 'uint256'], [intentHash, 1])],
  )
  const intentInboxProof = await s.baseSepoliaProvider.send('eth_getProof', [
    networks.baseSepolia.inbox.address,
    [inboxStorageSlot],
    endBatchBlockData.number,
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
      endBatchBlockData.stateRoot,
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

export async function proveIntents(intentsToProve, l3BlockNumber) {
  // loop through chainIds and intents
  // prove each intent
  console.log('In proveIntents')
  for (const intent of intentsToProve) {
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        await proveIntentBaseSepolia(intent.intentHash, l3BlockNumber)
        break
      }
      case networkIds.optimismSepolia: {
        // await proveIntentOptimismSepolia(intent.intentHash, endBatchBlockData)
        break
      }
      case networkIds.ecoTestNet: {
        await proveIntentEcoTestNet(intent.intentHash, l3BlockNumber)
        break
      }
    }
  }
}

async function withdrawRewardBaseSepolia(intentHash) {
  console.log('In withdrawReward')
  try {
    const withdrawTx =
      await s.baseSepoliaIntentSourceContractClaimant.withdrawRewards(
        intentHash,
      )
    await withdrawTx.wait()
    console.log('Withdrawal tx: ', withdrawTx.hash)
    return withdrawTx.hash
  } catch (e) {
    if (e.data && s.baseSepoliaIntentSourceContractClaimant) {
      const decodedError =
        s.baseSepoliaIntentSourceContractClaimant.interface.parseError(e.data)
      console.log(
        `Transaction failed in withdrawReward : ${decodedError?.name}`,
      )
    } else {
      console.log(`Error in withdrawReward:`, e)
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
    switch (intent.sourceChain) {
      case networkIds.baseSepolia: {
        await withdrawRewardBaseSepolia(intent.intentHash)
        break
      }
      case networkIds.optimismSepolia: {
        // await withdrawRewardOptimismSepolia(intent.intentHash)
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
  const proveAll: boolean = true
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  try {
    console.log('In Main')
    console.log('Batch Settle of Eco Testnet')
    // Get the latest Batch Settled for Base Sepolia
    const { endBatchBlockDataL2, l3OutputIndex, l3BlockNumber } =
      await getBatchSettled()
    // Get all the intents that can be proven for the batch by destination chain
    const { sourceChains, intentsToProve } = await getIntentsToProve(
      l3BlockNumber,
      proveAll,
    )
    // Prove the latest batch settled
    await proveDestinationChainBatchSettled(
      sourceChains,
      endBatchBlockDataL2,
      l3OutputIndex,
      l3BlockNumber,
    )
    // Prove all the intents
    await proveIntents(intentsToProve, l3BlockNumber)
    await withdrawFunds(intentsToProve)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
