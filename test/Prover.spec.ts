import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { MockL1Block__factory, Prover } from '../typechain-types'
import {
  AbiCoder,
  encodeRlp,
  getAddress,
  getBytes,
  keccak256,
  toBeHex,
  solidityPackedKeccak256,
  stripZerosLeft,
} from 'ethers'
import {
  networkIds,
  // enshrined,
  actors,
  networks,
  bedrock,
  cannon,
} from './testData'

// Unit Tests
describe('Prover Unit Tests', () => {
  let deployerSigner: SignerWithAddress
  let intentCreatorSigner: SignerWithAddress
  let solverSigner: SignerWithAddress
  let claimantSigner: SignerWithAddress
  let proverSigner: SignerWithAddress
  let recipientSigner: SignerWithAddress
  let prover: Prover
  let blockhashOracle

  before(async () => {
    ;[
      deployerSigner,
      intentCreatorSigner,
      solverSigner,
      claimantSigner,
      proverSigner,
      recipientSigner,
    ] = await ethers.getSigners()
  })

  beforeEach(async () => {
    blockhashOracle = await deploy(deployerSigner, MockL1Block__factory)
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
    const baseSepoliaChainConfiguration = {
      chainId: networks.baseSepolia.chainId, // chainId
      chainConfiguration: {
        provingMechanism: networks.baseSepolia.proving.mechanism, // provingMechanism
        settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
        settlementContract:
          networks.baseSepolia.proving.settlementChain.contract, // settlementContract
        blockhashOracle: await blockhashOracle.getAddress(), // blockhashOracle
        outputRootVersionNumber:
          networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
      },
    }

    const optimismSepoliaChainConfiguration = {
      chainId: networks.optimismSepolia.chainId,
      chainConfiguration: {
        provingMechanism: networks.optimismSepolia.proving.mechanism,
        settlementChainId: networks.optimismSepolia.proving.settlementChain.id,
        settlementContract:
          networks.optimismSepolia.proving.settlementChain.contract,
        blockhashOracle: await blockhashOracle.getAddress(),
        outputRootVersionNumber:
          networks.optimismSepolia.proving.outputRootVersionNumber,
      },
    }
    const proverContract = await ethers.getContractFactory('Prover')
    prover = await proverContract.deploy([
      baseSepoliaChainConfiguration,
      optimismSepoliaChainConfiguration,
    ])
  })

  it('test ethers functions', async () => {
    expect('0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254').to.equal(
      getAddress('0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254'),
    )
    expect('0x56315b90c40730925ec5485cf004d835058518A0').to.equal(
      getAddress('0x56315b90c40730925ec5485cf004d835058518A0'),
    )
  })
  it('test generateOutputRoot', async () => {
    const cannonRootClaimFromProver = await prover.generateOutputRoot(
      0,
      cannon.destinationChain.endBatchBlockStateRoot,
      cannon.destinationChain.messagePasserStateRoot,
      cannon.destinationChain.endBatchBlockHash,
    )
    expect(cannonRootClaimFromProver).to.equal(
      cannon.destinationChain.disputeGameFactory.faultDisputeGame.rootClaim,
    )
  })
  it('test rlpEncodeDataLibList', async () => {
    const rlpEncodeDataLibList = await prover.rlpEncodeDataLibList(
      cannon.destinationChain.disputeGameFactory.contractData,
    )
    expect(rlpEncodeDataLibList).to.equal(
      '0xf84682017780a0f8f08690d07bf01927230d32b6e4b72f5495e885604a5098f17c3a3b7dd7e72ca0fa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998',
    )
  })
  it('test unpack', async () => {
    const gameUnpacked = await prover.unpack(
      cannon.destinationChain.disputeGameFactory.faultDisputeGame.gameId,
    )
    expect(gameUnpacked.gameType_).to.equal(0)
    expect(gameUnpacked.timestamp_).to.equal(
      cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
    )
    expect(gameUnpacked.gameProxy_).to.equal(
      cannon.destinationChain.faultDisputeGame.address,
    )
  })
  it('test assembleGameStatusStorage', async () => {
    await prover.assembleGameStatusStorage(
      cannon.destinationChain.faultDisputeGame.status.storage.createdAt,
      cannon.destinationChain.faultDisputeGame.status.storage.resolvedAt,
      cannon.destinationChain.faultDisputeGame.status.storage.gameStatus,
      cannon.destinationChain.faultDisputeGame.status.storage.initialized,
      cannon.destinationChain.faultDisputeGame.status.storage
        .l2BlockNumberChallenged,
      getBytes(cannon.destinationChain.faultDisputeGame.status.storage.filler),
    )
  })
  it('test proveStorage', async () => {
    // Prove storage showing the FaultDispute Game has a rootClaim which includes the L2Block
    await prover.proveStorage(
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
  })
  it('test proveAccount', async () => {
    await prover.proveAccount(
      cannon.destinationChain.faultDisputeGame.address,
      await prover.rlpEncodeDataLibList(
        cannon.destinationChain.faultDisputeGame.contractData,
      ),
      cannon.destinationChain.faultDisputeGame.accountProof,
      cannon.settlementChain.worldStateRoot,
    )
  })
})
