// proveOutput Root This calls two functions
// generateOutput - checks the state of the L1L2MessageParser (the contract that stores the L1(Sepolia)
// Blocks on L2 Destination(Sepolia Base) to make sure that the last block in the L1Batch for the fullfillment transaction (Sepolia Base)
//  been settled on L1 and replicated back to L2 Destination (Sepolia Base).
//
// proveIntent - checks that the intent has been proved on the Destination Chain (Base Sepolia)
// and the L1 (Sepolia) World State for that Batch has been updated as settled.
// If so it then marks the intent as proved on the Source Chain (Optimism Sepolia). So the funds can be claimed.

import {
  Block,
  Provider,
  hexlify,
  keccak256,
  Wallet,
  Signer,
  AlchemyProvider,
} from 'ethers'
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import { ethers } from 'hardhat'
import { toBytes, numberToHex } from 'viem'
import { Prover, Prover__factory } from '../typechain-types'

// Deployment Keys
const DEPLOY_PRIVATE_KEY = process.env.DEPLOY_PRIVATE_KEY || ''
const PROVER_PRIVATE_KEY = process.env.PROVER_PRIVATE_KEY || ''
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

// Chaiin Connection Configuration
const L1_NETWORK = 'sepolia'
const L1Provider = new AlchemyProvider(L1_NETWORK, ALCHEMY_API_KEY)
const L1signer: Signer = new Wallet(DEPLOY_PRIVATE_KEY, L1Provider)
const L2SourceNetwork = 'optimism-sepolia'
const L2SourceProvider = new AlchemyProvider(L2SourceNetwork, ALCHEMY_API_KEY)
const L2SourceSigner: Signer = new Wallet(PROVER_PRIVATE_KEY, L2SourceProvider)
const L2DestinationNetwork = 'base-sepolia'
const L2DestinationProvider = new AlchemyProvider(
  L2DestinationNetwork,
  ALCHEMY_API_KEY,
)
const L2DestinationSigner: Signer = new Wallet(
  PROVER_PRIVATE_KEY,
  L2DestinationProvider,
)

// Source Chain (Optimism Sepolia) Contracts and Data

// Destination Chain (Optimism Base) Contracts and Data
const proverAddress =
  process.env.PROVER_CONTRACT_ADDRESS ||
  '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'
const txToProve =
  process.env.FULFILLMENT_TRANSACTION ||
  '0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee'
const fullfillmentL1Block = Number(process.env.FULFILLMENT_L1BLOCK || '0')
const l1BatchEndBlockUsed = Number(process.env.FULFILLMENT_L1BLOCK || '6054921')
const BATCH_INDEX = Number(process.env.FULFILLMENT_BLOCK_BATCH || '82785')
const inboxContract = ethers.getAddress(
  process.env.INBOX_ADDRESS || '0xCfC89c06B5499ee50dfAf451078D85Ad71D76079',
)
const intentHash =
  process.env.INTENT_HASH ||
  '0x4321000000000000000000000000000000000000000000000000000000000000'
const inboxStorageSlot = ethers.solidityPackedKeccak256(
  ['bytes'],
  [
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [intentHash, 0],
    ),
  ],
)
console.log('inboxStorageSlot: ', inboxStorageSlot)
const l2L1MessageParserAddress = ethers.getAddress(
  process.env.L2_L1_MESSAGE_PASSER_ADDRESS ||
    '0x4200000000000000000000000000000000000016',
)

// L1 CHAIN (Sepolia) Contracts and data
const L2DestinationOutputOracleAddress = ethers.getAddress(
  process.env.L2_OUTPUT_ORACLE_ADDRESS ||
    '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
) // sepolia address

