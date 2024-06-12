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
// const l1BatchEndBlockUsed = Number('6059921')
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
// console.log('inboxStorageSlot: ', inboxStorageSlot)
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
  // console.log('l2EndBatchBlock:', l2EndBatchBlock)

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
  // console.log('l2OutputStorageRoot: ', l2OutputStorageRoot)

  // Get the Proof on the Destination Chain (Base Sepoilia) for the
  // Inbox Contract - that processes fulfillments
  // Storage Slot - of the intent that we fulfilled
  // End L1 Batch Block - the block who's state we are querying the Inbox Contract at
  const proof = await L2DestinationProvider.send('eth_getProof', [
    inboxContract,
    [inboxStorageSlot],
    l2EndBatchBlock,
  ])
  // console.log('inboxContract: ', inboxContract)
  // console.log('inboxStorageSlot: ', inboxStorageSlot)
  // console.log('l2EndBatchBlock: ', l2EndBatchBlock)
  // console.log('proof: ', proof)

  // Get the proof on the Destination Chain (Base Sepolia) for the
  // L2l1MessageParser - The contract which stores the messages passed from L1 (Sepolia) to L2 Destination (Sepolia Base)
  // Storage Slot - not used
  // txBlockHex - The Block which the intent was fulfilled
  // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
  const L2_MESSAGE_PASSER_STORAGE_ROOT = await L2DestinationProvider.send(
    'eth_getProof',
    [l2L1MessageParserAddress, [], txBlockHex],
  )

  // console.log(hexlify(toBytes(fullfillmentL1Block)))
  // Get the Proof of the L1 Chain (Sepolia) for the
  // L2DestinationOutputOracleAddress = The L1 (Sepolia) which receives the L1 Settlement Batches from the L2 Destination Chain (Sepolia Base)
  // storageHashOutputOracle = calculated from the batch number *2 + output slot 3
  //     e.g. from Prover.sol bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  // l1BatchEndBlockUsed = the L1 (Sepolia) Block which received the L1 Settlement Batch from L2 Destination Chain (Sepolia Base)
  const storageHashOutputOracle =
    '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74c311'
  // '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4'
  const l1l2OutputOracleProof = await L1Provider.send('eth_getProof', [
    L2DestinationOutputOracleAddress,
    [storageHashOutputOracle],
    hexlify(toBytes(l1BatchEndBlockUsed)),
  ])
  console.log('l1l2OutputOracleProof: ', l1l2OutputOracleProof)
  console.log(
    'l1l2OutputOracleProof.storageHash: ',
    l1l2OutputOracleProof.storageHash,
  )
  console.log(
    'l1l2OutputOracleProof.codeHash: ',
    l1l2OutputOracleProof.codeHash,
  )
  const l1StorageProof = l1l2OutputOracleProof.storageProof
  const l1l2OutputOraceContractData = [
    '0x01', // nonce
    '0x', // balance
    l1l2OutputOracleProof.storageHash, // storageHash
    l1l2OutputOracleProof.codeHash, // CodeHash
  ]

  console.log('l1l2OutputOraceContractData ', l1l2OutputOraceContractData)
  // console.log('l1l2OutputOraceContractData: ', l1l2OutputOraceContractData)
  const l1AccountProof = l1l2OutputOracleProof.accountProof

  // L1_WORLD_STATE_ROOT is the state root on the Prover contract that corresponds to the L1 (Sepolia) Block
  // where the L2 Destination (Sepolia Base) L1 Batch was settled
  const L1_WORLD_STATE_ROOT =
    process.env.FULFILLMENT_L1_WORLD_STATE_ROOT ||
    '0x43399d539577a23a93d713934c6b490210c69915aba2f1c4c9203618cc141c64' // L1 Batch Settlement Block

  // Prove Storage
  console.log('----- Proving L1 Storage  Original--------')
  // _key = 3 + BATCH_NO * 2
  // _val
  // _proof
  // _root
  await prover.proveStorage(
    '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
    '0xa082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d', // prefix wih a0 because it's a 32 byte blob
    // l1StorageProof,
    [
      '0xf90211a0bfd212994604c585735e74f4354be526d18748ad2666e78b65fb49c2e6bbbee9a01c08b76bd207991906711c3cc0b5a6118ab0de3a065d55d14d7015f84d1abc6da088209ce0684c1bdd8c5fd2c2116b48de8abf35e02d96d82b75df7a076e50a254a093a19d41813e8d3464b8291985feb9cdb253f0b20fa6cbd7f1725de2f3c7beada0ea0dc43529bfdcb5d1cb2250b31274cb9de1be1bed9ea497a0e045d310090867a0c76487e313d16116880c195538047de70cca922a4f9eef2cde1a71817fabf607a02d13c2a187bb92d32bc4ceb30abcb5ec4ab37bfdb0cffeb982a248bc6c553b0ea073b674e9c1ae861e94e0a85de933ffc242773f6bc94a039098368363ca407170a0aeb641e53ad9a1b68ae6d2584206c920b5bc9e7c332e7ce5ebc3c02b33fe2499a0026293f79be5701d143d718bb7a3a99d4468eadadb3e0eb9699bde0b9447846aa0c2b3982d16087d116b4c39a979a3ecc3f9636e63d79e824ef21d7efa2bea3776a07acdc461058751de6c9f00b3b7eb0e91746d49ac1e86099b5ac0952cef265da3a0b897cebb783cc6495ab3d600c4779bf61f429496bcfc79aa753e4f79dd70c39ba05177078e3f0591c3bafbfd8231202cb11ad7a5258d9cbe5b4cee2a05cd65fbdba05e9b6fc4323888e58ca307a0efadbff10c09173a8e0b0d783de49933305780eea090569fe014fd575fbae898f89ed8cd4ac59c97e6624864c7e17f4b7b8b9f098f80',
      '0xf90211a05837330dd58f5eb559d4c4e1216a71bb6d7692586a1007cc102e591888b11ff7a0d8cba08d50cc77911ced3f3c627d2083b6061f17b60a703b31f4d5d27cc04a27a0b2941698bde97b39503eb80e893ecc63bf318ab87cfdea133068fe072f3b794da0532d608892ddab1ceac4220816b35717b2f4684d9d03acb4f2f767b0e4056429a017dea5b10f1ec88082ab63fdf0757af11cc4ef7d91aeb3294c5ffc0220d53380a03b2cf450cc3b31e78e2dc15cdfbdf1bcab62f1b1bb242806ca9b261fb5c798b2a0b5e32d66562733e185adc1e588f9fff4884f9a7d0b6207918e6200dfbebf9adfa0893ae5aa4fec9c55e5f48affb5abece1295afba1e34f0deb3efe9f9c8f06ab07a02713bad64d67c69ea2fedf769f8b31272bdc057c38b981ec94448733ec895671a0fc0957f42b8a777134cca63c14fdd5881aeacef46a4128614f10b4247b16acafa07c137333dcd50a3f2cb7498bc70333a01c9b9fb932b3a86e75a3155cfceccb4ca0019a712031e6e1eab128fd5ed8a78456209bf007fd8cb826ae6f98826ba6929ca0bc68e2297de745edddb8bdd63b733cd8d87097727ffe6f1e4357d7be582d8214a05f2b91af78e7f6124766aad44b543ae0da304c69748e803fcb69ae95884c4918a03491f0d634e1fccf3a77b31f77bffb48c477263b6ee83e0c53a5c0f45c938481a05825128641a0d4bdf591f268681d0b1c9ba7aa9b066092b71e3e5ce3768258c780',
      '0xf90211a00a89099fd3ad43d4275f2c013cd9ab57d7e5f5634086afd3a60b641e383ff5afa0df31d5297aef7c76f60fcabcdd1b358e84b014c5913808902438479d1c03ab12a07dcf113cbadd33996a97e1ba78c354f29347e1c88128338b978d38c43de75e28a0ec1c4150d23390483c88c9cdbf3602a833d448d8c2d500cb6fca80f4a8ff93cea0892022ccf0b4ad7a245833c84c3c92475ac1deddd237e6021e28b72a2e212ff5a0b01963ea6b49045636d21b996f40331cd6c1543ecad87e3bc8713a4e890f88eea0c7fc34f928c297015bf0309e61053a6968d2a8d1e63a20038c5dce4730049353a08fc523a2a4e5e2bd1738f8261c5c782c92509d50956860fcc60645096409cd0ba05bde7269f2563aeeb427d5005bd3038fa07fd04ca200a3595aad3e19de2cd926a03e7b56c26ae75337fae9390e84a9feb30ea0973943c8284c8f2ef4fb7375299aa0888a3ef56d3df3ad3eb0d55f944200bf90d2ce86bfc53bf402d8d5f49f38f08ea07d65621167c29949cc3a3a2eea2a3ac390c54b562572442f2a477f2c246c4618a06eba648deb2dddd326097cb8548920d5273e40f2cb4bbd6189772f92fbba277fa0c443c4ca92bf2675e47f32ddb9fc8327a27ba1b8e807afb17900d3f9b8b5efb7a0e32d0db30f450322fd221d33961bd1e8da071a09bbeb13e8fcee3649bd94a7c7a0b623d3b5104e782d41d1ee67782f48c437e065e3ac6acef95d86fffc171c3c6680',
      '0xf901f180a0298816c361a6dd73e5c6d650a116b210117b5f6f95ca91cb380fc45756337b5ba0288af8116f2273750aca980d0c24c72fc7062503d3a753744f9a7bba069c2d6da0bdf98daab367dd62c3854a7271670b254d9283b3001cb094f57ee726d95fbf69a0e3a4a7cf7e7813e446dee70e3593516a950e2d44d7d4f8198bcfca34b0e0a3fba0af93df1050c70e83886e62702540c2acdffeab3121fff3b33ec202694ede8930a047f6b6e892f877c5a336f23d6f76a989df2357e52d7b8a4e1e6968eaaed5d3d4a0174e612df82c6748928adc8d0c4f635bae5b3603851aa0348a73a8ee2265b878a0baa96e56e6b547bcd09c4fce6176e0f086bc8294b258ce2794be203ed82d943ea02b701c002e0cf16ab8669e62ee06a4d42b73c84b11c7619ec35c44fa10a17680a04bc6603c68106b8b5fa17abe17337f57d1294c5c3b6531a03176f7e21d37ad13a0ad353825499cf67aa9cce1e3ced9049450043f2b1d9df76a96b40e353c9b8a45a06d3eec642ecdcd6ded17ca14439fc19502ace50689be0608795a526568238f15a0da4a746889703e3c1ac322ca7bdf307d55df8d35a9d7c56632faa6cacf22ae12a0e3f5048a4b328c842b06a93d2dd713615d8f840ea6e2a36b81906ba6967327e0a0f84969caa1eee6f14b38b91776cf7049446ac4d9d20749b48124670f37c2da8280',
      '0xf87180808080a092cc089f45cfa91178aa2773bd8d9596aea1e71fb6355a4d107d716d365f0c0580a0a4def846c97b1c574e2ec556b5c4282a67357c6b3b9ec2398c20758e6fe2eb33a02ef52f8e3dcfb6ab936437ee578919fb9e674dd2e94d8c0f76889e900158561b808080808080808080',
      '0xf8419e3bd809cd30703531a76fc0e67a1ac5304cb6b58f9cf5f7f618541d6a9043a1a082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d',
    ],
    '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4',
    // l1l2OutputOracleProof.storageHash,
  )
  console.log('----- Proving L1 Storage New --------')
  const _val = await prover.generateOutputRoot(
    0,
    l2OutputStorageRoot,
    L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash,
    L2_BATCH_LATEST_BLOCK_HASH,
  )
  const _key =
    '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f74c311'
  // console.log('_key: _', _key)
  // console.log('_val: ', _val)
  // // l1StorageProof,
  // console.log('_proof: ', l1StorageProof[0].proof)
  // console.log('_root: ', l1l2OutputOracleProof.storageHash)
  await prover.proveStorage(
    // abi.encodePacked(outputRootStorageSlot),
    // '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
    _key,
    // bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
    '0xa0f4a41845dda61073b93447169d970cf17a554dd6744408a4c13b94909bbad9cf', // prefix wih a0 because it's a 32 byte blob
    l1StorageProof[0].proof,
    // '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4',
    // '0xfc218f68cff9d5a1656b27f23eb4c79244fcd0dbe28afcae1b75819de461cecc',
    l1l2OutputOracleProof.storageHash,
  )
  console.log('----- End Prove Storage -------')

  // console.log('l1l2OutputOraceContractData: ', l1l2OutputOraceContractData)
  // console.log('p1:', l2OutputStorageRoot)
  // console.log('p2:', L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash)
  // console.log('p3:', L2_BATCH_LATEST_BLOCK_HASH)
  // console.log('p4:', BATCH_INDEX)
  // console.log('p5:', l1StorageProof[0].proof)
  // console.log(
  //   'p6:',
  //   await prover.rlpEncodeDataLibList(l1l2OutputOraceContractData),
  // )
  // console.log('p7:', l1AccountProof)
  // console.log('p8:', L1_WORLD_STATE_ROOT)
  const proveOutputTX = await prover.proveOutputRoot(
    l2OutputStorageRoot,
    L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash,
    L2_BATCH_LATEST_BLOCK_HASH,
    BATCH_INDEX,
    l1StorageProof[0].proof,
    await prover.rlpEncodeDataLibList(l1l2OutputOraceContractData),
    l1AccountProof,
    L1_WORLD_STATE_ROOT,
  )
  await proveOutputTX.wait()

  // Prove Intent
  console.log('Prove Intent')
  const l2InboxContractData = [
    '0x16',
    '0x',
    '0x26519e7ddd3031083d5aefdeaee6f851c55607e96f7e62cb85126c74252234cc',
    '0x733c0ec5c30f2dff7e7ae4a577acf23266929fe04a5cf6599e0d772374b1ec98',
  ]

  const balance =
    proof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.balance.length & (1 === 1)
        ? ethers.zeroPadValue(toBytes(proof.balance), 1)
        : proof.balance
  console.log('proof.nonce: ', proof.nonce)
  const nonce =
    proof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.nonce.length & (1 === 1)
        ? ethers.zeroPadValue(toBytes(proof.nonce), 1)
        : proof.nonce
  console.log('nonce: ', nonce)

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

  // const l2InboxContractData = [
  //   '0x16',
  //   '0x',
  //   '0x26519e7ddd3031083d5aefdeaee6f851c55607e96f7e62cb85126c74252234cc',
  //   '0x733c0ec5c30f2dff7e7ae4a577acf23266929fe04a5cf6599e0d772374b1ec98',
  // ]

  // const proverNonce = await L2DestinationProvider.send(
  //   'eth_getTransactionCount',
  //   [proverAddress, 'pending'],
  // )
  // console.log('proverNonce: ', proverNonce)
  const proverNonce = '0x01'
  const proverFiller = '0x'
  const proverStorageHash =
    '0x26519e7ddd3031083d5aefdeaee6f851c55607e96f7e62cb85126c74252234cc'
  const proverCodeHash =
    '0x733c0ec5c30f2dff7e7ae4a577acf23266929fe04a5cf6599e0d772374b1ec98'
  const claimant = ethers.getAddress(
    '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
  )
  console.log('ProveIntent p1: ', claimant)
  console.log('ProveIntent p2: ', inboxContract)
  console.log('ProveIntent p3: ', intentHash)
  console.log('ProveIntent p4:  ', Number(outputIndex) - 1)
  console.log('ProveIntent p5: ', proof.storageProof[0].proof)
  console.log('ProveIntent p6: ', [
    proverNonce,
    proverFiller,
    proverStorageHash,
    proverCodeHash,
  ])
  console.log('ProveIntent p7: ', proof.accountProof)
  console.log('ProveIntent p8: ', l2OutputStorageRoot)
  await prover.proveIntent(
    claimant,
    inboxContract,
    intentHash,
    Number(outputIndex) - 1, // see comment in contract
    proof.storageProof[0].proof,
    // ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
    // await prover.rlpEncodeDataLibList(l2InboxContractData),
    await prover.rlpEncodeDataLibList([
      proverNonce,
      proverFiller,
      proverStorageHash,
      proverCodeHash,
    ]),
    proof.accountProof,
    l2OutputStorageRoot,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
