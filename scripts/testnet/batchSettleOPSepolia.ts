import {
  // AbiCoder,
  // Block,
  Contract,
  // encodeRlp,
  getAddress,
  // getBytes,
  // hexlify,
  // keccak256,
  // solidityPackedKeccak256,
  stripZerosLeft,
  // toBeArray,
  toQuantity,
  toNumber,
  // zeroPadValue,
  // toBeHex,
} from 'ethers'
import {
  networkIds,
  networks,
  // actors,
  // intent,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'
import * as FaultDisputeGameArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/FaultDisputeGame.sol/FaultDisputeGame.json'
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

export async function getBatchSettled() {
  // Get the latest resolved fault dispute game
  // Get the GameId information for the fault dispute game
  // return faultDisputeGame address, gameId, blockNumber
  // Recommend making approximateUnsettledGames configurable and could go as high as 84 but safest is zero.
  console.log('In getFaultDisputeGame')
  const disputeGameFactoryContract = s.sepoliaSettlementContractOptimism
  const approximateUnsettledGames = 320n // Initial Test on Sepolia gave 327
  let gameIndex =
    (await disputeGameFactoryContract.gameCount()) -
    1n -
    approximateUnsettledGames
  // lastGame = 1712n
  console.log('Starting lastGame: ', gameIndex.toString())
  while (gameIndex > 0) {
    const gameData = await disputeGameFactoryContract.gameAtIndex(gameIndex)
    const faultDisputeGameAddress = gameData.proxy_
    const faultDisputeGameContract = new Contract(
      faultDisputeGameAddress,
      FaultDisputeGameArtifact.abi,
      s.sepoliaProvider,
    )
    const faultDisputeGameResolvedEvents =
      await faultDisputeGameContract.queryFilter(
        faultDisputeGameContract.getEvent('Resolved'),
      )
    if (faultDisputeGameResolvedEvents.length !== 0) {
      const blockNumber = await faultDisputeGameContract.l2BlockNumber()
      return {
        blockNumber,
        gameIndex,
        faultDisputeGameAddress,
        faultDisputeGameContract,
      }
    }
    gameIndex -= 1n
  }
}
export async function getIntentsToProve(settlementBlockNumber: BigInt) {
  // get BaseSepolia Last OptimimsmSepolia BlockNumber from WorldState

  const sourceChainConfig = networks.optimismSepolia.sourceChains
  const sourceChains: Record<number, SourceChainInfo> = {}
  // const intentToProve: Intent = {} as Intent
  //  intentsToProve: Intents = []

  // get the starting block to scan for intents
  let optimismSepoliaProvenState
  let startingBlockNumber = 0n
  let scanAllIntentsForInbox = false
  startingBlockNumber = networks.optimismSepolia.proverContractDeploymentBlock
  const inboxDeploymentBlock = networks.optimismSepolia.inbox.deploymentBlock
  // TODO: Parmaeterize the calls to provenStates and remove switch
  for (const sourceChain of sourceChainConfig) {
    const sourceChainInfo: SourceChainInfo = {} as SourceChainInfo
    try {
      sourceChainInfo.sourceChain = networkIds[sourceChain]
      // @ts-ignore
      const proverContract = s[`${sourceChain}ProverContract`] as Contract
      optimismSepoliaProvenState = await proverContract.provenStates(
        // await s.[sourceChain]ProverContract.provenStates(
        networkIds.optimismSepolia,
      )
      sourceChainInfo.sourceChain = networkIds.sourceChainInfo.lastProvenBlock =
        optimismSepoliaProvenState.blockNumber
      if (optimismSepoliaProvenState.blockNumber > inboxDeploymentBlock) {
        sourceChainInfo.lastProvenBlock = optimismSepoliaProvenState.blockNumber
        if (optimismSepoliaProvenState.blockNumber < startingBlockNumber) {
          startingBlockNumber = optimismSepoliaProvenState.blockNumber
        }
      } else {
        sourceChainInfo.lastProvenBlock = inboxDeploymentBlock
        scanAllIntentsForInbox = true
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
  console.log('sourceChains: ', sourceChains)
  console.log('startingBlockNumber: ', startingBlockNumber.toString())

  //   if (optimismSepoliaBlockNumber > settlementBlockNumber) {
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents =
    await s.optimismSepoliaInboxContractSolver.queryFilter(
      s.optimismSepoliaInboxContractSolver.getEvent('Fulfillment'),
      toQuantity(startingBlockNumber),
      toQuantity(settlementBlockNumber),
    )
  console.log('intentHashEvents.length: ', intentHashEvents.length)
  // for (const intentHashEvent of intentHashEvents) {
  //   // add them to the intents to prove
  //   intentToProve.sourceChain = toNumber(intentHashEvent.topics[2])
  //   intentToProve.intentHash = intentHashEvent.topics[1]
  //   intentToProve.claimant = getAddress(
  //     stripZerosLeft(intentHashEvent.topics[3]),
  //   )
  //   intentToProve.blockNumber = BigInt(intentHashEvent.blockNumber)
  //   // TODO: Filter out intents that have already been proven
  //   // Note this can use the proventStates from the Prover Contract
  //   // but also need to cater for the case where the proven World state is updated but the intents not proven
  //   // also mark needProvenState as true for the chains which have new intents to prove

  //   // intentsToProve.push(intentToProve)
  // }
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
      // False removes it true keeps it
      console.log('intentToProve.sourceChain: ', intentToProve.sourceChain)
      return (
        intentToProve.blockNumber <
        sourceChains[intentToProve.sourceChain].lastProvenBlock
      )
    })

  console.log('intentsToProve: ', intentsToProve)
  return { sourceChains, intentsToProve }
  // return [chainId, intentHash, intentFulfillTransaction]
}
export async function proveOpSepoliaBatchSettled(
  blockNumber,
  gameIndex,
  faultDisputeGameAddress,
  faultDisputeGameContract,
  sourceChains,
  intentsToProve,
) {
  console.log('In proveOpSepoliaBatchSettled')
}
export async function proveIntents(sourceChains, intentsToProve) {
  // loop through chainIds and intents
  // On new chainId, update the chains Optimism WorldState (and Ethereum and Base if needed)
  // prove each intent
  console.log('In proveIntents')
}

export async function withdrawFunds(sourceChains, intentsToProve) {
  // loop through chainIds and intents
  // On new chainId, update the chains Optimism WorldState (and Ethereum and Base if needed)
  // prove each intent
  console.log('In withdrawFunds')
}

async function main() {
  // define the variables used for each state of the intent lifecycle
  // Point in time proving for latest batch
  // let intentHash, intentFulfillTransaction
  try {
    console.log('In Main')
    console.log('Batch Settle of OP Sepolia')
    // Get the latest Batch Settled for OP Sepolia
    const {
      blockNumber,
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
    } = await getBatchSettled()
    console.log('blockNumber: ', blockNumber)
    console.log('gameIndex: ', gameIndex.toString())
    console.log('faultDisputeGameAddress: ', faultDisputeGameAddress)

    // Get all the intents that can be proven for the batch by destination chain
    const { sourceChains, intentsToProve } =
      await getIntentsToProve(blockNumber)
    // Prove the latest batch settled
    await proveOpSepoliaBatchSettled(
      blockNumber,
      gameIndex,
      faultDisputeGameAddress,
      faultDisputeGameContract,
      sourceChains,
      intentsToProve,
    )
    // Prove all the intents
    await proveIntents(sourceChains, intentsToProve)
    await withdrawFunds(sourceChains, intentsToProve)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
