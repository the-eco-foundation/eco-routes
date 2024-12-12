import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { TestERC20, IntentSource, TestProver, Inbox } from '../typechain-types'
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { keccak256, BytesLike, ZeroAddress } from 'ethers'
import { DataHexString } from 'ethers/lib/utils'
import { encodeIdentifier, encodeTransfer } from '../utils/encode'

describe('Intent Source Test', (): void => {
  let intentSource: IntentSource
  let prover: TestProver
  let inbox: Inbox
  let tokenA: TestERC20
  let tokenB: TestERC20
  let creator: SignerWithAddress
  let claimant: SignerWithAddress
  let otherPerson: SignerWithAddress
  const mintAmount: number = 1000

  let expiry: number
  let intentHash: BytesLike
  let chainId: number
  let targets: string[]
  let data: BytesLike[]
  let rewardTokens: string[]
  let rewardAmounts: number[]
  const rewardNativeEth: bigint = ethers.parseEther('2')
  let nonce: BytesLike
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()

  async function deploySourceFixture(): Promise<{
    intentSource: IntentSource
    prover: TestProver
    tokenA: TestERC20
    tokenB: TestERC20
    creator: SignerWithAddress
    claimant: SignerWithAddress
    otherPerson: SignerWithAddress
  }> {
    const [creator, owner, claimant, otherPerson] = await ethers.getSigners()
    // deploy prover
    prover = await (await ethers.getContractFactory('TestProver')).deploy()

    const intentSourceFactory = await ethers.getContractFactory('IntentSource')
    const intentSource = await intentSourceFactory.deploy(0)
    inbox = await (
      await ethers.getContractFactory('Inbox')
    ).deploy(owner.address, false, [owner.address])

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
    ;({ intentSource, prover, tokenA, tokenB, creator, claimant, otherPerson } =
      await loadFixture(deploySourceFixture))

    // fund the creator and approve it to create an intent
    await mintAndApprove()
  })

  describe('constructor', () => {
    it('is initialized correctly', async () => {
      expect(await intentSource.counter()).to.eq(0)
    })
  })
  describe('intent creation', async () => {
    beforeEach(async (): Promise<void> => {
      expiry = (await time.latest()) + 123
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
            (await intentSource.runner?.provider?.getNetwork())?.chainId,
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
              [await encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress()],
              [mintAmount],
              await time.latest(),
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
              await time.latest(),
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'CalldataMismatch')
      })
      it('rewardTokens and rewardAmounts are mismatched', async () => {
        // mismatch
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              await inbox.getAddress(),
              [await tokenA.getAddress()],
              [await encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress(), await tokenB.getAddress()],
              [mintAmount],
              await time.latest(),
              await prover.getAddress(),
            ),
        ).to.be.revertedWithCustomError(intentSource, 'RewardsMismatch')
      })
    })
    it('creates properly with erc20 rewards', async () => {
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
      expect(intent.isActive).to.eq(true)
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
      expect(intentDetail.isActive).to.eq(true)
      expect(intentDetail.nonce).to.eq(nonce)
      expect(intentDetail.prover).to.eq(await prover.getAddress())
      expect(intentDetail.rewardNative).to.eq(0)
    })
    it('creates properly with native token rewards', async () => {
      await intentSource
        .connect(creator)
        .createIntent(
          chainId,
          await inbox.getAddress(),
          targets,
          data,
          [],
          [],
          expiry,
          await prover.getAddress(),
          { value: rewardNativeEth },
        )
      const intent = await intentSource.intents(intentHash)
      // value types
      expect(intent.creator).to.eq(creator.address)
      expect(intent.destinationChainID).to.eq(chainId)
      expect(intent.expiryTime).to.eq(expiry)
      expect(intent.isActive).to.eq(true)
      expect(intent.nonce).to.eq(nonce)
      // getIntent complete call
      const intentDetail = await intentSource.getIntent(intentHash)
      expect(intentDetail.creator).to.eq(creator.address)
      expect(intentDetail.destinationChainID).to.eq(chainId)
      expect(intentDetail.targets).to.deep.eq(targets)
      expect(intentDetail.data).to.deep.eq(data)
      expect(intentDetail.rewardTokens).to.deep.eq([])
      expect(intentDetail.rewardAmounts).to.deep.eq([])
      expect(intentDetail.expiryTime).to.eq(expiry)
      expect(intentDetail.isActive).to.eq(true)
      expect(intentDetail.nonce).to.eq(nonce)
      expect(intentDetail.prover).to.eq(await prover.getAddress())
      expect(intentDetail.rewardNative).to.eq(rewardNativeEth)
    })
    it('increments counter and locks up tokens', async () => {
      const counter = await intentSource.counter()
      const initialBalanceA = await tokenA.balanceOf(
        await intentSource.getAddress(),
      )
      const initialBalanceB = await tokenA.balanceOf(
        await intentSource.getAddress(),
      )
      const initialBalanceNative = await ethers.provider.getBalance(
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
          { value: rewardNativeEth },
        )
      expect(await intentSource.counter()).to.eq(Number(counter) + 1)
      expect(await tokenA.balanceOf(await intentSource.getAddress())).to.eq(
        Number(initialBalanceA) + rewardAmounts[0],
      )
      expect(await tokenB.balanceOf(await intentSource.getAddress())).to.eq(
        Number(initialBalanceB) + rewardAmounts[1],
      )
      expect(
        await ethers.provider.getBalance(await intentSource.getAddress()),
      ).to.eq(initialBalanceNative + rewardNativeEth)
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
            { value: rewardNativeEth },
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
          await prover.getAddress(),
          rewardNativeEth,
        )
    })
  })
  describe('claiming rewards', async () => {
    beforeEach(async (): Promise<void> => {
      expiry = (await time.latest()) + 123
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
            (await intentSource.runner?.provider?.getNetwork())?.chainId,
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
          { value: rewardNativeEth },
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

        const initialBalanceNative = await ethers.provider.getBalance(
          await claimant.getAddress(),
        )

        expect((await intentSource.intents(intentHash)).isActive).to.be.true

        await intentSource.connect(otherPerson).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).isActive).to.be.false
        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceA) + rewardAmounts[0],
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceB) + rewardAmounts[1],
        )
        expect(
          await ethers.provider.getBalance(await claimant.getAddress()),
        ).to.eq(initialBalanceNative + rewardNativeEth)
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
        expect((await intentSource.intents(intentHash)).isActive).to.be.true

        await intentSource.connect(otherPerson).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).isActive).to.be.false
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
        expect((await intentSource.intents(intentHash)).isActive).to.be.true

        await intentSource.connect(otherPerson).withdrawRewards(intentHash)

        expect((await intentSource.intents(intentHash)).isActive).to.be.false
        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceA) + rewardAmounts[0],
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          Number(initialBalanceB) + rewardAmounts[1],
        )
      })
    })
  })
  describe('batch withdrawal', async () => {
    describe('fails if', () => {
      beforeEach(async (): Promise<void> => {
        expiry = (await time.latest()) + 123
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
            [
              'uint256',
              'uint256',
              'address[]',
              'bytes[]',
              'uint256',
              'bytes32',
            ],
            [
              (await intentSource.runner?.provider?.getNetwork())?.chainId,
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
            { value: rewardNativeEth },
          )
      })
      it('bricks if called with the zero address as the claimant param', async () => {
        await expect(
          intentSource
            .connect(otherPerson)
            .batchWithdraw([intentHash], ZeroAddress),
        ).to.be.revertedWithCustomError(intentSource, 'BadClaimant')
      })
      it('bricks if called with an intent whose claimant differs from the claimant param', async () => {
        await expect(
          intentSource
            .connect(otherPerson)
            .batchWithdraw([intentHash], await claimant.getAddress()),
        ).to.be.revertedWithCustomError(intentSource, 'BadClaimant')
      })
      it('bricks if called before expiry by IntentCreator', async () => {
        await expect(
          intentSource
            .connect(otherPerson)
            .batchWithdraw([intentHash], await creator.getAddress()),
        ).to.be.revertedWithCustomError(intentSource, 'UnauthorizedWithdrawal')
      })
    })
    describe('single intent, complex', () => {
      beforeEach(async (): Promise<void> => {
        expiry = (await time.latest()) + 123
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
            [
              'uint256',
              'uint256',
              'address[]',
              'bytes[]',
              'uint256',
              'bytes32',
            ],
            [
              (await intentSource.runner?.provider?.getNetwork())?.chainId,
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
            { value: rewardNativeEth },
          )
      })
      it('before expiry to claimant', async () => {
        const initialBalanceNative = await ethers.provider.getBalance(
          await claimant.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).isActive).to.be.true
        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(0)
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(0)
        expect(await tokenA.balanceOf(await intentSource.getAddress())).to.eq(
          mintAmount,
        )
        expect(await tokenB.balanceOf(await intentSource.getAddress())).to.eq(
          mintAmount * 2,
        )
        expect(
          await ethers.provider.getBalance(await intentSource.getAddress()),
        ).to.eq(rewardNativeEth)

        await prover
          .connect(creator)
          .addProvenIntent(intentHash, await claimant.getAddress())
        await intentSource
          .connect(otherPerson)
          .batchWithdraw([intentHash], await claimant.getAddress())

        expect((await intentSource.intents(intentHash)).isActive).to.be.false
        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          mintAmount,
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          mintAmount * 2,
        )
        expect(await tokenA.balanceOf(await intentSource.getAddress())).to.eq(0)
        expect(await tokenB.balanceOf(await intentSource.getAddress())).to.eq(0)

        expect(
          await ethers.provider.getBalance(await intentSource.getAddress()),
        ).to.eq(0)

        expect(
          await ethers.provider.getBalance(await claimant.getAddress()),
        ).to.eq(initialBalanceNative + rewardNativeEth)
      })
      it('after expiry to creator', async () => {
        await time.increaseTo(expiry)
        const initialBalanceNative = await ethers.provider.getBalance(
          await creator.getAddress(),
        )
        expect((await intentSource.intents(intentHash)).isActive).to.be.true
        expect(await tokenA.balanceOf(await creator.getAddress())).to.eq(0)
        expect(await tokenB.balanceOf(await creator.getAddress())).to.eq(0)

        await prover
          .connect(otherPerson)
          .addProvenIntent(intentHash, await creator.getAddress())
        await intentSource
          .connect(otherPerson)
          .batchWithdraw([intentHash], await creator.getAddress())

        expect((await intentSource.intents(intentHash)).isActive).to.be.false
        expect(await tokenA.balanceOf(await creator.getAddress())).to.eq(
          mintAmount,
        )
        expect(await tokenB.balanceOf(await creator.getAddress())).to.eq(
          mintAmount * 2,
        )
        expect(
          await ethers.provider.getBalance(await creator.getAddress()),
        ).to.eq(initialBalanceNative + rewardNativeEth)
      })
    })
    describe('multiple intents, each with a single reward token', () => {
      beforeEach(async (): Promise<void> => {
        expiry = (await time.latest()) + 123
        nonce = await encodeIdentifier(
          0,
          (await ethers.provider.getNetwork()).chainId,
        )
        chainId = 1
        targets = [await tokenA.getAddress()]
        data = [await encodeTransfer(creator.address, mintAmount)]
      })
      it('same token', async () => {
        let tx
        for (let i = 0; i < 3; i++) {
          tx = await intentSource
            .connect(creator)
            .createIntent(
              chainId,
              await inbox.getAddress(),
              targets,
              data,
              [await tokenA.getAddress()],
              [mintAmount / 10],
              expiry,
              await prover.getAddress(),
            )
          tx = await tx.wait()
        }
        const logs = await intentSource.queryFilter(
          intentSource.getEvent('IntentCreated'),
        )
        const hashes = logs.map((log) => log.args._hash)

        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(0)

        for (let i = 0; i < 3; i++) {
          await prover
            .connect(creator)
            .addProvenIntent(hashes[i], await claimant.getAddress())
        }
        await intentSource
          .connect(otherPerson)
          .batchWithdraw(hashes, await claimant.getAddress())

        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          (mintAmount / 10) * 3,
        )
      })
      it('multiple tokens', async () => {
        let tx
        for (let i = 0; i < 3; i++) {
          tx = await intentSource
            .connect(creator)
            .createIntent(
              chainId,
              await inbox.getAddress(),
              targets,
              data,
              [await tokenA.getAddress()],
              [mintAmount / 10],
              expiry,
              await prover.getAddress(),
            )
          tx = await tx.wait()
        }
        for (let i = 0; i < 3; i++) {
          tx = await intentSource
            .connect(creator)
            .createIntent(
              chainId,
              await inbox.getAddress(),
              targets,
              data,
              [await tokenB.getAddress()],
              [(mintAmount * 2) / 10],
              expiry,
              await prover.getAddress(),
            )
          tx = await tx.wait()
        }
        const logs = await intentSource.queryFilter(
          intentSource.getEvent('IntentCreated'),
        )
        const hashes = logs.map((log) => log.args._hash)

        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(0)
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(0)

        for (let i = 0; i < 6; i++) {
          await prover
            .connect(creator)
            .addProvenIntent(hashes[i], await claimant.getAddress())
        }
        await intentSource
          .connect(otherPerson)
          .batchWithdraw(hashes, await claimant.getAddress())

        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          (mintAmount / 10) * 3,
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          ((mintAmount * 2) / 10) * 3,
        )
      })
      it('multiple tokens plus native', async () => {
        let tx
        for (let i = 0; i < 3; i++) {
          tx = await intentSource
            .connect(creator)
            .createIntent(
              chainId,
              await inbox.getAddress(),
              targets,
              data,
              [await tokenA.getAddress()],
              [mintAmount / 10],
              expiry,
              await prover.getAddress(),
            )
          tx = await tx.wait()
        }
        for (let i = 0; i < 3; i++) {
          tx = await intentSource
            .connect(creator)
            .createIntent(
              chainId,
              await inbox.getAddress(),
              targets,
              data,
              [await tokenB.getAddress()],
              [(mintAmount * 2) / 10],
              expiry,
              await prover.getAddress(),
            )
          tx = await tx.wait()
        }
        for (let i = 0; i < 3; i++) {
          tx = await intentSource
            .connect(creator)
            .createIntent(
              chainId,
              await inbox.getAddress(),
              targets,
              data,
              [],
              [],
              expiry,
              await prover.getAddress(),
              { value: rewardNativeEth },
            )
          tx = await tx.wait()
        }
        const logs = await intentSource.queryFilter(
          intentSource.getEvent('IntentCreated'),
        )
        const hashes = logs.map((log) => log.args._hash)

        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(0)
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(0)

        const initialBalanceNative = await ethers.provider.getBalance(
          await claimant.getAddress(),
        )

        for (let i = 0; i < 9; i++) {
          await prover
            .connect(creator)
            .addProvenIntent(hashes[i], await claimant.getAddress())
        }
        await intentSource
          .connect(otherPerson)
          .batchWithdraw(hashes, await claimant.getAddress())

        expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
          (mintAmount / 10) * 3,
        )
        expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
          ((mintAmount * 2) / 10) * 3,
        )
        expect(
          await ethers.provider.getBalance(await claimant.getAddress()),
        ).to.eq(initialBalanceNative + BigInt(3) * rewardNativeEth)
      })
    })
    it('works in the case of multiple intents, each with multiple reward tokens', async () => {
      expiry = (await time.latest()) + 123
      nonce = await encodeIdentifier(
        0,
        (await ethers.provider.getNetwork()).chainId,
      )
      chainId = 1
      targets = [await tokenA.getAddress()]
      data = [await encodeTransfer(creator.address, mintAmount)]
      let tx
      for (let i = 0; i < 5; i++) {
        tx = await intentSource
          .connect(creator)
          .createIntent(
            chainId,
            await inbox.getAddress(),
            targets,
            data,
            [await tokenA.getAddress()],
            [mintAmount / 10],
            expiry,
            await prover.getAddress(),
          )
        tx = await tx.wait()
      }
      for (let i = 0; i < 5; i++) {
        tx = await intentSource
          .connect(creator)
          .createIntent(
            chainId,
            await inbox.getAddress(),
            targets,
            data,
            [await tokenB.getAddress(), await tokenA.getAddress()],
            [(mintAmount * 2) / 10, mintAmount / 10],
            expiry,
            await prover.getAddress(),
            { value: rewardNativeEth },
          )
        tx = await tx.wait()
      }
      const logs = await intentSource.queryFilter(
        intentSource.getEvent('IntentCreated'),
      )
      const hashes = logs.map((log) => log.args._hash)

      expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(0)
      expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(0)

      const initialBalanceNative = await ethers.provider.getBalance(
        await claimant.getAddress(),
      )

      for (let i = 0; i < 10; i++) {
        await prover
          .connect(creator)
          .addProvenIntent(hashes[i], await claimant.getAddress())
      }
      await intentSource
        .connect(otherPerson)
        .batchWithdraw(hashes, await claimant.getAddress())

      expect(await tokenA.balanceOf(await claimant.getAddress())).to.eq(
        mintAmount,
      )
      expect(await tokenB.balanceOf(await claimant.getAddress())).to.eq(
        mintAmount,
      )
      expect(
        await ethers.provider.getBalance(await claimant.getAddress()),
      ).to.eq(initialBalanceNative + BigInt(5) * rewardNativeEth)
    })
  })
})
