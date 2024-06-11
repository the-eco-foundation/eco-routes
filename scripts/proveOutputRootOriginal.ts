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
  '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
) // sepolia address

const proverAddress =
  process.env.PROVER_CONTRACT_ADDRESS ||
  '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'
const txToProve =
  '0x423566ff4d43c56c60c5aa8051044632fa7d5e2b59cd1a55835c01fa9af07d05'
const inboxContract = ethers.getAddress(
  '0xCfC89c06B5499ee50dfAf451078D85Ad71D76079',
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
  const l2Block = 9934282
  const l2BlockBatchEnd = 9934320
  const l2BlockBatchEndHash =
    '0x38a352d17ebab79b125d97f331a7b6cec88ce80ae858a12054391781ca77fe6d'
  const l2BatchIndex = 82785
  const l1BatchTransaction =
    '0xf7bb6590a11ca794e841560c7987125af7a7c0560724e013ae036af8459b5202'
  const l1BatchEndBlock = 5897036
  const l1BatchEndBlockUsed = 5903085

  const txDetails = await L2DestinationProvider.getTransaction(txToProve)
  const txBlock = txDetails!.blockNumber
  const txBlockHex = hexlify(toBytes(txBlock || 0))

  const baseOutputContract = await ethers.ContractFactory.fromSolidity(
    L2OutputArtifact,
    L1signer,
  ).attach(L2DestinationOutputOracleAddress)
  const prover: Prover = await Prover__factory.connect(
    proverAddress,
    L2SourceSigner,
  )
  const outputIndex = await baseOutputContract.getL2OutputIndexAfter(txBlock)
  console.log('outputIndex: ', outputIndex)
  const outputData = await baseOutputContract.getL2OutputAfter(txBlock)
  console.log('outputData: ', outputData)
  const l2EndBatchBlock = hexlify(toBytes(outputData.l2BlockNumber))
  console.log('l2EndBatchBlock: ', l2EndBatchBlock)

  // eslint-disable-next-line no-unused-vars
  const outputRoot = outputData.outputRoot
  console.log('outputRoot:', outputRoot)

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

  const BATCH_INDEX = l2BatchIndex
  const L2_BATCH_LATEST_BLOCK_HASH = l2BlockBatchEndHash
  // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
  const L2_MESSAGE_PASSER_STORAGE_ROOT = await L2DestinationProvider.send(
    'eth_getProof',
    [l2L1MessageParserAddress, [], txBlockHex],
  )

  console.log(hexlify(toBytes(l1BatchEndBlockUsed)))
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
    hexlify(toBytes(l1BatchEndBlockUsed)),
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
  const l2ContractData = [
    '0x01',
    '0x',
    '0x02db022d2959526a910b41f5686736103098af4ba16c5e014e0255e0289bcc04',
    '0xe7560e2b071e0e66064efb4e4076a1b250386cb69b41c2da0bf1ba223e748e46',
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
    '0x80be241290d08c1e19fd83e4afd9a68e6594afc91d3af207b60f01ffd5434c79'
  // '0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135' // L1 Batch Settlement Block
  // '0x36d64773e998ab95b84681b791c400e371608604196a7ce60c926ac6664b71ba' // L1 Batch Settlement Block +1
  console.log('l2ContractData: ', l2ContractData)
  console.log('p1:', l2OutputStorageRoot)
  console.log('p2:', L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash)
  console.log('p3:', L2_BATCH_LATEST_BLOCK_HASH)
  console.log('p4:', BATCH_INDEX)
  console.log('p5:', l1StorageProof[0].proof)
  console.log('p6:', await prover.rlpEncodeDataLibList(l2ContractData))
  console.log('p7:', l1AccountProof)
  console.log('p8:', L1_WORLD_STATE_ROOT)
  await prover.proveOutputRoot(
    l2OutputStorageRoot,
    L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash,
    L2_BATCH_LATEST_BLOCK_HASH,
    BATCH_INDEX,
    l1StorageProof[0].proof,
    await prover.rlpEncodeDataLibList(l2ContractData),
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
