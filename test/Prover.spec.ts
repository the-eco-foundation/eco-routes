import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { MockL1Block__factory, Prover__factory } from '../typechain-types'
import {
  encodeRlp,
  getAddress,
  getBigInt,
  getBytes,
  getUint,
  hexlify,
  keccak256,
  toBeArray,
  toBeHex,
  toBigInt,
  solidityPackedKeccak256,
  toQuantity,
  stripZerosLeft,
  zeroPadValue,
} from 'ethers'
import t from './testData'

describe('Prover Test', () => {
  let alice: SignerWithAddress

  before(async () => {
    ;[alice] = await ethers.getSigners()
  })

  let prover
  let blockDataSource

  beforeEach(async () => {
    blockDataSource = await deploy(alice, MockL1Block__factory)
    // only the number and hash matters here
    await blockDataSource.setL1BlockValues(
      t.bedrock.l1BlockNumber,
      0,
      0,
      t.bedrock.l1BlockHash,
      0,
      '0x' + '00'.repeat(32),
      0,
      0,
    )

    const proverContract = await ethers.getContractFactory('Prover')
    prover = await upgrades.deployProxy(proverContract, [alice.address], {
      initializer: 'initialize',
      kind: 'uups',
    })

    //baseSepolia Config
    await prover.setChainConfiguration(
      t.baseSepolia.chainId,
      1,
      t.sepolia.chainId,
      t.sepolia.settlementContract.baseSepolia,
      await blockDataSource.getAddress(),
      t.baseSepolia.outputRootVersionNumber,
    )

    //optimismSepolia Config
    await prover.setChainConfiguration(
      t.optimismSepolia.chainId,
      2,
      t.sepolia.chainId,
      t.sepolia.settlementContract.optimismSepolia,
      await blockDataSource.getAddress(),
      t.optimismSepolia.outputRootVersionNumber,
    )
  })

  it('test ethers functions', async () => {
    expect('0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254').to.equal(
      getAddress('0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254'),
    )
    expect('0x56315b90c40730925ec5485cf004d835058518A0').to.equal(
      getAddress('0x56315b90c40730925ec5485cf004d835058518A0'),
    )

    const mainnetOutputRootOptimism = solidityPackedKeccak256(
      ['uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        0,
        '0x0df68f220b56ca051718e18e243769fae3296859243b8cf391b9198314f7eef8',
        '0x0dad8f82574fb890e31def513e65431fae8b7d253769c7b8a8f89d6f2a06e79c',
        '0x6e423d26e1beba75c5d8d0f02ad9c8ae7e7085f16419b6fa4a3b9d726e1fe1bc',
      ],
    )
    expect(mainnetOutputRootOptimism).to.equal(
      '0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1',
    )
  })

  it('has the correct block hash', async () => {
    expect((await blockDataSource.hash()) === t.bedrock.l1BlockHash)
  })

  it('can prove L1 storage', async () => {
    await prover.proveStorage(
      '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
      '0xa082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d', // prefix wih a0 because it's a 32 byte blob
      t.bedrock.l1StorageProof,
      t.bedrock.l1OutputOracleStorageRoot,
    )
  })

  it('can prove L1 account', async () => {
    const val = await prover.rlpEncodeDataLibList(t.bedrock.l1ContractData)

    prover.proveAccount(
      t.bedrock.l1OutputOracleAddressBase,
      val,
      t.bedrock.l1AccountProof,
      t.bedrock.l1WorldStateRoot,
    )
  })

  it('can prove L2 storage', async () => {
    prover.proveStorage(
      '0xfc3e15078e229f29b5446a5a01dc281ef6c7c3054d5a5622159257fe61e0aac7',
      encodeRlp(getBytes('0x445575a842c3f13b4625F1dE6b4ee96c721e580a')),
      // '0x94' + FILLER.slice(2), // 0x80 (base val) + 0x14 (or 20 in decimal) for the length of the address
      t.bedrock.l2StorageProof,
      t.bedrock.l2InboxStorageRoot,
    )
  })

  it('can prove L2 account', async () => {
    const val = await prover.rlpEncodeDataLibList(t.bedrock.l2ContractData)

    prover.proveAccount(
      t.bedrock.inboxContract,
      val,
      t.bedrock.l2AccountProof,
      t.bedrock.l2WorldStateRoot,
    )
  })

  it('full proof Bedrock', async () => {
    await prover.proveL1WorldState(
      await prover.rlpEncodeDataLibList(t.bedrock.blockData),
      t.sepolia.chainId,
    )

    await prover.proveL2WorldStateBedrock(
      t.intents.baseSepolia.destinationChainId,
      t.intents.baseSepolia.rlpEncodedBlockData,
      t.bedrock.l2WorldStateRoot,
      t.bedrock.l2MessageParserStorageRoot,
      t.bedrock.batchIndex,
      t.bedrock.l1StorageProof,
      await prover.rlpEncodeDataLibList(t.bedrock.l1ContractData),
      t.bedrock.l1AccountProof,
      t.bedrock.l1WorldStateRoot,
    )

    await prover.proveIntent(
      t.intents.baseSepolia.destinationChainId,
      t.bedrock.claimant,
      t.bedrock.inboxContract,
      t.bedrock.intentHash,
      // 1, // no need to be specific about output indexes yet
      t.bedrock.l2StorageProof,
      await prover.rlpEncodeDataLibList(
        t.intents.baseSepolia.inboxContractData,
      ),
      t.bedrock.l2AccountProof,
      t.bedrock.l2WorldStateRoot,
    )

    expect(
      (await prover.provenIntents(t.bedrock.intentHash)) === t.bedrock.claimant,
    ).to.be.true
  })

  it('cannon L1 and L2 proof ', async () => {
    const cannonBlockDataSource = await deploy(alice, MockL1Block__factory)
    // only the number and hash matters here
    await cannonBlockDataSource.setL1BlockValues(
      t.cannon.layer1.blockTag,
      0,
      0,
      t.cannon.layer1.blockHash,
      0,
      '0x' + '00'.repeat(32),
      0,
      0,
    )
    const cannonProverContract = await ethers.getContractFactory('Prover')
    const cannonProver = await upgrades.deployProxy(
      cannonProverContract,
      [alice.address],
      { initializer: 'initialize', kind: 'uups' },
    )

    //baseSepolia Config
    await cannonProver.setChainConfiguration(
      t.baseSepolia.chainId,
      1,
      t.sepolia.chainId,
      t.sepolia.settlementContract.baseSepolia,
      await cannonBlockDataSource.getAddress(),
      t.baseSepolia.outputRootVersionNumber,
    )

    //optimismSepolia Config
    await cannonProver.setChainConfiguration(
      t.optimismSepolia.chainId,
      2,
      t.sepolia.chainId,
      t.sepolia.settlementContract.optimismSepolia,
      await cannonBlockDataSource.getAddress(),
      t.optimismSepolia.outputRootVersionNumber,
    )

    await cannonProver.proveL1WorldState(
      t.cannon.layer1.rlpEncodedBlockData,
      t.sepolia.chainId,
    )

    const cannonRootClaimFromProver = await cannonProver.generateOutputRoot(
      0,
      t.cannon.layer2.endBatchBlockStateRoot,
      t.cannon.layer2.messagePasserStateRoot,
      t.cannon.layer2.endBatchBlockHash,
    )
    const cannonRootClaim = solidityPackedKeccak256(
      ['uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        0,
        t.cannon.layer2.endBatchBlockStateRoot,
        t.cannon.layer2.messagePasserStateRoot,
        t.cannon.layer2.endBatchBlockHash,
      ],
    )
    expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
    expect(cannonRootClaimFromProver).to.equal(
      t.cannon.layer2.disputeGameFactory.faultDisputeGame.rootClaim,
    )

    // TODO : Replace with expected test
    // expect(
    //   toBeHex(
    //     stripZerosLeft(
    //       t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
    //     ),
    //   ),
    // ).to.equal('0x66997f68e611c3b8ec600691b9d16e54b433e03742e3b9d8')

    // Get the storage Slot information
    // l1BatchSlot = calculated from the batch number *2 + output slot 3
    // In Solidity
    // bytes32 outputRootStorageSlot =
    // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
    const arrayLengthSlot = zeroPadValue(
      toBeArray(t.enshrined.cannon.disputeGameFactoryListSlotNumber),
      32,
    )
    const firstElementSlot = solidityPackedKeccak256(
      ['bytes32'],
      [arrayLengthSlot],
    )
    const disputeGameStorageSlot = toBeHex(
      BigInt(firstElementSlot) +
        BigInt(
          Number(t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameIndex),
        ),
      32,
    )
    // expect(disputeGameStorageSlot).to.equal(t.cannon.gameIDStorageSlot)

    const gameUnpacked = await cannonProver.unpack(
      t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
    )

    // TODO: Replace with expected test
    // console.log('gameUnpacked: ', gameUnpacked)
    // console.log(
    //   'encodeRlp(toBeHex(stripZerosLeft(t.cannon.gameId))): ',
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
    //       ),
    //     ),
    //   ),
    // )

    // Prove storage showing the DisputeGameFactory created the FaultDisputGame
    await cannonProver.proveStorage(
      t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameIDStorageSlot,
      encodeRlp(
        toBeHex(
          stripZerosLeft(
            t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
          ),
        ),
      ),
      // encodeRlp(t.cannon.gameId),
      t.cannon.layer2.disputeGameFactory.storageProof,
      t.cannon.layer2.disputeGameFactory.stateRoot,
    )

    // Prove account showing that the above ProveStorage is for a valid WorldState
    await cannonProver.proveAccount(
      t.enshrined.cannon.chainData.optimism.disputeGameFactoryAddress,
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.layer2.disputeGameFactory.contractData,
      ),
      t.cannon.layer2.disputeGameFactory.accountProof,
      t.cannon.layer1.worldStateRoot,
    )

    // Prove storage showing the FaultDisputeGame has a status which shows the Defender Won
    await cannonProver.proveStorage(
      t.cannon.layer2.faultDisputeGame.status.storageSlot,
      encodeRlp(
        toBeHex(
          // stripZerosLeft(
          t.cannon.layer2.faultDisputeGame.status.storageData,
          // ),
        ),
      ),
      t.cannon.layer2.faultDisputeGame.status.storageProof,
      t.cannon.layer2.faultDisputeGame.stateRoot,
    )

    // Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block
    await cannonProver.proveStorage(
      t.cannon.layer2.faultDisputeGame.rootClaim.storageSlot,
      encodeRlp(
        toBeHex(
          stripZerosLeft(
            t.cannon.layer2.faultDisputeGame.rootClaim.storageData,
          ),
        ),
      ),
      // encodeRlp(t.cannon.faultDisputeGameRootClaimStorage),
      t.cannon.layer2.faultDisputeGame.rootClaim.storageProof,
      t.cannon.layer2.faultDisputeGame.stateRoot,
    )

    // Prove account showing that the above ProveStorages are for a valid WorldState
    await cannonProver.proveAccount(
      t.cannon.layer2.faultDisputeGame.address,
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.layer2.faultDisputeGame.contractData,
      ),
      t.cannon.layer2.faultDisputeGame.accountProof,
      t.cannon.layer1.worldStateRoot,
    )

    const RLPEncodedDisputeGameFactoryData =
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.layer2.disputeGameFactory.contractData,
      )

    const disputeGameFactoryProofData = {
      l2WorldStateRoot: t.cannon.layer2.endBatchBlockStateRoot,
      l2MessagePasserStateRoot: t.cannon.layer2.messagePasserStateRoot,
      l2LatestBlockHash: t.cannon.layer2.endBatchBlockHash,
      gameIndex: t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameIndex,
      // gameId: toBeHex(stripZerosLeft(t.cannon.gameId)),
      gameId: t.cannon.layer2.disputeGameFactory.faultDisputeGame.gameId,
      l1DisputeFaultGameStorageProof:
        t.cannon.layer2.disputeGameFactory.storageProof,
      rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

      disputeGameFactoryAccountProof:
        t.cannon.layer2.disputeGameFactory.accountProof,
    }

    const RLPEncodedFaultDisputeGameData =
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.layer2.faultDisputeGame.contractData,
      )
    const faultDisputeGameProofData = {
      faultDisputeGameStateRoot: t.cannon.layer2.faultDisputeGame.stateRoot,
      faultDisputeGameRootClaimStorageProof:
        t.cannon.layer2.faultDisputeGame.rootClaim.storageProof,
      // faultDisputeGameStatusStorage: t.cannon.faultDisputeGameStatusStorage,
      // faultDisputeGameStatusStorage: encodeRlp(
      //   toBeHex(
      //     stripZerosLeft(t.cannon.layer2.faultDisputeGame.status.storageData),
      //   ),
      // ),
      faultDisputeGameStatusSlotData: {
        createdAt: t.cannon.layer2.faultDisputeGame.status.storage.createdAt,
        resolvedAt: t.cannon.layer2.faultDisputeGame.status.storage.resolvedAt,
        gameStatus: t.cannon.layer2.faultDisputeGame.status.storage.gameStatus,
        initialized:
          t.cannon.layer2.faultDisputeGame.status.storage.initialized,
        l2BlockNumberChallenged:
          t.cannon.layer2.faultDisputeGame.status.storage
            .l2BlockNumberChallenged,
        filler: getBytes(
          t.cannon.layer2.faultDisputeGame.status.storage.filler,
        ),
      },
      faultDisputeGameStatusStorageProof:
        t.cannon.layer2.faultDisputeGame.status.storageProof,
      rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
      faultDisputeGameAccountProof:
        t.cannon.layer2.faultDisputeGame.accountProof,
    }

    await cannonProver.assembleGameStatusStorage(
      t.cannon.layer2.faultDisputeGame.status.storage.createdAt,
      t.cannon.layer2.faultDisputeGame.status.storage.resolvedAt,
      t.cannon.layer2.faultDisputeGame.status.storage.gameStatus,
      t.cannon.layer2.faultDisputeGame.status.storage.initialized,
      t.cannon.layer2.faultDisputeGame.status.storage.l2BlockNumberChallenged,
      getBytes(t.cannon.layer2.faultDisputeGame.status.storage.filler),
    )

    // Update this after code complete in Prover.sol
    await cannonProver.proveL2WorldStateCannon(
      t.intents.optimismSepolia.destinationChainId,
      t.intents.optimismSepolia.rlpEncodedBlockData,
      t.cannon.layer2.endBatchBlockStateRoot,
      disputeGameFactoryProofData,
      faultDisputeGameProofData,
      t.cannon.layer1.worldStateRoot,
    )

    await cannonProver.proveIntent(
      t.intents.optimismSepolia.destinationChainId,
      t.actors.claimant,
      // t.intents.optimismSepolia.rlpEncodedBlockData,
      t.optimismSepolia.inboxAddress,
      t.cannon.intent.intentHash,
      // 1, // no need to be specific about output indexes yet
      t.cannon.intent.storageProof,
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.intent.inboxContractData,
      ),
      t.cannon.intent.accountProof,
      t.cannon.layer2.endBatchBlockStateRoot,
    )

    // await cannonProver.assembleGameStatusStorage()

    expect(
      (await cannonProver.provenIntents(t.cannon.intent.intentHash)) ===
        t.actors.claimant,
    ).to.be.true
  })
})
