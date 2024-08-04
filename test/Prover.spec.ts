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
import {
  provingMechanisms,
  networkIds,
  // enshrined,
  actors,
  networks,
  bedrock,
  cannon,
} from './testData'

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
      bedrock.settlementChain.blockNumber,
      0,
      0,
      bedrock.settlementChain.blockHash,
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
      networks.baseSepolia.chainId, //chainId
      networks.baseSepolia.proving.mechanism, //provingMechanism
      networks.baseSepolia.proving.settlementChain.id, //settlementChainId
      networks.baseSepolia.proving.settlementChain.contract, //settlementContract
      await blockhashOracle.getAddress(), //blockhashOracle
      networks.baseSepolia.proving.outputRootVersionNumber, //outputRootVersionNumber
    )

    //optimismSepolia Config
    await prover.setChainConfiguration(
      networks.optimismSepolia.chainId,
      networks.optimismSepolia.proving.mechanism,
      networks.optimismSepolia.proving.settlementChain.id,
      networks.optimismSepolia.proving.settlementChain.contract,
      await blockhashOracle.getAddress(),
      networks.optimismSepolia.proving.outputRootVersionNumber,
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
    expect((await blockhashOracle.hash()) === bedrock.settlementChain.blockHash)
  })

  it('can prove OuputOracle storage', async () => {
    await prover.proveStorage(
      '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
      '0xa082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d', // prefix wih a0 because it's a 32 byte blob
      bedrock.settlementChain.storageProof,
      bedrock.settlementChain.outputOracleStorageRoot,
    )
  })

  it('can prove OutputOracle account', async () => {
    const val = await prover.rlpEncodeDataLibList(
      bedrock.settlementChain.contractData,
    )

    prover.proveAccount(
      networks.baseSepolia.proving.settlementChain.contract,
      val,
      bedrock.settlementChain.accountProof,
      bedrock.settlementChain.worldStateRoot,
    )
  })

  it('can prove Intent storage', async () => {
    prover.proveStorage(
      '0xfc3e15078e229f29b5446a5a01dc281ef6c7c3054d5a5622159257fe61e0aac7',
      encodeRlp(getBytes('0x445575a842c3f13b4625F1dE6b4ee96c721e580a')),
      // '0x94' + FILLER.slice(2), // 0x80 (base val) + 0x14 (or 20 in decimal) for the length of the address
      bedrock.destinationChain.storageProof,
      bedrock.destinationChain.inboxStorageRoot,
    )
  })

  it('can prove Intent account', async () => {
    const val = await prover.rlpEncodeDataLibList(
      bedrock.destinationChain.contractData,
    )

    prover.proveAccount(
      bedrock.destinationChain.inboxContract,
      val,
      bedrock.destinationChain.accountProof,
      bedrock.destinationChain.worldStateRoot,
    )
  })

  it('full proof Bedrock', async () => {
    await prover.proveSettlementLayerState(
      await prover.rlpEncodeDataLibList(bedrock.settlementChain.blockData),
      networks.sepolia.chainId,
    )

    await prover.proveWorldStateBedrock(
      bedrock.intent.destinationChainId,
      bedrock.intent.rlpEncodedBlockData,
      bedrock.destinationChain.worldStateRoot,
      bedrock.intent.messageParserStorageRoot,
      bedrock.intent.batchIndex,
      bedrock.settlementChain.storageProof,
      await prover.rlpEncodeDataLibList(bedrock.settlementChain.contractData),
      bedrock.settlementChain.accountProof,
      bedrock.settlementChain.worldStateRoot,
    )

    await prover.proveIntent(
      bedrock.intent.destinationChainId,
      actors.claimant,
      bedrock.destinationChain.inboxContract,
      bedrock.intent.intentHash,
      // 1, // no need to be specific about output indexes yet
      bedrock.destinationChain.storageProof,
      await prover.rlpEncodeDataLibList(bedrock.intent.inboxContractData),
      bedrock.destinationChain.accountProof,
      bedrock.destinationChain.worldStateRoot,
    )

    expect(
      (await prover.provenIntents(bedrock.intent.intentHash)) ===
        actors.claimant,
    ).to.be.true
  })

  // it('cannon L1 and L2 proof ', async () => {
  //   const cannonBlockDataSource = await deploy(alice, MockL1Block__factory)
  //   // only the number and hash matters here
  //   await cannonBlockDataSource.setL1BlockValues(
  //     cannon.settlementChain.blockTag,
  //     0,
  //     0,
  //     cannon.settlementChain.blockHash,
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
  //     networks.baseSepolia.chainId,
  //     1,
  //     networks.sepolia.chainId,
  //     networks.sepolia.settlementContract.baseSepolia,
  //     await cannonBlockDataSource.getAddress(),
  //     networks.baseSepolia.outputRootVersionNumber,
  //   )

  //   //optimismSepolia Config
  //   await cannonProver.setChainConfiguration(
  //     networks.optimismSepolia.chainId,
  //     2,
  //     networks.sepolia.chainId,
  //     networks.sepolia.settlementContract.optimismSepolia,
  //     await cannonBlockDataSource.getAddress(),
  //     networks.optimismSepolia.outputRootVersionNumber,
  //   )

  //   await cannonProver.proveSettlementLayerState(
  //     cannon.settlementChain.rlpEncodedBlockData,
  //     networks.sepolia.chainId,
  //   )

  //   const cannonRootClaimFromProver = await cannonProver.generateOutputRoot(
  //     0,
  //     cannon.destinationChain.endBatchBlockStateRoot,
  //     cannon.destinationChain.messagePasserStateRoot,
  //     cannon.destinationChain.endBatchBlockHash,
  //   )
  //   const cannonRootClaim = solidityPackedKeccak256(
  //     ['uint256', 'bytes32', 'bytes32', 'bytes32'],
  //     [
  //       0,
  //       cannon.destinationChain.endBatchBlockStateRoot,
  //       cannon.destinationChain.messagePasserStateRoot,
  //       cannon.destinationChain.endBatchBlockHash,
  //     ],
  //   )
  //   expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
  //   expect(cannonRootClaimFromProver).to.equal(
  //     cannon.destinationChain.disputeGameFactory.faultDisputeGame.rootClaim,
  //   )

  //   // TODO : Replace with expected test
  //   // expect(
  //   //   toBeHex(
  //   //     stripZerosLeft(
  //   //       cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
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
  //         Number(cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameIndex),
  //       ),
  //     32,
  //   )
  //   // expect(disputeGameStorageSlot).to.equal(cannon.gameIDStorageSlot)

  //   const gameUnpacked = await cannonProver.unpack(
  //     cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
  //   )

  //   // TODO: Replace with expected test
  //   // console.log('gameUnpacked: ', gameUnpacked)
  //   // console.log(
  //   //   'encodeRlp(toBeHex(stripZerosLeft(cannon.gameId))): ',
  //   //   encodeRlp(
  //   //     toBeHex(
  //   //       stripZerosLeft(
  //   //         cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
  //   //       ),
  //   //     ),
  //   //   ),
  //   // )

  //   // Prove storage showing the DisputeGameFactory created the FaultDisputGame
  //   await cannonProver.proveStorage(
  //     cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameIDStorageSlot,
  //     encodeRlp(
  //       toBeHex(
  //         stripZerosLeft(
  //           cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
  //         ),
  //       ),
  //     ),
  //     // encodeRlp(cannon.gameId),
  //     cannon.destinationChain.disputeGameFactory.storageProof,
  //     cannon.destinationChain.disputeGameFactory.stateRoot,
  //   )

  //   // Prove account showing that the above ProveStorage is for a valid WorldState
  //   await cannonProver.proveAccount(
  //     t.enshrined.cannon.chainData.optimism.disputeGameFactoryAddress,
  //     await cannonProver.rlpEncodeDataLibList(
  //       cannon.destinationChain.disputeGameFactory.contractData,
  //     ),
  //     cannon.destinationChain.disputeGameFactory.accountProof,
  //     cannon.settlementChain.worldStateRoot,
  //   )

  //   // Prove storage showing the FaultDisputeGame has a status which shows the Defender Won
  //   await cannonProver.proveStorage(
  //     cannon.destinationChain.faultDisputeGame.status.storageSlot,
  //     encodeRlp(
  //       toBeHex(
  //         // stripZerosLeft(
  //         cannon.destinationChain.faultDisputeGame.status.storageData,
  //         // ),
  //       ),
  //     ),
  //     cannon.destinationChain.faultDisputeGame.status.storageProof,
  //     cannon.destinationChain.faultDisputeGame.stateRoot,
  //   )

  //   // Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block
  //   await cannonProver.proveStorage(
  //     cannon.destinationChain.faultDisputeGame.rootClaim.storageSlot,
  //     encodeRlp(
  //       toBeHex(
  //         stripZerosLeft(
  //           cannon.destinationChain.faultDisputeGame.rootClaim.storageData,
  //         ),
  //       ),
  //     ),
  //     // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
  //     cannon.destinationChain.faultDisputeGame.rootClaim.storageProof,
  //     cannon.destinationChain.faultDisputeGame.stateRoot,
  //   )

  //   // Prove account showing that the above ProveStorages are for a valid WorldState
  //   await cannonProver.proveAccount(
  //     cannon.destinationChain.faultDisputeGame.address,
  //     await cannonProver.rlpEncodeDataLibList(
  //       cannon.destinationChain.faultDisputeGame.contractData,
  //     ),
  //     cannon.destinationChain.faultDisputeGame.accountProof,
  //     cannon.settlementChain.worldStateRoot,
  //   )

  //   const RLPEncodedDisputeGameFactoryData =
  //     await cannonProver.rlpEncodeDataLibList(
  //       cannon.destinationChain.disputeGameFactory.contractData,
  //     )

  //   const disputeGameFactoryProofData = {
  //     l2WorldStateRoot: cannon.destinationChain.endBatchBlockStateRoot,
  //     l2MessagePasserStateRoot: cannon.destinationChain.messagePasserStateRoot,
  //     l2LatestBlockHash: cannon.destinationChain.endBatchBlockHash,
  //     gameIndex: cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameIndex,
  //     // gameId: toBeHex(stripZerosLeft(cannon.gameId)),
  //     gameId: cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
  //     l1DisputeFaultGameStorageProof:
  //       cannon.destinationChain.disputeGameFactory.storageProof,
  //     rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

  //     disputeGameFactoryAccountProof:
  //       cannon.destinationChain.disputeGameFactory.accountProof,
  //   }

  //   const RLPEncodedFaultDisputeGameData =
  //     await cannonProver.rlpEncodeDataLibList(
  //       cannon.destinationChain.faultDisputeGame.contractData,
  //     )
  //   const faultDisputeGameProofData = {
  //     faultDisputeGameStateRoot: cannon.destinationChain.faultDisputeGame.stateRoot,
  //     faultDisputeGameRootClaimStorageProof:
  //       cannon.destinationChain.faultDisputeGame.rootClaim.storageProof,
  //     // faultDisputeGameStatusStorage: cannon.faultDisputeGameStatusStorage,
  //     // faultDisputeGameStatusStorage: encodeRlp(
  //     //   toBeHex(
  //     //     stripZerosLeft(cannon.destinationChain.faultDisputeGame.status.storageData),
  //     //   ),
  //     // ),
  //     faultDisputeGameStatusSlotData: {
  //       createdAt: cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
  //       resolvedAt: cannon.destinationChain.faultDisputeGame.status.storage.resolvedAt,
  //       gameStatus: cannon.destinationChain.faultDisputeGame.status.storage.gameStatus,
  //       initialized:
  //         cannon.destinationChain.faultDisputeGame.status.storage.initialized,
  //       l2BlockNumberChallenged:
  //         cannon.destinationChain.faultDisputeGame.status.storage
  //           .l2BlockNumberChallenged,
  //       filler: getBytes(
  //         cannon.destinationChain.faultDisputeGame.status.storage.filler,
  //       ),
  //     },
  //     faultDisputeGameStatusStorageProof:
  //       cannon.destinationChain.faultDisputeGame.status.storageProof,
  //     rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
  //     faultDisputeGameAccountProof:
  //       cannon.destinationChain.faultDisputeGame.accountProof,
  //   }

  //   await cannonProver.assembleGameStatusStorage(
  //     cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
  //     cannon.destinationChain.faultDisputeGame.status.storage.resolvedAt,
  //     cannon.destinationChain.faultDisputeGame.status.storage.gameStatus,
  //     cannon.destinationChain.faultDisputeGame.status.storage.initialized,
  //     cannon.destinationChain.faultDisputeGame.status.storage.l2BlockNumberChallenged,
  //     getBytes(cannon.destinationChain.faultDisputeGame.status.storage.filler),
  //   )

  //   // Update this after code complete in Prover.sol
  //   await cannonProver.proveWorldStateCannon(
  //     cannon.intent.destinationChainId,
  //     cannon.intent.rlpEncodedBlockData,
  //     cannon.destinationChain.endBatchBlockStateRoot,
  //     disputeGameFactoryProofData,
  //     faultDisputeGameProofData,
  //     cannon.settlementChain.worldStateRoot,
  //   )

  //   await cannonProver.proveIntent(
  //     cannon.intent.destinationChainId,
  //     actors.claimant,
  //     // cannon.intent.rlpEncodedBlockData,
  //     networks.optimismSepolia.inboxAddress,
  //     cannon.intent.intentHash,
  //     // 1, // no need to be specific about output indexes yet
  //     cannon.intent.storageProof,
  //     await cannonProver.rlpEncodeDataLibList(
  //       cannon.intent.inboxContractData,
  //     ),
  //     cannon.intent.accountProof,
  //     cannon.destinationChain.endBatchBlockStateRoot,
  //   )

  //   // await cannonProver.assembleGameStatusStorage()

  //   expect(
  //     (await cannonProver.provenIntents(cannon.intent.intentHash)) ===
  //       actors.claimant,
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
      cannon.settlementChain.blockTag,
      0,
      0,
      cannon.settlementChain.blockHash,
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
      networks.baseSepolia.chainId,
      networks.baseSepolia.proving.mechanism,
      networks.baseSepolia.proving.settlementChain.id,
      networks.baseSepolia.proving.settlementChain.contract,
      await cannonBlockhashOracle.getAddress(),
      networks.baseSepolia.proving.outputRootVersionNumber,
    )

    //optimismSepolia Config
    await cannonProver.setChainConfiguration(
      networks.optimismSepolia.chainId,
      networks.optimismSepolia.proving.mechanism,
      networks.optimismSepolia.proving.settlementChain.id,
      networks.optimismSepolia.proving.settlementChain.contract,
      await cannonBlockhashOracle.getAddress(),
      networks.optimismSepolia.proving.outputRootVersionNumber,
    )
  })

  it('cannon L1 and L2 proof ', async () => {
    // const cannonBlockDataSource = await deploy(alice, MockL1Block__factory)
    // // only the number and hash matters here
    // await cannonBlockDataSource.setL1BlockValues(
    //   cannon.settlementChain.blockTag,
    //   0,
    //   0,
    //   cannon.settlementChain.blockHash,
    //   0,
    //   '0x' + '00'.repeat(32),
    //   0,
    //   0,
    // )

    await cannonProver.proveSettlementLayerState(
      cannon.settlementChain.rlpEncodedBlockData,
      networks.sepolia.chainId,
    )

    const cannonRootClaimFromProver = await cannonProver.generateOutputRoot(
      0,
      cannon.destinationChain.endBatchBlockStateRoot,
      cannon.destinationChain.messagePasserStateRoot,
      cannon.destinationChain.endBatchBlockHash,
    )
    const cannonRootClaim = solidityPackedKeccak256(
      ['uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        0,
        cannon.destinationChain.endBatchBlockStateRoot,
        cannon.destinationChain.messagePasserStateRoot,
        cannon.destinationChain.endBatchBlockHash,
      ],
    )
    expect(cannonRootClaimFromProver).to.equal(cannonRootClaim)
    expect(cannonRootClaimFromProver).to.equal(
      cannon.destinationChain.disputeGameFactory.faultDisputeGame.rootClaim,
    )

    // TODO : Replace with expected test
    // expect(
    //   toBeHex(
    //     stripZerosLeft(
    //       cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
    //     ),
    //   ),
    // ).to.equal('0x66997f68e611c3b8ec600691b9d16e54b433e03742e3b9d8')

    // Get the storage Slot information
    // l1BatchSlot = calculated from the batch number *2 + output slot 3
    // In Solidity
    // bytes32 outputRootStorageSlot =
    // bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
    const arrayLengthSlot = zeroPadValue(
      toBeArray(
        cannon.destinationChain.disputeGameFactory.faultDisputeGame
          .listSlotNumber,
      ),
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
            cannon.destinationChain.disputeGameFactory.faultDisputeGame
              .gameIndex,
          ),
        ),
      32,
    )
    // expect(disputeGameStorageSlot).to.equal(cannon.gameIDStorageSlot)

    const gameUnpacked = await cannonProver.unpack(
      cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
    )

    // TODO: Replace with expected test
    // console.log('gameUnpacked: ', gameUnpacked)
    // console.log(
    //   'encodeRlp(toBeHex(stripZerosLeft(cannon.gameId))): ',
    //   encodeRlp(
    //     toBeHex(
    //       stripZerosLeft(
    //         cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
    //       ),
    //     ),
    //   ),
    // )

    // Prove storage showing the DisputeGameFactory created the FaultDisputGame
    await cannonProver.proveStorage(
      cannon.destinationChain.disputeGameFactory.faultDisputeGame
        .gameIDStorageSlot,
      encodeRlp(
        toBeHex(
          stripZerosLeft(
            cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
          ),
        ),
      ),
      // encodeRlp(cannon.gameId),
      cannon.destinationChain.disputeGameFactory.storageProof,
      cannon.destinationChain.disputeGameFactory.stateRoot,
    )

    // Prove account showing that the above ProveStorage is for a valid WorldState
    await cannonProver.proveAccount(
      networks.optimismSepolia.proving.settlementChain.contract,
      await cannonProver.rlpEncodeDataLibList(
        cannon.destinationChain.disputeGameFactory.contractData,
      ),
      cannon.destinationChain.disputeGameFactory.accountProof,
      cannon.settlementChain.worldStateRoot,
    )

    // Prove storage showing the FaultDisputeGame has a status which shows the Defender Won
    await cannonProver.proveStorage(
      cannon.destinationChain.faultDisputeGame.status.storageSlot,
      encodeRlp(
        toBeHex(
          // stripZerosLeft(
          cannon.destinationChain.faultDisputeGame.status.storageData,
          // ),
        ),
      ),
      cannon.destinationChain.faultDisputeGame.status.storageProof,
      cannon.destinationChain.faultDisputeGame.stateRoot,
    )

    // Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block
    await cannonProver.proveStorage(
      cannon.destinationChain.faultDisputeGame.rootClaim.storageSlot,
      encodeRlp(
        toBeHex(
          stripZerosLeft(
            cannon.destinationChain.faultDisputeGame.rootClaim.storageData,
          ),
        ),
      ),
      // encodeRlp(cannon.faultDisputeGameRootClaimStorage),
      cannon.destinationChain.faultDisputeGame.rootClaim.storageProof,
      cannon.destinationChain.faultDisputeGame.stateRoot,
    )

    // Prove account showing that the above ProveStorages are for a valid WorldState
    await cannonProver.proveAccount(
      cannon.destinationChain.faultDisputeGame.address,
      await cannonProver.rlpEncodeDataLibList(
        cannon.destinationChain.faultDisputeGame.contractData,
      ),
      cannon.destinationChain.faultDisputeGame.accountProof,
      cannon.settlementChain.worldStateRoot,
    )

    const RLPEncodedDisputeGameFactoryData =
      await cannonProver.rlpEncodeDataLibList(
        cannon.destinationChain.disputeGameFactory.contractData,
      )

    const disputeGameFactoryProofData = {
      l2WorldStateRoot: cannon.destinationChain.endBatchBlockStateRoot,
      l2MessagePasserStateRoot: cannon.destinationChain.messagePasserStateRoot,
      l2LatestBlockHash: cannon.destinationChain.endBatchBlockHash,
      gameIndex:
        cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameIndex,
      // gameId: toBeHex(stripZerosLeft(cannon.gameId)),
      gameId:
        cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
      l1DisputeFaultGameStorageProof:
        cannon.destinationChain.disputeGameFactory.storageProof,
      rlpEncodedDisputeGameFactoryData: RLPEncodedDisputeGameFactoryData,

      disputeGameFactoryAccountProof:
        cannon.destinationChain.disputeGameFactory.accountProof,
    }

    const RLPEncodedFaultDisputeGameData =
      await cannonProver.rlpEncodeDataLibList(
        cannon.destinationChain.faultDisputeGame.contractData,
      )
    const faultDisputeGameProofData = {
      faultDisputeGameStateRoot:
        cannon.destinationChain.faultDisputeGame.stateRoot,
      faultDisputeGameRootClaimStorageProof:
        cannon.destinationChain.faultDisputeGame.rootClaim.storageProof,
      // faultDisputeGameStatusStorage: cannon.faultDisputeGameStatusStorage,
      // faultDisputeGameStatusStorage: encodeRlp(
      //   toBeHex(
      //     stripZerosLeft(cannon.destinationChain.faultDisputeGame.status.storageData),
      //   ),
      // ),
      faultDisputeGameStatusSlotData: {
        createdAt:
          cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
        resolvedAt:
          cannon.destinationChain.faultDisputeGame.status.storage.resolvedAt,
        gameStatus:
          cannon.destinationChain.faultDisputeGame.status.storage.gameStatus,
        initialized:
          cannon.destinationChain.faultDisputeGame.status.storage.initialized,
        l2BlockNumberChallenged:
          cannon.destinationChain.faultDisputeGame.status.storage
            .l2BlockNumberChallenged,
        filler: getBytes(
          cannon.destinationChain.faultDisputeGame.status.storage.filler,
        ),
      },
      faultDisputeGameStatusStorageProof:
        cannon.destinationChain.faultDisputeGame.status.storageProof,
      rlpEncodedFaultDisputeGameData: RLPEncodedFaultDisputeGameData,
      faultDisputeGameAccountProof:
        cannon.destinationChain.faultDisputeGame.accountProof,
    }

    await cannonProver.assembleGameStatusStorage(
      cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
      cannon.destinationChain.faultDisputeGame.status.storage.resolvedAt,
      cannon.destinationChain.faultDisputeGame.status.storage.gameStatus,
      cannon.destinationChain.faultDisputeGame.status.storage.initialized,
      cannon.destinationChain.faultDisputeGame.status.storage
        .l2BlockNumberChallenged,
      getBytes(cannon.destinationChain.faultDisputeGame.status.storage.filler),
    )

    // Update this after code complete in Prover.sol
    await cannonProver.proveWorldStateCannon(
      cannon.intent.destinationChainId,
      cannon.intent.rlpEncodedBlockData,
      cannon.destinationChain.endBatchBlockStateRoot,
      disputeGameFactoryProofData,
      faultDisputeGameProofData,
      cannon.settlementChain.worldStateRoot,
    )

    await cannonProver.proveIntent(
      cannon.intent.destinationChainId,
      actors.claimant,
      // cannon.intent.rlpEncodedBlockData,
      networks.optimismSepolia.inboxAddress,
      cannon.intent.intentHash,
      // 1, // no need to be specific about output indexes yet
      cannon.intent.storageProof,
      await cannonProver.rlpEncodeDataLibList(cannon.intent.inboxContractData),
      cannon.intent.accountProof,
      cannon.destinationChain.endBatchBlockStateRoot,
    )

    // await cannonProver.assembleGameStatusStorage()

    expect(
      (await cannonProver.provenIntents(cannon.intent.intentHash)) ===
        actors.claimant,
    ).to.be.true
  })
})
