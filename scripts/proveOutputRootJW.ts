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

const DEPLOY_PRIVATE_KEY = process.env.DEPLOY_PRIVATE_KEY || ''
const PROVER_PRIVATE_KEY = process.env.PROVER_PRIVATE_KEY || ''

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
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

const L2DestinationOutputOracleAddress = ethers.getAddress(
  process.env.L2_OUTPUT_ORACLE_ADDRESS ||
    '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
) // sepolia address

const proverAddress =
  process.env.PROVER_CONTRACT_ADDRESS ||
  '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'
const txToProve =
  process.env.FULFILLMENT_TRANSACTION ||
  '0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee'
const inboxContract = ethers.getAddress(
  process.env.INBOX_ADDRESS || '0xCfC89c06B5499ee50dfAf451078D85Ad71D76079',
)
const intentHash =
  process.env.INTENT_HASH ||
  '0x4321000000000000000000000000000000000000000000000000000000000000'
const storageSlot = ethers.solidityPackedKeccak256(
  ['bytes'],
  [
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [intentHash, 0],
    ),
  ],
)
const l2L1MessageParserAddress = ethers.getAddress(
  process.env.L2_L1_MESSAGE_PASSER_ADDRESS ||
    '0x4200000000000000000000000000000000000016',
)

async function main() {
  const txDetails = await L2DestinationProvider.getTransaction(txToProve)
  const txBlock = txDetails!.blockNumber
  const txBlockHex = hexlify(toBytes(txBlock || 0))
  // console.log('txBlock:', txBlock)
  // console.log('txBlockHex:', txBlockHex)

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

  const l2OutputStorageRoot = (
    await L2DestinationProvider.send('eth_getBlockByNumber', [
      l2EndBatchBlock,
      false,
    ])
  ).stateRoot
  console.log('l2OutputStorageRoot: ', l2OutputStorageRoot)
  const proof = await L2DestinationProvider.send('eth_getProof', [
    inboxContract,
    [storageSlot],
    l2EndBatchBlock,
  ])

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

  const BATCH_INDEX = process.env.FULFILLMENT_BLOCK_BATCH || 82785
  const L2_BATCH_LATEST_BLOCK_HASH =
    process.env.FULFILLMENT_BLOCK_BATCH_LAST_BLOCK_HASH ||
    '0x38a352d17ebab79b125d97f331a7b6cec88ce80ae858a12054391781ca77fe6d'
  // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
  const L2_MESSAGE_PASSER_STORAGE_ROOT = await L2DestinationProvider.send(
    'eth_getProof',
    [l2L1MessageParserAddress, [], txBlockHex],
  )

  // accountProof piece of eth_getProof()
  // retreived by getting eth_getProof of the L2_OUTPUT_ORACLE for a block later than the
  // block that settled the L2 Fulfillment
  // e.g. L2_OUTPUT_ORACLE on Sepolia Testnet is 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254
  // Fulfillment Transaction in example was 0x423566ff4d43c56c60c5aa8051044632fa7d5e2b59cd1a55835c01fa9af07d05
  // which was a L1 State Root Submission tx of 0xf7bb6590a11ca794e841560c7987125af7a7c0560724e013ae036af8459b5202
  // which had an L1 block of 5897036, we used an L1 block of 5903085
  // Using storageSlot 0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D
  // const l1txBlockHash =
  //   '0xddbab69aac369068d1591a69ce60fffee3a9c5049e44ff7e5099d462cabffd4f'
  const fullfillmentL1Block = Number(process.env.FULFILLMENT_L1BLOCK || '0')
  const fullfillmentL1BlockNext =
    Number(process.env.FULFILLMENT_L1BLOCK || '0') + 1
  console.log(
    'fullfillmentL1Block+next: ',
    // fullfillmentL1Block,
    fullfillmentL1BlockNext,
  )
  // const l1txBlockHash = hexlify(toBytes(fullfillmentL1BlockNext))
  console.log(hexlify(toBytes(fullfillmentL1Block)))
  // const l1txBlockHash = (
  //   await L1Provider.send('eth_getBlockByNumber', [
  //     hexlify(toBytes(fullfillmentL1BlockNext)),
  //     false,
  //   ])
  // ).hash
  const storageSlotOutputOracle =
    '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4'
  const l1l2OutputOracleProof = await L1Provider.send('eth_getProof', [
    L2DestinationOutputOracleAddress,
    [storageSlotOutputOracle],
    hexlify(toBytes(fullfillmentL1BlockNext)),
    // l1txBlockHash,
  ])
  // console.log('l1l2OutputOracleProof: ', l1l2OutputOracleProof.storageProof)
  const l1StorageProof = l1l2OutputOracleProof.storageProof
  const l1ContractData = [
    '0x01', // nonce
    '0x', // balance
    l1l2OutputOracleProof.storageHash, // storageHash
    l1l2OutputOracleProof.codeHash, // CodeHash
  ]
  // console.log('l1ContractData: ', l1ContractData)
  const l1AccountProof = l1l2OutputOracleProof.accountProof
  // console.log('l1StorageProof: ', l1StorageProof)
  // console.log('l1ContractData: ', l1ContractData)
  // console.log('l1AccountProof: ', l1AccountProof)

  //  const l1WorldStateRoot = eth.RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));
  // currentBlock:  6054921n
  // true hash: 0x43399d539577a23a93d713934c6b490210c69915aba2f1c4c9203618cc141c64
  // proven L1 world state root: 0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135
  // currentBlock:  6054922n
  // true hash: 0xf4418da657b4e97b6641a098e6f193b612f7c4435e8b62b80081d21d54b3115d
  // proven L1 world state root: 0x36d64773e998ab95b84681b791c400e371608604196a7ce60c926ac6664b71ba

  const L1_WORLD_STATE_ROOT =
    // '0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135' // L1 Batch Settlement Block
    '0x36d64773e998ab95b84681b791c400e371608604196a7ce60c926ac6664b71ba' // L1 Batch Settlement Block +1
  console.log('l1ContractData: ', l1ContractData)
  console.log('p1:', l2OutputStorageRoot)
  console.log('p2:', L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash)
  console.log('p3:', L2_BATCH_LATEST_BLOCK_HASH)
  console.log('p4:', BATCH_INDEX)
  console.log('p5:', l1StorageProof[0].proof)
  console.log('p6:', await prover.rlpEncodeDataLibList(l1ContractData))
  console.log('p7:', l1AccountProof)
  console.log('p8:', L1_WORLD_STATE_ROOT)
  await prover.proveOutputRoot(
    l2OutputStorageRoot,
    L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash,
    L2_BATCH_LATEST_BLOCK_HASH,
    BATCH_INDEX,
    l1StorageProof[0].proof,
    await prover.rlpEncodeDataLibList(l1ContractData),
    l1AccountProof,
    L1_WORLD_STATE_ROOT,
  )

  console.log('l2OutputStorageRoot: ', l2OutputStorageRoot)
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