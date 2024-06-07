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
  const test_rlp_block_data =
    '0xf90249a0b3087c6a2ebcdb657d5b41a680ad4b3f778eaa25aa711df7e8e4a92f11cb9255a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347943826539cbd8d68dcf119e80b994557b4278cec9fa067489c62643f5b56111a4208534282d7a162ea9d4fdf7eea85ba4662c65547afa037768ca73f4c4d6d01b02a6bbaac954ef0fdf42342220adfafebd3cd6a49423fa010daccef1b678d2a725a7138bb97369944e0c45235415d18cb2bacd5bdd55cb9b9010004900004d0008c220885b801a000502281710848111c215c70960a6a74410189820909f0400a6c0208324a291710892160148d5042a145490a070e814134a188bc020806010c42024316014a254a38593023705810870080480408d0c1300c1220a03b300a90420065a0481100100c4680850292774c00803002061e14e0946140571c1308044280290085c1600881a1a001110a20100005610f02c145604f352219439a0520ae903246c0040300042a08e12601905082203230224000520110108882021034a828f2110948062820288c02427c01110801000870400811602400921498130100a900888006d612e8e3a0c012a084389804633268546386c00a80835c456e8401c9c3808401c9c261846660e18480a0e80d8283e72b630b39ce689e0a19e7665e2c74888249261617bc56eca26cc6668800000000000000008501159f0cb0a0d2643c15bec826b4051f3ccb4167d9673c40ef8c99c7b7ad36e69f77d45c6d9e830c000080a09a910247571fd3ed590f2c1749107d70fff103c91eb60110e9e5145c304a873c'
  const test_rlp_block_hash = ethers.keccak256(test_rlp_block_data)
  // console.log('test_rlp_block_hash: ', test_rlp_block_hash)
  const blockDataDecoded = ethers.decodeRlp(test_rlp_block_data)
  // console.log('blockDataDecoded: ', blockDataDecoded)
  // console.log('blockDataDecoded[3]: ', blockDataDecoded[3])
  // const l1WorldStateRoot = eth.RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));
  //   console.log(block.hash)
  //
  // hre.changeNetwork(L2_NETWORK)
  const txDetails = await L2DestinationProvider.getTransaction(txToProve)
  // console.log(hre.ethers.provider)
  const txBlock = txDetails!.blockNumber
  const txBlockHash = txDetails?.blockHash

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
  // console.log('Hi')
  // console.log(storageSlot)
  // console.log(l2EndBatchBlock)
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
    [l2L1MessageParserAddress, [], txBlockHash],
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
    '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D'
  const l1l2OutputOracleProof = await L1Provider.send('eth_getProof', [
    L2DestinationOutputOracleAddress,
    [storageSlotOutputOracle],
    hexlify(toBytes(fullfillmentL1Block)),
    // l1txBlockHash,
  ])
  // console.log('l1l2OutputOracleProof: ', l1l2OutputOracleProof.storageProof)
  const l1StorageProof = l1l2OutputOracleProof.storageProof
  const l1ContractData = [
    '0x01', // nonce
    '0x', // balance
    l1l2OutputOracleProof.storageHash,
    l1l2OutputOracleProof.codeHash,
  ]
  // console.log('l1ContractData: ', l1ContractData)
  const l1AccountProof = l1l2OutputOracleProof.accountProof
  // console.log('l1StorageProof: ', l1StorageProof)
  // console.log('l1ContractData: ', l1ContractData)
  // console.log('l1AccountProof: ', l1AccountProof)
  // const l1StorageProof = [
  //   '0xf90211a0bfd212994604c585735e74f4354be526d18748ad2666e78b65fb49c2e6bbbee9a01c08b76bd207991906711c3cc0b5a6118ab0de3a065d55d14d7015f84d1abc6da088209ce0684c1bdd8c5fd2c2116b48de8abf35e02d96d82b75df7a076e50a254a093a19d41813e8d3464b8291985feb9cdb253f0b20fa6cbd7f1725de2f3c7beada0ea0dc43529bfdcb5d1cb2250b31274cb9de1be1bed9ea497a0e045d310090867a0c76487e313d16116880c195538047de70cca922a4f9eef2cde1a71817fabf607a02d13c2a187bb92d32bc4ceb30abcb5ec4ab37bfdb0cffeb982a248bc6c553b0ea073b674e9c1ae861e94e0a85de933ffc242773f6bc94a039098368363ca407170a0aeb641e53ad9a1b68ae6d2584206c920b5bc9e7c332e7ce5ebc3c02b33fe2499a0026293f79be5701d143d718bb7a3a99d4468eadadb3e0eb9699bde0b9447846aa0c2b3982d16087d116b4c39a979a3ecc3f9636e63d79e824ef21d7efa2bea3776a07acdc461058751de6c9f00b3b7eb0e91746d49ac1e86099b5ac0952cef265da3a0b897cebb783cc6495ab3d600c4779bf61f429496bcfc79aa753e4f79dd70c39ba05177078e3f0591c3bafbfd8231202cb11ad7a5258d9cbe5b4cee2a05cd65fbdba05e9b6fc4323888e58ca307a0efadbff10c09173a8e0b0d783de49933305780eea090569fe014fd575fbae898f89ed8cd4ac59c97e6624864c7e17f4b7b8b9f098f80',
  //   '0xf90211a05837330dd58f5eb559d4c4e1216a71bb6d7692586a1007cc102e591888b11ff7a0d8cba08d50cc77911ced3f3c627d2083b6061f17b60a703b31f4d5d27cc04a27a0b2941698bde97b39503eb80e893ecc63bf318ab87cfdea133068fe072f3b794da0532d608892ddab1ceac4220816b35717b2f4684d9d03acb4f2f767b0e4056429a017dea5b10f1ec88082ab63fdf0757af11cc4ef7d91aeb3294c5ffc0220d53380a03b2cf450cc3b31e78e2dc15cdfbdf1bcab62f1b1bb242806ca9b261fb5c798b2a0b5e32d66562733e185adc1e588f9fff4884f9a7d0b6207918e6200dfbebf9adfa0893ae5aa4fec9c55e5f48affb5abece1295afba1e34f0deb3efe9f9c8f06ab07a02713bad64d67c69ea2fedf769f8b31272bdc057c38b981ec94448733ec895671a0fc0957f42b8a777134cca63c14fdd5881aeacef46a4128614f10b4247b16acafa07c137333dcd50a3f2cb7498bc70333a01c9b9fb932b3a86e75a3155cfceccb4ca0019a712031e6e1eab128fd5ed8a78456209bf007fd8cb826ae6f98826ba6929ca0bc68e2297de745edddb8bdd63b733cd8d87097727ffe6f1e4357d7be582d8214a05f2b91af78e7f6124766aad44b543ae0da304c69748e803fcb69ae95884c4918a03491f0d634e1fccf3a77b31f77bffb48c477263b6ee83e0c53a5c0f45c938481a05825128641a0d4bdf591f268681d0b1c9ba7aa9b066092b71e3e5ce3768258c780',
  //   '0xf90211a00a89099fd3ad43d4275f2c013cd9ab57d7e5f5634086afd3a60b641e383ff5afa0df31d5297aef7c76f60fcabcdd1b358e84b014c5913808902438479d1c03ab12a07dcf113cbadd33996a97e1ba78c354f29347e1c88128338b978d38c43de75e28a0ec1c4150d23390483c88c9cdbf3602a833d448d8c2d500cb6fca80f4a8ff93cea0892022ccf0b4ad7a245833c84c3c92475ac1deddd237e6021e28b72a2e212ff5a0b01963ea6b49045636d21b996f40331cd6c1543ecad87e3bc8713a4e890f88eea0c7fc34f928c297015bf0309e61053a6968d2a8d1e63a20038c5dce4730049353a08fc523a2a4e5e2bd1738f8261c5c782c92509d50956860fcc60645096409cd0ba05bde7269f2563aeeb427d5005bd3038fa07fd04ca200a3595aad3e19de2cd926a03e7b56c26ae75337fae9390e84a9feb30ea0973943c8284c8f2ef4fb7375299aa0888a3ef56d3df3ad3eb0d55f944200bf90d2ce86bfc53bf402d8d5f49f38f08ea07d65621167c29949cc3a3a2eea2a3ac390c54b562572442f2a477f2c246c4618a06eba648deb2dddd326097cb8548920d5273e40f2cb4bbd6189772f92fbba277fa0c443c4ca92bf2675e47f32ddb9fc8327a27ba1b8e807afb17900d3f9b8b5efb7a0e32d0db30f450322fd221d33961bd1e8da071a09bbeb13e8fcee3649bd94a7c7a0b623d3b5104e782d41d1ee67782f48c437e065e3ac6acef95d86fffc171c3c6680',
  //   '0xf901f180a0298816c361a6dd73e5c6d650a116b210117b5f6f95ca91cb380fc45756337b5ba0288af8116f2273750aca980d0c24c72fc7062503d3a753744f9a7bba069c2d6da0bdf98daab367dd62c3854a7271670b254d9283b3001cb094f57ee726d95fbf69a0e3a4a7cf7e7813e446dee70e3593516a950e2d44d7d4f8198bcfca34b0e0a3fba0af93df1050c70e83886e62702540c2acdffeab3121fff3b33ec202694ede8930a047f6b6e892f877c5a336f23d6f76a989df2357e52d7b8a4e1e6968eaaed5d3d4a0174e612df82c6748928adc8d0c4f635bae5b3603851aa0348a73a8ee2265b878a0baa96e56e6b547bcd09c4fce6176e0f086bc8294b258ce2794be203ed82d943ea02b701c002e0cf16ab8669e62ee06a4d42b73c84b11c7619ec35c44fa10a17680a04bc6603c68106b8b5fa17abe17337f57d1294c5c3b6531a03176f7e21d37ad13a0ad353825499cf67aa9cce1e3ced9049450043f2b1d9df76a96b40e353c9b8a45a06d3eec642ecdcd6ded17ca14439fc19502ace50689be0608795a526568238f15a0da4a746889703e3c1ac322ca7bdf307d55df8d35a9d7c56632faa6cacf22ae12a0e3f5048a4b328c842b06a93d2dd713615d8f840ea6e2a36b81906ba6967327e0a0f84969caa1eee6f14b38b91776cf7049446ac4d9d20749b48124670f37c2da8280',
  //   '0xf87180808080a092cc089f45cfa91178aa2773bd8d9596aea1e71fb6355a4d107d716d365f0c0580a0a4def846c97b1c574e2ec556b5c4282a67357c6b3b9ec2398c20758e6fe2eb33a02ef52f8e3dcfb6ab936437ee578919fb9e674dd2e94d8c0f76889e900158561b808080808080808080',
  //   '0xf8419e3bd809cd30703531a76fc0e67a1ac5304cb6b58f9cf5f7f618541d6a9043a1a082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d',
  // ]
  // from eth_getProof(L2OutputOracle, [], L1_BLOCK_NUMBER)
  // trying to figure out what is special about this block...maybe nothing..
  // const l1ContractData = [
  //   '0x01', // nonce
  //   '0x', // balance
  //   '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4', // storageRoot/storageHash
  //   '0xfa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998', // codehash
  // ]

  // const l1AccountProof = [
  //   '0xf90211a0bfb9919b56cbfb2a9f7b8ebaf7b121385267a695526e7b818d350bda8a35779aa0c3e83efb439189085ef6dc49ac88ec5b7bf8d50550d9275ab0f625654aba2567a0fdc3a1e7f481199e827e71d18802fb87402cb60782f6edd441b337f72629b46aa0f6caab76d5495f6055c1a300755105c11b1977b2f4dc8bf6da73ebd7389f9633a0ea7a31d6ff8ac41e8f8001cc30ca5225ffb6e7ef3c4e976154f28d239fd301ada0a121fad21a3013c7f3beca644b941ce0c67f2bd5fa467fd0cf06275c1fdae491a05ac0cbbb029266068035ded9bc5d1f3c4deb34c9b42f2a130935aa00ee5fc835a0d1afd8cf6f1a2ee905fdec230b3125b2bca442887255be11faf030cf8394d1daa01796eb6a8ef2aa35005f3d8f29eb67ce9fcb9bd74580b441d6b3a47345387c02a0cbdab1effc199b9a73c4981ad891f2083af9ba2e0119da360e6ab1da63b1c808a072e66cbac9075774bb5169c51c116be00959ebd039ccb9b7e342740a1f728b09a0015587187596d08e872e69b0e3e4d2b801e18c58df32b28d561b3b9c3ab6466fa0ba7d8544f787f088d1fce0302d5b7ba5884a3cb1b5ce1eab75eba8f3698001f5a066b19005e26d3044cc5e3d24db3e4ea1a4aaa33f187e72b6d70b5b71b4a4aa36a0caad9b79328ebf61a28e9b138c0c554fd7abbdc4f0dc95b4ddb03188c0aec000a0087cdd2e809697d89c3cc97bd2c46f3e5d664983504141c0ece3adcef1576aa780',
  //   '0xf90211a0abee5fcc87a024726d389acc396664e3c6111179fc2086a0f97e7ea7118c3caba042a2b06fdfecd9a8e64fdb010c070a9d4af827f54b19367ecbff1e146546eca3a08c6b298b1f95e287e82abfe33feb781adf90ad5e5f45ed698b3f6f96fc5b1125a07b3eae5d91d1596f33b1a6e36f38536e35236a7880fa456a11cb118742e50d7ea0c72324f4561763ae52e1c9e81936ba15570aabdba6f2bc54afd20a311e66d59ca0aae4698d708af1ba2b8d17fe64d0dba413c09caaa9bab6821200f4b58cd49ffaa046d88f0fca182b2e74e1d055521cd8946f803ceb800a040c701c3ffdc37a989ca01e75b5ef645a675957e7b2c58609c93403f63360d8ffa57721fb39a811b3e9bfa0f017b71c04a00865ca71502600cabafba920d0134f4b6611814f05349dea129aa060be26832ac2e7904e0d3e0c8777e1c1dab9473db5e472b28631c3504ccf1981a0051f9eeefb01737e40f6939d7140b38e2fd17d853e4af00664d66824255fe265a05dbb7bae84978c647d1fd2223c408f25b1253b1e964901d154d269e2ebe4249ca0d18b15ec25551b264457f076bcd7452d10be8529b6953769249885cf6fad13bba0ae8e1ae1f5a2c3b2395c61227da1424f69d59725639c9f0c69d888f76fecea2ea0b0694672f218e3acd40bff738089abc7590a397898f283c66c20e258beec905ca080e30336c15ebb0a74a406c21ce289c673c42dddecbdee98ff5d4fbf42b205d380',
  //   '0xf90211a0031c8665af86336b044ec4d33e53199998f5169da40f85745f571a7945ea1c70a0ad111faae57c47d184e8f48bb804a0f7811b37cd78bbdd425dbea63fa34fb69da05cd5a3d0f0a902d557073d0e67169ed3664e0478448fa6e23002452d324467a3a0df1bbb117ce6b01a957b486b00e6641c887eba2eed5dcf1afbaa0554971cffa3a06de4ab62fb12660654edbe96cc80a82875485b902d365f6efcae7ccfd49fad9ea0e5b5026772f481a11690034eb3af808efa7cf3d1b886d584910f53a53dfd799ca0151af60bd1f2c5ad5547dcb8e045aac641ce83046481a40bf128dc6ee561793fa0ee0924bfc2ab4f2742ac5a0c75e7ee86eb7db5d643c05aebd0056ad889d07eb7a0ab774ff7894cd332e105ec7aa5c74ad028cbda2754b299b71ac785872fd6dd79a065d5a8648764fef72987e4f98fc0d21d81fca462fca2820ab7af03c861617578a04d961f5216642a0de17a8c32de6136a09ff2f7754a73da86660396e27ca68cb9a034240b77d48c0abfa3a73a1c693c63f76e687cedc891cf45331cb902f3d4aeafa0985cea242344d8ff9bd15d69b196041e924857043160203ba6f23ac9ab5f3470a0fb4c53ed1b723107b5a8d98b697baa9b2850b61aceaca1810e1b3de772db27b4a0a0d04b9a251230b2ae0d4876835247ec8fbcd640d169e1f91d0562507c0546d7a0911e825acca86392e61c55c3f8a47f904f09ac820ead1229140911f99b993f0780',
  //   '0xf90211a08513cba61790fe62562a2f25698426ca6e4231329627931f3e70a894cff61da2a0fb3b95bdaa6f094cc9e59dc520ec28381547993e80a8e62a1631e1fb9c76df8da01fa11c41869c9a54690911972027704de583ce90899f7e96ab86b35adeb73333a0cbefaff58d2a2e82bd8b5a0afbf2a41ab483ca68105eca20e42e327df9d8ca09a0dbff708ad753c11e82b40839011d5798e652f52915125e57715d100e8df2806aa04b0da01af035d3fcf452d6bc5b5ffedebe9ef264c99418c56725b8f0f0be9c62a075b60973136f96a316d5454c06f5474fc0df62b9494dbb52c2e96d7d7c5c55ffa049b0c9d4178e4a1dc01006c6a6e7c8242cf8425926b96d4898ec1b707e13310fa017205bbe85c573d18d1f93b24bf3045d8a650564dfdcd5d9b510163cf9bf05ada057e26b7f05153b8f3c818a2e37a1e9e5c35fe2c389c394349b4be978e4716078a0568800a9526c529b5394c68bb1d0dfe68777700322e7813cd02ec352bc4aecf0a018f2e80cff368c0862a4755728bc2f4c6a8e48baebdea0c8f7b526a6922dc38fa06837c44ae10f101305f0fbaef56a6ff00db12d2a35e1ee6b7e6364de97598416a06496573ce7c1c9cef7f8e0bcac464a67e7d1137531ca6dcab21c31b6df5ac7cea0b2ce325087c0cf4f4dc16a6694a945ade015a64b2fdabc3259849194fd04e67da0453031b5bbb2f300844841e2044ca6d24da7ee377490c9c61ce81f5367eb951780',
  //   '0xf90211a03a7f71ddaca4aab7806ce167410c20a9fae109ef2dbecc6679c1bdc0e7b1084aa00475e672c31f2c5fe5ebaf02aa20d90f5d1f92c07c84f25362666a462a9c5dcfa04767339c7d946c96e2f2abddc052756f8cb4bdb480e1c1109670b2259796def9a08a802e07f817b8a8b7d2d26c7055098ef96e6e72d260b94398d0f59fc8faab53a08d2523366776ef47c229ca0d416830b3afe091fb5372514b59ca6abaf42a315aa06816909e4ff22e9a80e72f319e904d9e64c89607960f7e0cc22a7f1fa0e77e25a096b9ba5e2d96703ada62dbe8351fb530003e46ec75135bb8ae4dca32f01ca368a025f02c06d1b2d596cde5537c5075eed9c2747ae8e8e49e94f61663fe0cd8986fa06bde6e78916fc703131c7235927355b393d4c9ddcb0b663ec029c3142113526aa0c30559acd6d1f3ffdd02bc71c5b73eb398360ce5b590792ca0605ee46c1574cda0d2fca3f723c74ee427754cad1baf3f1766ae6ec96497a4ee650b691a4e9c7b0fa053c0274016972816d268b2f5817d1aef088c14e3ef7c874ecc83ac67dab6b89ba0c87e7ec771291d91bae19da42cf88eee7cd1ef3551599eb0b274494aeb3a3a72a0668062d9a3a38595ba497095feb9345409d0d3bf55d17371c117f050af6c0f3ea0d59040cdfb8bfea177ee406385d5b0cddfeaeb871d7e368abdbe646a66c65057a032833fae7f7241aec33a76b0fae012975bdef725b406919750b51191d024047780',
  //   '0xf901d1a0cdaac1f24386b8ad05fe9002facc552f1a3fe4e154b6ac598a4fc9ced29cf66fa08cb184202418d04566f5ad0bc650a9d20e51e69b4a30a967e0b92e1f131f585ca0bfe116147405f46bf711e907c0b5e60b0fe49d8a1cd7477424e6bd6f946f04aea0b63965ccf299291026921963fdeb5885e496f2f82992d14ce1b29111b12a5184a076ded8f891b0b8ba180e6c8323b34d8d8cd7a6866cbd8408d0321be5362a63eea0981bef44af9c36d6ef1a1a172e2ae1a171aedbedfa2ce0f433f608f5ffc4f61aa0be4455c572b7911c08e489bdd2cea611cafdc3628c61d719f9752dba4fd707d9a08140f493327b97838a91ae3651b8fdde51b4fe83089a48528c8caf44b24af6f9a054b30b0c32a2357452545b748b451f9a2884cdd31780f03179bce3eefa012c9ea0e5dcc4976a340477579dccce881880685604878cb51f5bcfd3252c31ab1ccff8a0464958fa77f044f300fe9a6440a9a72c68095ce1f8b5126048b1d5c9d6b5814e80a0df7b1ab0755a7ed4b405909318ee544299f8db7f4e18c62f3cad5a420e57d0f0a0596f248603536ec155c870556a729ced3fb2ce42aec1fbd160f63c9d3c8b389280a052d3e659c1dc4ffba6876ebfd1e5b94486f25ab030e9529589a5f9a2cf98090480',
  //   '0xf87180808080a0216d61bc7d3db7ee9dad81cbae50413a5b561c550e768925f32638b033241ecfa04dc01907d1b0288cfeb0426191feb4396c77b42fb072247de2df2469c3e83b88808080808080808080a08ad8dd6f3ea18e8c98aa9aeaf2d29b3832099685e09bef788529b42b79ead6db80',
  //   '0xf851808080808080808080a0f80468e0c756b46a2b79aed2f700d292732b326ba913ca5c13f2db70175f4aa38080808080a0ebc73a4539e12c7e5ec6d112a7b794bcc09d084ce738c6ed6eaff234f2f361a480',
  //   '0xf8669d2025175e22c85b35ea2185b26c96801b0821bf198a3bb114ace81b3d51b846f8440180a04d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4a0fa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998',
  // ]

  //  const l1WorldStateRoot = eth.RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));
  const L1_WORLD_STATE_ROOT =
    '0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135' // L1 Batch Settlement Block
  // ('0x36d64773e998ab95b84681b791c400e371608604196a7ce60c926ac6664b71ba')//L1 Batch Settlement Block +1
  // '0x80be241290d08c1e19fd83e4afd9a68e6594afc91d3af207b60f01ffd5434c79'

  console.log('p1:', l2OutputStorageRoot)
  console.log('p2:', L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash)
  console.log('p3:', L2_BATCH_LATEST_BLOCK_HASH)
  console.log('p4:', BATCH_INDEX)
  console.log('p5:', l1StorageProof[0].proof)
  console.log('p6:', await prover.rlpEncodeDataLibList(l1ContractData))
  console.log('p7:', l1AccountProof)
  console.log('p8:', L1_WORLD_STATE_ROOT)
  await prover.proveOutputRoot(
    //   L2_WORLD_STATE_ROOT,
    //   L2_MESSAGE_PASSER_STORAGE_ROOT,
    //   L2_BATCH_LATEST_BLOCK_HASH,
    //   BATCH_INDEX,
    //   l1StorageProof,
    //   await prover.rlpEncodeDataLibList(l1ContractData),
    //   l1AccountProof,
    //   L1_WORLD_STATE_ROOT,
    l2OutputStorageRoot,
    L2_MESSAGE_PASSER_STORAGE_ROOT.storageHash,
    L2_BATCH_LATEST_BLOCK_HASH,
    BATCH_INDEX,
    l1StorageProof[0].proof,
    await prover.rlpEncodeDataLibList(l1ContractData),
    l1AccountProof,
    L1_WORLD_STATE_ROOT,
  )

  // console.log('l2OutputStorageRoot: ', l2OutputStorageRoot)
  // await prover.proveIntent(
  //   // FILLER,
  //   // INBOX_CONTRACT,
  //   // INTENT_HASH,
  //   // 1, // no need to be specific about output indexes yet
  //   // l2StorageProof,
  //   // await prover.rlpEncodeDataLibList(l2ContractData),
  //   // l2AccountProof,
  //   // L2_WORLD_STATE_ROOT,
  //   proof.storageProof[0].value,
  //   inboxContract,
  //   intentHash,
  //   Number(outputIndex) - 1, // see comment in contract
  //   proof.storageProof[0].proof,
  //   ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
  //   proof.accountProof,
  //   l2OutputStorageRoot,
  // )
  // console.log(proveIntentParams)

  // const timestamp = Date.now()
  // writeFile(
  //   `output/proofGenerationOutput.json`,
  //   JSON.stringify(proveIntentParams),
  //   (error) => {
  //     if (error) throw error
  //   },
  // )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

