import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import hre from 'hardhat'
import { TestERC20, IntentSource, TestProver, Inbox } from '../typechain-types'
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { keccak256, BytesLike } from 'ethers'
import { encodeIdentifier, encodeTransfer } from '../utils/encode'
const { ethers } = hre

describe('Intent Source Test', (): void => {
  let intentSource: IntentSource
  let prover: TestProver
  let inbox: Inbox
  let tokenA: TestERC20
  let tokenB: TestERC20
  let creator: SignerWithAddress
  let solver: SignerWithAddress
  let claimant: SignerWithAddress
  let otherPerson: SignerWithAddress
  const mintAmount: number = 1000
  const minimumDuration = 1000

  let expiry: number
  let intentHash: BytesLike
  let chainId: number
  let targets: string[]
  let data: BytesLike[]
  let rewardTokens: string[]
  let rewardAmounts: number[]
  let nonce: BytesLike

  async function deploySourceFixture(): Promise<{
    intentSource: IntentSource
    prover: TestProver
    tokenA: TestERC20
    tokenB: TestERC20
    creator: SignerWithAddress
    solver: SignerWithAddress
    claimant: SignerWithAddress
    otherPerson: SignerWithAddress
  }> {
    const [creator, solver, claimant, otherPerson] = await ethers.getSigners()
    // deploy prover
    prover = await (await ethers.getContractFactory('TestProver')).deploy()

    const intentSourceFactory = await ethers.getContractFactory('IntentSource')
    const intentSource = await intentSourceFactory.deploy(minimumDuration, 0)
    inbox = await (await ethers.getContractFactory('Inbox')).deploy()

    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('TestERC20')
    const tokenA = await erc20Factory.deploy('A', 'A')
    const tokenB = await erc20Factory.deploy('B', 'B')

    return {
      intentSource,
      prover,
      tokenA,
      tokenB,
      creator,
      solver,
      claimant,
      otherPerson,
    }
  }

  async function mintAndApprove() {
    await tokenA.connect(creator).mint(creator.address, mintAmount)
    await tokenB.connect(creator).mint(creator.address, mintAmount * 2)

    await tokenA.connect(creator).approve(intentSource, mintAmount)
    await tokenB.connect(creator).approve(intentSource, mintAmount * 2)
  }

  beforeEach(async (): Promise<void> => {
    ;({
      intentSource,
      prover,
      tokenA,
      tokenB,
      creator,
      solver,
      claimant,
      otherPerson,
    } = await loadFixture(deploySourceFixture))

    // fund the creator and approve it to create an intent
    await mintAndApprove()
  })

  describe('constructor', () => {
    it('is initialized correctly', async () => {
      expect(await intentSource.CHAIN_ID()).to.eq(
        (await ethers.provider.getNetwork()).chainId,
      )
      expect(await intentSource.MINIMUM_DURATION()).to.eq(minimumDuration)
      expect(await intentSource.counter()).to.eq(0)
    })
  })
  describe('intent creation', async () => {
    beforeEach(async (): Promise<void> => {
      expiry = (await time.latest()) + minimumDuration + 10
      chainId = 1
      targets = [await tokenA.getAddress()]
      data = [await encodeTransfer(creator.address, mintAmount)]
      rewardTokens = [await tokenA.getAddress(), await tokenB.getAddress()]
      rewardAmounts = [mintAmount, mintAmount * 2]
      nonce = await encodeIdentifier(
        0,
        (await ethers.provider.getNetwork()).chainId,
      )
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const intermediateHash = keccak256(
        abiCoder.encode(
          ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
          [
            await intentSource.CHAIN_ID(),
            chainId,
            targets,
            data,
            expiry,
            nonce,
          ],
        ),
      )
      intentHash = keccak256(
        abiCoder.encode(
          ['address', 'bytes32'],
          [await inbox.getAddress(), intermediateHash],
        ),
      )
    })
    context('fails if', () => {
      it('targets or data length is 0, or if they are mismatched', async () => {
        // mismatch
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              await inbox.getAddress(),
              [await tokenA.getAddress(), await tokenB.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration,
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'CalldataMismatch')
        // length 0
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              await inbox.getAddress(),
              [],
              [],
              [await tokenA.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration,
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'CalldataMismatch')
      })
      it('rewardTokens or rewardAmounts is 0, or if they are mismatched', async () => {
        // mismatch
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              await inbox.getAddress(),
              [await tokenA.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress(), await tokenB.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration,
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'RewardsMismatch')
        // length 0
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              await inbox.getAddress(),
              [await tokenA.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [],
              [],
              (await time.latest()) + minimumDuration,
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'RewardsMismatch')
      })
      it('expiryTime is too early', async () => {
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              await inbox.getAddress(),
              [await tokenA.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration - 1,
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'ExpiryTooSoon')
      })
    })
    it('creates properly', async () => {
      await intentSource
        .connect(creator)
        .createIntent(
          chainId,
          await inbox.getAddress(),
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
          await prover.getAddress(),
        )
      const intent = await intentSource.intents(intentHash)
      // value types
      expect(intent.creator).to.eq(creator.address)
      expect(intent.destinationChainID).to.eq(chainId)
      expect(intent.expiryTime).to.eq(expiry)
      expect(intent.hasBeenWithdrawn).to.eq(false)
      expect(intent.nonce).to.eq(nonce)
      // getIntent complete call
      const intentDetail = await intentSource.getIntent(intentHash)
      expect(intentDetail.creator).to.eq(creator.address)
      expect(intentDetail.destinationChainID).to.eq(chainId)
      expect(intentDetail.targets).to.deep.eq(targets)
      expect(intentDetail.data).to.deep.eq(data)
      expect(intentDetail.rewardTokens).to.deep.eq(rewardTokens)
      expect(intentDetail.rewardAmounts).to.deep.eq(rewardAmounts)
      expect(intentDetail.expiryTime).to.eq(expiry)
      expect(intentDetail.hasBeenWithdrawn).to.eq(false)
      expect(intentDetail.nonce).to.eq(nonce)
      expect(intentDetail.prover).to.eq(await prover.getAddress())
    })
    it('increments counter and locks up tokens', async () => {
      const counter = await intentSource.counter()
      const initialBalanceA = await tokenA.balanceOf(
        await intentSource.getAddress(),
      )
      const initialBalanceB = await tokenA.balanceOf(
        await intentSource.getAddress(),
      )
      await intentSource
        .connect(creator)
        .createIntent(
          chainId,
          await inbox.getAddress(),
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
          await prover.getAddress(),
        )
      expect(await intentSource.counter()).to.eq(Number(counter) + 1)
      expect(await tokenA.balanceOf(await intentSource.getAddress())).to.eq(
        Number(initialBalanceA) + rewardAmounts[0],
      )
      expect(await tokenB.balanceOf(await intentSource.getAddress())).to.eq(
        Number(initialBalanceB) + rewardAmounts[1],
      )
    })
    it('emits events', async () => {
      await expect(
        intentSource
          .connect(creator)
          .createIntent(
            chainId,
            await inbox.getAddress(),
            targets,
            data,
            rewardTokens,
            rewardAmounts,
            expiry,
            await prover.getAddress(),
          ),
      )
        .to.emit(intentSource, 'IntentCreated')
        .withArgs(
          intentHash,
          await creator.getAddress(),
          chainId,
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
          nonce,
        )
    })
  })
  describe('claiming rewards', async () => {
    beforeEach(async (): Promise<void> => {
      expiry = (await time.latest()) + minimumDuration + 10
      nonce = await encodeIdentifier(
        0,
        (await ethers.provider.getNetwork()).chainId,
      )
      chainId = 1
      targets = [await tokenA.getAddress()]
      data = [await encodeTransfer(creator.address, mintAmount)]
      rewardTokens = [await tokenA.getAddress(), await tokenB.getAddress()]
      rewardAmounts = [mintAmount, mintAmount * 2]
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const intermediateHash = keccak256(
        abiCoder.encode(
          ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
          [
            await intentSource.CHAIN_ID(),
            chainId,
            targets,
            data,
            expiry,
            nonce,
          ],
        ),
      )
      intentHash = keccak256(
        abiCoder.encode(
          ['address', 'bytes32'],
          [await inbox.getAddress(), intermediateHash],
        ),
      )

      await intentSource
        .connect(creator)
        .createIntent(
          chainId,
          await inbox.getAddress(),
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
          await prover.getAddress(),
        )
    })
    context('before expiry, no proof', () => {
      it('cant be withdrawn', async () => {
        await expect(
          intentSource.connect(otherPerson).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, `UnauthorizedWithdrawal`)
      })
    })
    context('before expiry, proof', () => {
      beforeEach(async (): Promise<void> => {
        await prover
          .connect(creator)
          .addProvenIntent(intentHash, await claimant.getAddress())
      })
      it('gets withdrawn to claimant', async () => {
        const initialBalanceA = await tokenA.balanceOf(
          await claimant.getAddress(),
        )
        const initialBalanceB = await tokenB.balanceOf(
          await claimant.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .false

        await intentSource.connect(otherPerson).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .true
        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceA) + rewardAmounts[0],
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceB) + rewardAmounts[1],
        )
      })
      it('emits event', async () => {
        await expect(
          intentSource.connect(otherPerson).withdrawRewards(intentHash),
        )
          .to.emit(intentSource, 'Withdrawal')
          .withArgs(intentHash, await claimant.getAddress())
      })
      it('does not allow repeat withdrawal', async () => {
        await intentSource.connect(otherPerson).withdrawRewards(intentHash)
        await expect(
          intentSource.connect(otherPerson).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, 'NothingToWithdraw')
      })
    })
    context('after expiry, no proof', () => {
      beforeEach(async (): Promise<void> => {
        await time.increaseTo(expiry)
      })
      it('gets withdrawn to creator', async () => {
        const initialBalanceA = await tokenA.balanceOf(
          await creator.getAddress(),
        )
        const initialBalanceB = await tokenB.balanceOf(
          await creator.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .false

        await intentSource.connect(otherPerson).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .true
        expect(await tokenA.balanceOf(await creator.getAddress())).to.eq(
          Number(initialBalanceA) + rewardAmounts[0],
        )
        expect(await tokenB.balanceOf(await creator.getAddress())).to.eq(
          Number(initialBalanceB) + rewardAmounts[1],
        )
      })
    })
    context('after expiry, proof', () => {
      beforeEach(async (): Promise<void> => {
        await prover
          .connect(creator)
          .addProvenIntent(intentHash, await claimant.getAddress())
        await time.increaseTo(expiry)
      })
      it('gets withdrawn to claimant', async () => {
        const initialBalanceA = await tokenA.balanceOf(
          await claimant.getAddress(),
        )
        const initialBalanceB = await tokenB.balanceOf(
          await claimant.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .false

        await intentSource.connect(otherPerson).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .true
        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceA) + rewardAmounts[0],
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceB) + rewardAmounts[1],
        )
      })
    })
  })
})
