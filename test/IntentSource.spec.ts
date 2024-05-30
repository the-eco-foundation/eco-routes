import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import hre from 'hardhat'
import { TestERC20, IntentSource, TestProver } from '../typechain-types'
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { keccak256, BytesLike } from 'ethers'
import { encodeIdentifier, encodeTransfer } from '../utils/encode'
const { ethers } = hre

describe('Intent Source Test', (): void => {
  let intentSource: IntentSource
  let tokenA: TestERC20
  let tokenB: TestERC20
  let creator: SignerWithAddress
  let solver: SignerWithAddress
  let prover: TestProver
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
    tokenA: TestERC20
    tokenB: TestERC20
    creator: SignerWithAddress
    solver: SignerWithAddress
  }> {
    const [creator, solver] = await ethers.getSigners()

    // deploy prover
    const proverFactory = await ethers.getContractFactory('TestProver')
    prover = await proverFactory.deploy()

    const intentSourceFactory = await ethers.getContractFactory('IntentSource')
    const intentSource = await intentSourceFactory.deploy(
      prover,
      minimumDuration,
    )

    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('TestERC20')
    const tokenA = await erc20Factory.deploy('A', 'A')
    const tokenB = await erc20Factory.deploy('B', 'B')

    return {
      intentSource,
      tokenA,
      tokenB,
      creator,
      solver,
    }
  }

  async function mintAndApprove() {
    await tokenA.connect(creator).mint(creator.address, mintAmount)
    await tokenB.connect(creator).mint(creator.address, mintAmount * 2)

    await tokenA.connect(creator).approve(intentSource, mintAmount)
    await tokenB.connect(creator).approve(intentSource, mintAmount * 2)
  }

  beforeEach(async (): Promise<void> => {
    ;({ intentSource, tokenA, tokenB, creator, solver } =
      await loadFixture(deploySourceFixture))

    // fund the creator and approve it to create an intent
    await mintAndApprove()
  })

  describe('constructor', () => {
    it('is initialized correctly', async () => {
      expect(await intentSource.CHAIN_ID()).to.eq(
        (await ethers.provider.getNetwork()).chainId,
      )
      expect(await intentSource.PROVER()).to.eq(await prover.getAddress())
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
      const encodedData = abiCoder.encode(
        ['bytes32', 'address[]', 'bytes[]', 'uint256'],
        [nonce, targets, data, expiry],
      )
      intentHash = keccak256(encodedData)
    })
    context('fails if', () => {
      it('targets or data length is 0, or if they are mismatched', async () => {
        // mismatch
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              [await tokenA.getAddress(), await tokenB.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration,
            ),
        ).to.be.revertedWithCustomError(intentSource, 'CalldataMismatch')
        // length 0
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              [],
              [],
              [await tokenA.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration,
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
              [await tokenA.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress(), await tokenB.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration,
            ),
        ).to.be.revertedWithCustomError(intentSource, 'RewardsMismatch')
        // length 0
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              [await tokenA.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [],
              [],
              (await time.latest()) + minimumDuration,
            ),
        ).to.be.revertedWithCustomError(intentSource, 'RewardsMismatch')
      })
      it('expiryTime is too early', async () => {
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              [await tokenA.getAddress()],
              [encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress()],
              [mintAmount],
              (await time.latest()) + minimumDuration - 1,
            ),
        ).to.be.revertedWithCustomError(intentSource, 'ExpiryTooSoon')
      })
    })
    it('creates properly', async () => {
      await intentSource
        .connect(creator)
        .createIntent(
          chainId,
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
        )
      const intent = await intentSource.intents(intentHash)
      // value types
      expect(intent.creator).to.eq(creator.address)
      expect(intent.destinationChain).to.eq(chainId)
      expect(intent.expiryTime).to.eq(expiry)
      expect(intent.hasBeenWithdrawn).to.eq(false)

      expect(intent.nonce).to.eq(nonce)
      // reference types
      expect(await intentSource.getTargets(intentHash)).to.deep.eq(targets)
      expect(await intentSource.getData(intentHash)).to.deep.eq(data)
      expect(await intentSource.getRewardTokens(intentHash)).to.deep.eq(
        rewardTokens,
      )
      expect(await intentSource.getRewardAmounts(intentHash)).to.deep.eq(
        rewardAmounts,
      )
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
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
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
            targets,
            data,
            rewardTokens,
            rewardAmounts,
            expiry,
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
      const encodedData = abiCoder.encode(
        ['bytes32', 'address[]', 'bytes[]', 'uint256'],
        [nonce, targets, data, expiry],
      )
      intentHash = keccak256(encodedData)

      await intentSource
        .connect(creator)
        .createIntent(
          chainId,
          targets,
          data,
          rewardTokens,
          rewardAmounts,
          expiry,
        )
    })
    context('before expiry, no proof', () => {
      it('cant be withdrawn by solver or creator (or anyone else)', async () => {
        await expect(
          intentSource.connect(creator).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, `UnauthorizedWithdrawal`)

        await expect(
          intentSource.connect(solver).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, `UnauthorizedWithdrawal`)
      })
    })
    context('before expiry, proof', () => {
      beforeEach(async (): Promise<void> => {
        await prover
          .connect(creator)
          .addProvenIntent(intentHash, await solver.getAddress())
      })
      it('cannot be withdrawn by non-solver', async () => {
        await expect(
          intentSource.connect(creator).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, `UnauthorizedWithdrawal`)
      })
      it('can be withdrawn by solver', async () => {
        const initialBalanceA = await tokenA.balanceOf(
          await solver.getAddress(),
        )
        const initialBalanceB = await tokenB.balanceOf(
          await solver.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .false

        await intentSource.connect(solver).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .true
        expect(await tokenA.balanceOf(await solver.getAddress())).to.eq(
          Number(initialBalanceA) + rewardAmounts[0],
        )
        expect(await tokenB.balanceOf(await solver.getAddress())).to.eq(
          Number(initialBalanceB) + rewardAmounts[1],
        )
      })
      it('emits event', async () => {
        await expect(intentSource.connect(solver).withdrawRewards(intentHash))
          .to.emit(intentSource, 'Withdrawal')
          .withArgs(intentHash, await solver.getAddress())
      })
      it('does not allow repeat withdrawal', async () => {
        await intentSource.connect(solver).withdrawRewards(intentHash)
        await expect(
          intentSource.connect(solver).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, 'NothingToWithdraw')
      })
    })
    context('after expiry, no proof', () => {
      beforeEach(async (): Promise<void> => {
        await time.increaseTo(expiry)
      })
      it('cannot be withdrawn by non-creator', async () => {
        await expect(
          intentSource.connect(solver).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, `UnauthorizedWithdrawal`)
      })
      it('can be withdrawn by creator', async () => {
        const initialBalanceA = await tokenA.balanceOf(
          await creator.getAddress(),
        )
        const initialBalanceB = await tokenB.balanceOf(
          await creator.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).hasBeenWithdrawn).to.be
          .false

        await intentSource.connect(creator).withdrawRewards(intentHash)

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
          .addProvenIntent(intentHash, await solver.getAddress())
        await time.increaseTo(expiry)
      })
      it('cannot be withdrawn by non-solver', async () => {
        await expect(
          intentSource.connect(creator).withdrawRewards(intentHash),
        ).to.be.revertedWithCustomError(intentSource, `UnauthorizedWithdrawal`)
      })
      it('can be withdrawn by solver', async () => {
        await expect(intentSource.connect(solver).withdrawRewards(intentHash))
          .to.not.be.reverted
      })
    })
  })
})