// const blockNumber = numberToHex(5903085)
// // const hexBlockNumber = hexlify(blockNumber)
// const L1RPCURL = 'https://eth-sepolia.g.alchemy.com/v2/'
// const baseRPCURL = 'https://base-sepolia.g.alchemy.com/v2/'
// const opRPCURL = 'https://op-sepolia.g.alchemy.com/v2/'
// const proverAddress = '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'
// const L1SubmissionBlock = numberToHex(5903085)
// const intentHash =
//   '0x4321000000000000000000000000000000000000000000000000000000000000'

// const L1WorldStateRoot = ''
// const batchIndex = ''

// async function proveOutputRoot() {
//   const baseProvider = ethers.getDefaultProvider(baseRPCURL + apikey)
//   const L2Provider = new AlchemyProvider(L2_NETWORK, ALCHEMY_API_KEY)
//   const opProvider = ethers.getDefaultProvider(opRPCURL + apikey)
//   const L1Provider = ethers.getDefaultProvider(L1RPCURL + apikey)

//   // Alberts refernce data
//   const baseIntentFulfillBlock = 9934282
//   const baseLastBlockInBatch = 9934320
//   const baseL2toL1MessageParser = ethers.getAddress(
//     '0x4200000000000000000000000000000000000016',
//   )
//   const baseL2toL1MessageParserImp = ethers.getAddress(
//     '0xC0D3C0d3C0d3c0d3C0d3C0D3c0D3c0d3c0D30016',
//   )
//   const sepoliaL2OutputOracle = ethers.getAddress(
//     '0xafeac3ccabcbcb93e0d04fb0337b519360e898b8',
//   )
//   // L2_WORLD_STATE_ROOT =
//   const l2BatchLastBlock = await baseProvider.getBlock(baseLastBlockInBatch)
//   const L2_WORLD_STATE_ROOT = l2BatchLastBlock?.stateRoot
//   console.log('L2_WORLD_STATE_ROOT: ', L2_WORLD_STATE_ROOT)

