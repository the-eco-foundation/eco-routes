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

describe('Bedrock Prover Test', () => {
  let alice: SignerWithAddress

  before(async () => {
    ;[alice] = await ethers.getSigners()
  })

  let prover
  let blockhashOracle

  beforeEach(async () => {
    blockhashOracle = await deploy(alice, MockL1Block__factory)
    // only the number and hash matters here
    await blockhashOracle.setL1BlockValues(
      t.bedrock.settlement.blockNumber,
      0,
      0,
      t.bedrock.settlement.blockHash,
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
      t.networks.baseSepolia.chainId, //chainId
      t.networks.baseSepolia.proving.mechanism, //provingMechanism
      t.networks.baseSepolia.proving.settlement.chainId, //settlementChainId
      t.networks.baseSepolia.proving.settlement.contract, //settlementContract
      await blockhashOracle.getAddress(), //blockhashOracle
      t.networks.baseSepolia.proving.outputRootVersionNumber, //outputRootVersionNumber
    )

    //optimismSepolia Config
    await prover.setChainConfiguration(
      t.networks.optimismSepolia.chainId,
      t.networks.optimismSepolia.proving.mechanism,
      t.networks.optimismSepolia.proving.settlement.chainId,
      t.networks.optimismSepolia.proving.settlement.contract,
      await blockhashOracle.getAddress(),
      t.networks.optimismSepolia.proving.outputRootVersionNumber,
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
    expect((await blockhashOracle.hash()) === t.bedrock.settlement.blockHash)
  })

  it('can prove OuputOracle storage', async () => {
    await prover.proveStorage(
      '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
      '0xa082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d', // prefix wih a0 because it's a 32 byte blob
      t.bedrock.settlement.storageProof,
      t.bedrock.settlement.outputOracleStorageRoot,
    )
  })

  it('can prove OutputOracle account', async () => {
    const val = await prover.rlpEncodeDataLibList(
      t.bedrock.settlement.contractData,
    )

    prover.proveAccount(
      t.networks.baseSepolia.proving.settlement.contract,
      val,
      t.bedrock.settlement.accountProof,
      t.bedrock.settlement.worldStateRoot,
    )
  })

  it('can prove Intent storage', async () => {
    prover.proveStorage(
      '0xfc3e15078e229f29b5446a5a01dc281ef6c7c3054d5a5622159257fe61e0aac7',
      encodeRlp(getBytes('0x445575a842c3f13b4625F1dE6b4ee96c721e580a')),
      // '0x94' + FILLER.slice(2), // 0x80 (base val) + 0x14 (or 20 in decimal) for the length of the address
      t.bedrock.destination.storageProof,
      t.bedrock.destination.inboxStorageRoot,
    )
  })

  it('can prove Intent account', async () => {
    const val = await prover.rlpEncodeDataLibList(
      t.bedrock.destination.contractData,
    )

    prover.proveAccount(
      t.bedrock.destination.inboxContract,
      val,
      t.bedrock.destination.accountProof,
      t.bedrock.destination.worldStateRoot,
    )
  })

  it('full proof Bedrock', async () => {
    await prover.proveL1WorldState(
      await prover.rlpEncodeDataLibList(t.bedrock.settlement.blockData),
      t.networks.sepolia.chainId,
    )

    await prover.proveL2WorldStateBedrock(
      t.bedrock.intent.destinationChainId,
      t.bedrock.intent.rlpEncodedBlockData,
      t.bedrock.destination.worldStateRoot,
      t.bedrock.intent.messageParserStorageRoot,
      t.bedrock.intent.batchIndex,
      t.bedrock.settlement.storageProof,
      await prover.rlpEncodeDataLibList(t.bedrock.settlement.contractData),
      t.bedrock.settlement.accountProof,
      t.bedrock.settlement.worldStateRoot,
    )

    await prover.proveIntent(
      t.bedrock.intent.destinationChainId,
      t.actors.claimant,
      t.bedrock.destination.inboxContract,
      t.bedrock.intent.intentHash,
      // 1, // no need to be specific about output indexes yet
      t.bedrock.destination.storageProof,
      await prover.rlpEncodeDataLibList(t.bedrock.intent.inboxContractData),
      t.bedrock.destination.accountProof,
      t.bedrock.destination.worldStateRoot,
    )

    expect(
      (await prover.provenIntents(t.bedrock.intent.intentHash)) ===
        t.actors.claimant,
    ).to.be.true
  })

  // it('cannon L1 and L2 proof ', async () => {
  //   const cannonBlockDataSource = await deploy(alice, MockL1Block__factory)
  //   // only the number and hash matters here
  //   await cannonBlockDataSource.setL1BlockValues(
  //     t.cannon.settlement.blockTag,
  //     0,
  //     0,
  //     t.cannon.settlement.blockHash,
  //     0,
  //     '0x' + '00'.repeat(32),
  //     0,
  //     0,
  //   )
  //   const cannonProverContract = await ethers.getContractFactory('Prover')
  //   const cannonProver = await upgrades.deployProxy(
  //     cannonProverContract,
  //     [alice.address],
  //     { initializer: 'initialize', kind: 'uups' },
  //   )

  //   //baseSepolia Config
  //   await cannonProver.setChainConfiguration(
  //     t.networks.baseSepolia.chainId,
  //     1,
  //     t.networks.sepolia.chainId,
  //     t.networks.sepolia.settlementContract.baseSepolia,
  //     await cannonBlockDataSource.getAddress(),
  //     t.networks.baseSepolia.outputRootVersionNumber,
  //   )

  //   //optimismSepolia Config
  //   await cannonProver.setChainConfiguration(
  //     t.networks.optimismSepolia.chainId,
  //     2,
  //     t.networks.sepolia.chainId,
  //     t.networks.sepolia.settlementContract.optimismSepolia,
  //     await cannonBlockDataSource.getAddress(),
  //     t.networks.optimismSepolia.outputRootVersionNumber,
  //   )

  //   await cannonProver.proveL1WorldState(
  //     t.cannon.settlement.rlpEncodedBlockData,
  //     t.networks.sepolia.chainId,
  //   )

  //   const cannonRootClaimFromProver = await cannonProver.generateOutputRoot(
  //     0,
  //     t.cannon.destination.endBatchBlockStateRoot,
  //     t.cannon.destination.messagePasserStateRoot,
  //     t.cannon.destination.endBatchBlockHash,
  //   )
  //   const cannonRootClaim = solidityPackedKeccak256(
  //     ['uint256', 'bytes32', 'bytes32', 'bytes32'],
  //     [
  //       0,
  //       t.cannon.destination.endBatchBlockStateRoot,
  //       t.cannon.destination.messagePasserStateRoot,
  //       t.cannon.destination.endBatchBlockHash,
  //     ],
  //   )
  //   expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
  //   expect(cannonRootClaimFromProver).to.equal(
  //     t.cannon.destination.disputeGameFactory.faultDisputeGame.rootClaim,
  //   )

  //   // TODO : Replace with expected test
  //   // expect(
  //   //   toBeHex(
  //   //     stripZerosLeft(
  //   //       t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
  //   //     ),
  //   //   ),
  //   // ).to.equal('0x66997f68e611c3b8ec600691b9d16e54b433e03742e3b9d8')

  //   // Get the storage Slot information
  //   // l1BatchSlot = calculated from the batch number *2 + output slot 3
  //   // In Solidity
  //   // bytes32 outputRootStorageSlot =
  //   // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
  //   const arrayLengthSlot = zeroPadValue(
  //     toBeArray(t.enshrined.cannon.disputeGameFactoryListSlotNumber),
  //     32,
  //   )
  //   const firstElementSlot = solidityPackedKeccak256(
  //     ['bytes32'],
  //     [arrayLengthSlot],
  //   )
  //   const disputeGameStorageSlot = toBeHex(
  //     BigInt(firstElementSlot) +
  //       BigInt(
  //         Number(t.cannon.destination.disputeGameFactory.faultDisputeGame.gameIndex),
  //       ),
  //     32,
  //   )
  //   // expect(disputeGameStorageSlot).to.equal(t.cannon.gameIDStorageSlot)

  //   const gameUnpacked = await cannonProver.unpack(
  //     t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
  //   )

  //   // TODO: Replace with expected test
  //   // console.log('gameUnpacked: ', gameUnpacked)
  //   // console.log(
  //   //   'encodeRlp(toBeHex(stripZerosLeft(t.cannon.gameId))): ',
  //   //   encodeRlp(
  //   //     toBeHex(
  //   //       stripZerosLeft(
  //   //         t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
  //   //       ),
  //   //     ),
  //   //   ),
  //   // )

  //   // Prove storage showing the DisputeGameFactory created the FaultDisputGame
  //   await cannonProver.proveStorage(
  //     t.cannon.destination.disputeGameFactory.faultDisputeGame.gameIDStorageSlot,
  //     encodeRlp(
  //       toBeHex(
  //         stripZerosLeft(
  //           t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
  //         ),
  //       ),
  //     ),
  //     // encodeRlp(t.cannon.gameId),
  //     t.cannon.destination.disputeGameFactory.storageProof,
  //     t.cannon.destination.disputeGameFactory.stateRoot,
  //   )

  //   // Prove account showing that the above ProveStorage is for a valid WorldState
  //   await cannonProver.proveAccount(
  //     t.enshrined.cannon.chainData.optimism.disputeGameFactoryAddress,
  //     await cannonProver.rlpEncodeDataLibList(
  //       t.cannon.destination.disputeGameFactory.contractData,
  //     ),
  //     t.cannon.destination.disputeGameFactory.accountProof,
  //     t.cannon.settlement.worldStateRoot,
  //   )

  //   // Prove storage showing the FaultDisputeGame has a status which shows the Defender Won
  //   await cannonProver.proveStorage(
  //     t.cannon.destination.faultDisputeGame.status.storageSlot,
  //     encodeRlp(
  //       toBeHex(
  //         // stripZerosLeft(
  //         t.cannon.destination.faultDisputeGame.status.storageData,
  //         // ),
  //       ),
  //     ),
  //     t.cannon.destination.faultDisputeGame.status.storageProof,
  //     t.cannon.destination.faultDisputeGame.stateRoot,
  //   )

  //   // Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block
  //   await cannonProver.proveStorage(
  //     t.cannon.destination.faultDisputeGame.rootClaim.storageSlot,
  //     encodeRlp(
  //       toBeHex(
  //         stripZerosLeft(
  //           t.cannon.destination.faultDisputeGame.rootClaim.storageData,
  //         ),
  //       ),
  //     ),
  //     // encodeRlp(t.cannon.faultDisputeGameRootClaimStorage),
  //     t.cannon.destination.faultDisputeGame.rootClaim.storageProof,
  //     t.cannon.destination.faultDisputeGame.stateRoot,
  //   )

  //   // Prove account showing that the above ProveStorages are for a valid WorldState
  //   await cannonProver.proveAccount(
  //     t.cannon.destination.faultDisputeGame.address,
  //     await cannonProver.rlpEncodeDataLibList(
  //       t.cannon.destination.faultDisputeGame.contractData,
  //     ),
  //     t.cannon.destination.faultDisputeGame.accountProof,
  //     t.cannon.settlement.worldStateRoot,
  //   )

  //   const RLPEncodedDisputeGameFactoryData =
  //     await cannonProver.rlpEncodeDataLibList(
  //       t.cannon.destination.disputeGameFactory.contractData,
  //     )

  //   const disputeGameFactoryProofData = {
  //     l2WorldStateRoot: t.cannon.destination.endBatchBlockStateRoot,
  //     l2MessagePasserStateRoot: t.cannon.destination.messagePasserStateRoot,
  //     l2LatestBlockHash: t.cannon.destination.endBatchBlockHash,
  //     gameIndex: t.cannon.destination.disputeGameFactory.faultDisputeGame.gameIndex,
  //     // gameId: toBeHex(stripZerosLeft(t.cannon.gameId)),
  //     gameId: t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
  //     l1DisputeFaultGameStorageProof:
  //       t.cannon.destination.disputeGameFactory.storageProof,
  //     rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

  //     disputeGameFactoryAccountProof:
  //       t.cannon.destination.disputeGameFactory.accountProof,
  //   }

  //   const RLPEncodedFaultDisputeGameData =
  //     await cannonProver.rlpEncodeDataLibList(
  //       t.cannon.destination.faultDisputeGame.contractData,
  //     )
  //   const faultDisputeGameProofData = {
  //     faultDisputeGameStateRoot: t.cannon.destination.faultDisputeGame.stateRoot,
  //     faultDisputeGameRootClaimStorageProof:
  //       t.cannon.destination.faultDisputeGame.rootClaim.storageProof,
  //     // faultDisputeGameStatusStorage: t.cannon.faultDisputeGameStatusStorage,
  //     // faultDisputeGameStatusStorage: encodeRlp(
  //     //   toBeHex(
  //     //     stripZerosLeft(t.cannon.destination.faultDisputeGame.status.storageData),
  //     //   ),
  //     // ),
  //     faultDisputeGameStatusSlotData: {
  //       createdAt: t.cannon.destination.faultDisputeGame.status.storage.createdAt,
  //       resolvedAt: t.cannon.destination.faultDisputeGame.status.storage.resolvedAt,
  //       gameStatus: t.cannon.destination.faultDisputeGame.status.storage.gameStatus,
  //       initialized:
  //         t.cannon.destination.faultDisputeGame.status.storage.initialized,
  //       l2BlockNumberChallenged:
  //         t.cannon.destination.faultDisputeGame.status.storage
  //           .l2BlockNumberChallenged,
  //       filler: getBytes(
  //         t.cannon.destination.faultDisputeGame.status.storage.filler,
  //       ),
  //     },
  //     faultDisputeGameStatusStorageProof:
  //       t.cannon.destination.faultDisputeGame.status.storageProof,
  //     rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
  //     faultDisputeGameAccountProof:
  //       t.cannon.destination.faultDisputeGame.accountProof,
  //   }

  //   await cannonProver.assembleGameStatusStorage(
  //     t.cannon.destination.faultDisputeGame.status.storage.createdAt,
  //     t.cannon.destination.faultDisputeGame.status.storage.resolvedAt,
  //     t.cannon.destination.faultDisputeGame.status.storage.gameStatus,
  //     t.cannon.destination.faultDisputeGame.status.storage.initialized,
  //     t.cannon.destination.faultDisputeGame.status.storage.l2BlockNumberChallenged,
  //     getBytes(t.cannon.destination.faultDisputeGame.status.storage.filler),
  //   )

  //   // Update this after code complete in Prover.sol
  //   await cannonProver.proveL2WorldStateCannon(
  //     t.cannon.intent.destinationChainId,
  //     t.cannon.intent.rlpEncodedBlockData,
  //     t.cannon.destination.endBatchBlockStateRoot,
  //     disputeGameFactoryProofData,
  //     faultDisputeGameProofData,
  //     t.cannon.settlement.worldStateRoot,
  //   )

  //   await cannonProver.proveIntent(
  //     t.cannon.intent.destinationChainId,
  //     t.actors.claimant,
  //     // t.cannon.intent.rlpEncodedBlockData,
  //     t.networks.optimismSepolia.inboxAddress,
  //     t.cannon.intent.intentHash,
  //     // 1, // no need to be specific about output indexes yet
  //     t.cannon.intent.storageProof,
  //     await cannonProver.rlpEncodeDataLibList(
  //       t.cannon.intent.inboxContractData,
  //     ),
  //     t.cannon.intent.accountProof,
  //     t.cannon.destination.endBatchBlockStateRoot,
  //   )

  //   // await cannonProver.assembleGameStatusStorage()

  //   expect(
  //     (await cannonProver.provenIntents(t.cannon.intent.intentHash)) ===
  //       t.actors.claimant,
  //   ).to.be.true
  // })
})

describe('Cannon Prover Test', () => {
  let alice: SignerWithAddress

  before(async () => {
    ;[alice] = await ethers.getSigners()
  })

  let cannonProver
  let cannonBlockhashOracle

  beforeEach(async () => {
    cannonBlockhashOracle = await deploy(alice, MockL1Block__factory)
    // only the number and hash matters here
    await cannonBlockhashOracle.setL1BlockValues(
      t.cannon.settlement.blockTag,
      0,
      0,
      t.cannon.settlement.blockHash,
      0,
      '0x' + '00'.repeat(32),
      0,
      0,
    )

    const cannonProverContract = await ethers.getContractFactory('Prover')
    cannonProver = await upgrades.deployProxy(
      cannonProverContract,
      [alice.address],
      { initializer: 'initialize', kind: 'uups' },
    )
    //baseSepolia Config
    await cannonProver.setChainConfiguration(
      t.networks.baseSepolia.chainId,
      t.networks.baseSepolia.proving.mechanism,
      t.networks.baseSepolia.proving.settlement.chainId,
      t.networks.baseSepolia.proving.settlement.contract,
      await cannonBlockhashOracle.getAddress(),
      t.networks.baseSepolia.proving.outputRootVersionNumber,
    )

    //optimismSepolia Config
    await cannonProver.setChainConfiguration(
      t.networks.optimismSepolia.chainId,
      t.networks.optimismSepolia.proving.mechanism,
      t.networks.optimismSepolia.proving.settlement.chainId,
      t.networks.optimismSepolia.proving.settlement.contract,
      await cannonBlockhashOracle.getAddress(),
      t.networks.optimismSepolia.proving.outputRootVersionNumber,
    )
  })

  it('cannon L1 and L2 proof ', async () => {
    // const cannonBlockDataSource = await deploy(alice, MockL1Block__factory)
    // // only the number and hash matters here
    // await cannonBlockDataSource.setL1BlockValues(
    //   t.cannon.settlement.blockTag,
    //   0,
    //   0,
    //   t.cannon.settlement.blockHash,
    //   0,
    //   '0x' + '00'.repeat(32),
    //   0,
    //   0,
    // )

    await cannonProver.proveL1WorldState(
      t.cannon.settlement.rlpEncodedBlockData,
      t.networks.sepolia.chainId,
    )

    const cannonRootClaimFromProver = await cannonProver.generateOutputRoot(
      0,
      t.cannon.destination.endBatchBlockStateRoot,
      t.cannon.destination.messagePasserStateRoot,
      t.cannon.destination.endBatchBlockHash,
    )
    const cannonRootClaim = solidityPackedKeccak256(
      ['uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        0,
        t.cannon.destination.endBatchBlockStateRoot,
        t.cannon.destination.messagePasserStateRoot,
        t.cannon.destination.endBatchBlockHash,
      ],
    )
    expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
    expect(cannonRootClaimFromProver).to.equal(
      t.cannon.destination.disputeGameFactory.faultDisputeGame.rootClaim,
    )

    // TODO : Replace with expected test
    // expect(
    //   toBeHex(
    //     stripZerosLeft(
    //       t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
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
          Number(
            t.cannon.destination.disputeGameFactory.faultDisputeGame.gameIndex,
          ),
        ),
      32,
    )
    // expect(disputeGameStorageSlot).to.equal(t.cannon.gameIDStorageSlot)

    const gameUnpacked = await cannonProver.unpack(
      t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
    )

    // TODO: Replace with expected test
    // console.log('gameUnpacked: ', gameUnpacked)
    // console.log(
    //   'encodeRlp(toBeHex(stripZerosLeft(t.cannon.gameId))): ',
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
    //       ),
    //     ),
    //   ),
    // )

    // Prove storage showing the DisputeGameFactory created the FaultDisputGame
    await cannonProver.proveStorage(
      t.cannon.destination.disputeGameFactory.faultDisputeGame
        .gameIDStorageSlot,
      encodeRlp(
        toBeHex(
          stripZerosLeft(
            t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
          ),
        ),
      ),
      // encodeRlp(t.cannon.gameId),
      t.cannon.destination.disputeGameFactory.storageProof,
      t.cannon.destination.disputeGameFactory.stateRoot,
    )

    // Prove account showing that the above ProveStorage is for a valid WorldState
    await cannonProver.proveAccount(
      t.enshrined.cannon.chainData.optimism.disputeGameFactoryAddress,
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.destination.disputeGameFactory.contractData,
      ),
      t.cannon.destination.disputeGameFactory.accountProof,
      t.cannon.settlement.worldStateRoot,
    )

    // Prove storage showing the FaultDisputeGame has a status which shows the Defender Won
    await cannonProver.proveStorage(
      t.cannon.destination.faultDisputeGame.status.storageSlot,
      encodeRlp(
        toBeHex(
          // stripZerosLeft(
          t.cannon.destination.faultDisputeGame.status.storageData,
          // ),
        ),
      ),
      t.cannon.destination.faultDisputeGame.status.storageProof,
      t.cannon.destination.faultDisputeGame.stateRoot,
    )

    // Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block
    await cannonProver.proveStorage(
      t.cannon.destination.faultDisputeGame.rootClaim.storageSlot,
      encodeRlp(
        toBeHex(
          stripZerosLeft(
            t.cannon.destination.faultDisputeGame.rootClaim.storageData,
          ),
        ),
      ),
      // encodeRlp(t.cannon.faultDisputeGameRootClaimStorage),
      t.cannon.destination.faultDisputeGame.rootClaim.storageProof,
      t.cannon.destination.faultDisputeGame.stateRoot,
    )

    // Prove account showing that the above ProveStorages are for a valid WorldState
    await cannonProver.proveAccount(
      t.cannon.destination.faultDisputeGame.address,
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.destination.faultDisputeGame.contractData,
      ),
      t.cannon.destination.faultDisputeGame.accountProof,
      t.cannon.settlement.worldStateRoot,
    )

    const RLPEncodedDisputeGameFactoryData =
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.destination.disputeGameFactory.contractData,
      )

    const disputeGameFactoryProofData = {
      l2WorldStateRoot: t.cannon.destination.endBatchBlockStateRoot,
      l2MessagePasserStateRoot: t.cannon.destination.messagePasserStateRoot,
      l2LatestBlockHash: t.cannon.destination.endBatchBlockHash,
      gameIndex:
        t.cannon.destination.disputeGameFactory.faultDisputeGame.gameIndex,
      // gameId: toBeHex(stripZerosLeft(t.cannon.gameId)),
      gameId: t.cannon.destination.disputeGameFactory.faultDisputeGame.gameId,
      l1DisputeFaultGameStorageProof:
        t.cannon.destination.disputeGameFactory.storageProof,
      rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

      disputeGameFactoryAccountProof:
        t.cannon.destination.disputeGameFactory.accountProof,
    }

    const RLPEncodedFaultDisputeGameData =
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.destination.faultDisputeGame.contractData,
      )
    const faultDisputeGameProofData = {
      faultDisputeGameStateRoot:
        t.cannon.destination.faultDisputeGame.stateRoot,
      faultDisputeGameRootClaimStorageProof:
        t.cannon.destination.faultDisputeGame.rootClaim.storageProof,
      // faultDisputeGameStatusStorage: t.cannon.faultDisputeGameStatusStorage,
      // faultDisputeGameStatusStorage: encodeRlp(
      //   toBeHex(
      //     stripZerosLeft(t.cannon.destination.faultDisputeGame.status.storageData),
      //   ),
      // ),
      faultDisputeGameStatusSlotData: {
        createdAt:
          t.cannon.destination.faultDisputeGame.status.storage.createdAt,
        resolvedAt:
          t.cannon.destination.faultDisputeGame.status.storage.resolvedAt,
        gameStatus:
          t.cannon.destination.faultDisputeGame.status.storage.gameStatus,
        initialized:
          t.cannon.destination.faultDisputeGame.status.storage.initialized,
        l2BlockNumberChallenged:
          t.cannon.destination.faultDisputeGame.status.storage
            .l2BlockNumberChallenged,
        filler: getBytes(
          t.cannon.destination.faultDisputeGame.status.storage.filler,
        ),
      },
      faultDisputeGameStatusStorageProof:
        t.cannon.destination.faultDisputeGame.status.storageProof,
      rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
      faultDisputeGameAccountProof:
        t.cannon.destination.faultDisputeGame.accountProof,
    }

    await cannonProver.assembleGameStatusStorage(
      t.cannon.destination.faultDisputeGame.status.storage.createdAt,
      t.cannon.destination.faultDisputeGame.status.storage.resolvedAt,
      t.cannon.destination.faultDisputeGame.status.storage.gameStatus,
      t.cannon.destination.faultDisputeGame.status.storage.initialized,
      t.cannon.destination.faultDisputeGame.status.storage
        .l2BlockNumberChallenged,
      getBytes(t.cannon.destination.faultDisputeGame.status.storage.filler),
    )

    // Update this after code complete in Prover.sol
    await cannonProver.proveL2WorldStateCannon(
      t.cannon.intent.destinationChainId,
      t.cannon.intent.rlpEncodedBlockData,
      t.cannon.destination.endBatchBlockStateRoot,
      disputeGameFactoryProofData,
      faultDisputeGameProofData,
      t.cannon.settlement.worldStateRoot,
    )

    await cannonProver.proveIntent(
      t.cannon.intent.destinationChainId,
      t.actors.claimant,
      // t.cannon.intent.rlpEncodedBlockData,
      t.networks.optimismSepolia.inboxAddress,
      t.cannon.intent.intentHash,
      // 1, // no need to be specific about output indexes yet
      t.cannon.intent.storageProof,
      await cannonProver.rlpEncodeDataLibList(
        t.cannon.intent.inboxContractData,
      ),
      t.cannon.intent.accountProof,
      t.cannon.destination.endBatchBlockStateRoot,
    )

    // await cannonProver.assembleGameStatusStorage()

    expect(
      (await cannonProver.provenIntents(t.cannon.intent.intentHash)) ===
        t.actors.claimant,
    ).to.be.true
  })
})