async function main() {
  // generateProof

  // Get the transaction  we want to prove
  const txDetails = await L2DestinationProvider.getTransaction(txToProve)
  const txBlock = txDetails!.blockNumber
  const txBlockHex = hexlify(toBytes(txBlock || 0))
  // console.log('txBlock:', txBlock)
  // console.log('txBlockHex:', txBlockHex)

  // get the L1 (Sepolia) OUTPUT Oracle Contract which records all the batches settled
  // from Base Sepolia to Sepolia
  const baseOutputContract = await ethers.ContractFactory.fromSolidity(
    L2OutputArtifact,
    L1signer,
  ).attach(L2DestinationOutputOracleAddress)
  const prover: Prover = await Prover__factory.connect(
    proverAddress,
    L2SourceSigner,
  )
  const outputIndex = await baseOutputContract.getL2OutputIndexAfter(txBlock)
  // console.log('outputIndex: ', outputIndex)
  const outputData = await baseOutputContract.getL2OutputAfter(txBlock)
  const l2EndBatchBlock = hexlify(toBytes(outputData.l2BlockNumber))
  console.log('l2EndBatchBlock:', l2EndBatchBlock)

  // eslint-disable-next-line no-unused-vars
  const outputRoot = outputData.outputRoot
  // console.log('outputRoot:', outputRoot)

  // Get the Destination Chain (Optimism Base) last block in L1 Settlement Batch information
  const l2OutputStorageRoot = (
    await L2DestinationProvider.send('eth_getBlockByNumber', [
      l2EndBatchBlock,
      false,
    ])
  ).stateRoot
  const L2_BATCH_LATEST_BLOCK_HASH = (
    await L2DestinationProvider.send('eth_getBlockByNumber', [
      l2EndBatchBlock,
      false,
    ])
  ).hash
  console.log('l2OutputStorageRoot: ', l2OutputStorageRoot)

  // Get the Proof on the Destination Chain (Base Sepilia) for the
  // Inbox Contract - that processes fulfillments
  // Storage Slot - of the intent that we fulfilled
  // End L1 Batch Block - the block who's state we are querying the Inbox Contract at
  const proof = await L2DestinationProvider.send('eth_getProof', [
    inboxContract,
    [inboxStorageSlot],
    l2EndBatchBlock,
  ])
  console.log('inboxContract: ', inboxContract)
  console.log('inboxStorageSlot: ', inboxStorageSlot)
  console.log('l2EndBatchBlock: ', l2EndBatchBlock)
  console.log('proof: ', proof)

  // Get the proof on the Destination Chain (Base Sepolia) for the
  // L2l1MessageParser - The contract which stores the messages passed from L1 (Sepolia) to L2 Destination (Sepolia Base)
  // Storage Slot - not used
  // txBlockHex - The Block which the intent was fulfilled
  // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
  const L2_MESSAGE_PASSER_STORAGE_ROOT = await L2DestinationProvider.send(
    'eth_getProof',
    [l2L1MessageParserAddress, [], txBlockHex],
  )

  console.log(hexlify(toBytes(fullfillmentL1Block)))
  // Get the Proof of the L1 Chain (Sepolia) for the
  // L2DestinationOutputOracleAddress = The L1 (Sepolia) which receives the L1 Settlement Batches from the L2 Destination Chain (Sepolia Base)
  // storageHashOutputOracle =
  // l1BatchEndBlockUsed = the L1 (Sepolia) Block which received the L1 Settlement Batch from L2 Destination Chain (Sepolia Base)
  const storageHashOutputOracle =
    '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4'
  const l1l2OutputOracleProof = await L1Provider.send('eth_getProof', [
    L2DestinationOutputOracleAddress,
    [storageHashOutputOracle],
    hexlify(toBytes(l1BatchEndBlockUsed)),
  ])
  // console.log('l1l2OutputOracleProof: ', l1l2OutputOracleProof.storageProof)
  const l1StorageProof = l1l2OutputOracleProof.storageProof
  const l1l2OutputOraceContractData = [
    '0x01', // nonce
    '0x', // balance
    l1l2OutputOracleProof.storageHash, // storageHash
    l1l2OutputOracleProof.codeHash, // CodeHash
  ]

  // console.log('l1l2OutputOraceContractData: ', l1l2OutputOraceContractData)
  const l1AccountProof = l1l2OutputOracleProof.accountProof

  // L1_WORLD_STATE_ROOT is the state root on the Prover contract that corresponds to the L1 (Sepolia) Block
  // where the L2 Destination (Sepolia Base) L1 Batch was settled
  const L1_WORLD_STATE_ROOT =
    process.env.FULFILLMENT_L1_WORLD_STATE_ROOT ||
    '0x43399d539577a23a93d713934c6b490210c69915aba2f1c4c9203618cc141c64' // L1 Batch Settlement Block
  console.log('l1l2OutputOraceContractData: ', l1l2OutputOraceContractData)
  console.log('p1:', l2OutputStorageRoot)
  console.log('p2:', L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash)
  console.log('p3:', L2_BATCH_LATEST_BLOCK_HASH)
  console.log('p4:', BATCH_INDEX)
  console.log('p5:', l1StorageProof[0].proof)
  console.log(
    'p6:',
    await prover.rlpEncodeDataLibList(l1l2OutputOraceContractData),
  )
  console.log('p7:', l1AccountProof)
  console.log('p8:', L1_WORLD_STATE_ROOT)
  // await prover.proveOutputRoot(
  //   l2OutputStorageRoot,
  //   L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash,
  //   L2_BATCH_LATEST_BLOCK_HASH,
  //   BATCH_INDEX,
  //   l1StorageProof[0].proof,
  //   await prover.rlpEncodeDataLibList(l1l2OutputOraceContractData),
  //   l1AccountProof,
  //   L1_WORLD_STATE_ROOT,
  // )

  // Prove Intent
  const l2InboxContractData = [
    '0x01',
    '0x',
    '0x02db022d2959526a910b41f5686736103098af4ba16c5e014e0255e0289bcc04',
    '0xe7560e2b071e0e66064efb4e4076a1b250386cb69b41c2da0bf1ba223e748e46',
  ]

  const balance =
    proof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.balance.length & (1 === 1)
        ? ethers.zeroPadValue(toBytes(proof.balance), 1)
        : proof.balance
  const nonce =
    proof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.nonce.length & (1 === 1)
        ? ethers.zeroPadValue(toBytes(proof.nonce), 1)
        : proof.nonce

  // const proveIntentParams = [
  //   proof.storageProof[0].value,
  //   inboxContract,
  //   intentHash,
  //   Number(outputIndex) - 1, // see comment in contract
  //   proof.storageProof[0].proof,
  //   ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
  //   proof.accountProof,
  //   l2OutputStorageRoot,
  // ]

  // console.log('l2OutputStorageRoot: ', l2OutputStorageRoot)
  // await prover.proveIntent(
  //   proof.storageProof[0].value,
  //   inboxContract,
  //   intentHash,
  //   Number(outputIndex) - 1, // see comment in contract
  //   proof.storageProof[0].proof,
  //   ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
  //   proof.accountProof,
  //   l2OutputStorageRoot,
  // )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