//   // l2OutputStorageRoot
//   const l2OutputStorageRoot = (
//     await baseProvider.send('eth_getBlockByNumber', [
//       baseLastBlockInBatch,
//       false,
//     ])
//   ).stateRoot
//   const proof = await L2Provider.send('eth_getProof', [
//     inboxContract,
//     [storageSlot],
//     l2EndBatchBlock,
//   ])

//   // L2_MESSAGE_PASSER_STORAGE_ROOT
//   const L2_MESSAGE_PASSER_STORAGE_ROOT = await baseProvider.getStorage(
//     baseL2toL1MessageParserImp,
//     0,
//     l2BatchLastBlock?.hash || '',
//   )
//   console.log(
//     'L2_MESSAGE_PASSER_STORAGE_ROOT: ',
//     L2_MESSAGE_PASSER_STORAGE_ROOT,
//   )

//   const l2FulfillmentBlock = await baseProvider.getBlock(9934282)

//   const L2toL1MessagePasser = '0x4200000000000000000000000000000000000016'

//   //   const block: Block = await L1Provider.send('eth_getBlockByNumber', [
//   //     blockNumber,
//   //     false,
//   //   ])
//   //   const proofOutput = await L1Provider.send('eth_getProof', [
//   //     L2OutputOracleAddress,
//   //     [],
//   //     L1SubmissionBlock,
//   //   ])
//   const storageSlot = hre.ethers.solidityPackedKeccak256(
//     ['bytes'],
//     [
//       hre.ethers.AbiCoder.defaultAbiCoder().encode(
//         ['bytes32', 'uint256'],
//         [intentHash, 0],
//       ),
//     ],
//   )
//   const proofOutput = await baseProvider.send('eth_getProof', [
//     L2toL1MessagePasser,
//     [],
//     baseIntentFulfillBlock,
//   ])
//   console.log(proofOutput)
//   await prover.proveOutputRoot(
//     L2_WORLD_STATE_ROOT,
//     L2_MESSAGE_PASSER_STORAGE_ROOT,
//     L2_BATCH_LATEST_BLOCK_HASH,
//     BATCH_INDEX,
//     l1StorageProof,
//     await prover.rlpEncodeDataLibList(l1ContractData),
//     l1AccountProof,
//     L1_WORLD_STATE_ROOT,
//   )
// }

// proveOutputRoot()
