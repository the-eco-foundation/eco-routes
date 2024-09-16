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
  intent,
} from '../../config/testnet/config'
import { s } from '../../config/testnet/setup'
import * as FaultDisputeGameArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/FaultDisputeGame.sol/FaultDisputeGame.json'

type Intent = {
  sourceChain: number
  intentHash: string
  claimant: string
}
type Intents = Intent[]

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
  const sourceChainIds = ['baseSepolia', 'ecoTestNet']
  const intentToProve: Intent = {} as Intent
  const intentsToProve: Intents = []

  //   let optimismSepoliaBlockNumber = `networks.${'optimismSepolia'}.proverContractDeploymentBlock`
  let optimismSepoliaBlockNumber =
    networks.optimismSepolia.proverContractDeploymentBlock
  try {
    const baseSepoliaOptimismSepoliaProvenState =
      await s.baseSepoliaProverContract.provenStates(networkIds.optimismSepolia)
    optimismSepoliaBlockNumber =
      baseSepoliaOptimismSepoliaProvenState.blockNumber
  } catch (e) {
    console.log('Error in getIntentsToProve: ', e.message)
  }
  console.log(
    'optimismSepoliaBlockNumber: ',
    optimismSepoliaBlockNumber.toString(),
  )
  //   if (optimismSepoliaBlockNumber > settlementBlockNumber) {
  // Get the event from the latest Block checking transaction hash
  const intentHashEvents =
    await s.optimismSepoliaInboxContractSolver.queryFilter(
      s.optimismSepoliaInboxContractSolver.getEvent('Fulfillment'),
      toQuantity(optimismSepoliaBlockNumber),
      toQuantity(settlementBlockNumber),
    )
  console.log('intentHashEvents.length: ', intentHashEvents.length)
  for (const intentHashEvent of intentHashEvents) {
    // add them to the intents to prove
    intentToProve.sourceChain = toNumber(intentHashEvent.topics[2])
    intentToProve.intentHash = intentHashEvent.topics[1]
    intentToProve.claimant = getAddress(
      stripZerosLeft(intentHashEvent.topics[3]),
    )
    intentsToProve.push(intentToProve)
    console.log('intentsToProve: ', intentsToProve)
  }
  //   }
  // get all the intents from that to the latest resolved Optimism blockNumber
  // get Eco Testnet Last OptimimsmSepolia BlockNumber from WorldState
  // get all the intents from that to the latest resolved Optimism blockNumber
  // return [chainId, intentHash, intentFulfillTransaction]
}
export async function proveOpSepoliaBatchSettled() {}
export async function proveIntents() {
  // loop through chainIds and intents
  // On new chainId, update the chains Optimism WorldState (and Ethereum and Base if needed)
  // prove each intent
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
    await getIntentsToProve(blockNumber)
    // Prove the latest batch settled
    await proveOpSepoliaBatchSettled()
    // Prove all the intents
    await proveIntents()
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
