import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { TestERC20, Inbox, TestMailbox, TestProver } from '../typechain-types'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { DataHexString } from 'ethers/lib.commonjs/utils/data'
import { encodeTransfer } from '../utils/encode'
import { keccak256 } from 'ethers'

describe('Inbox Test', (): void => {
  let inbox: Inbox
  let mailbox: TestMailbox
  let erc20: TestERC20
  let owner: SignerWithAddress
  let solver: SignerWithAddress
  let dstAddr: SignerWithAddress
  let intentHash: string
  let calldata: DataHexString
  let timeStamp: number
  let dummyHyperProver: TestProver
  const nonce = ethers.encodeBytes32String('0x987')
  let erc20Address: string
  const timeDelta = 1000
  const mintAmount = 1000
  const sourceChainID = 123

  async function deployInboxFixture(): Promise<{
    inbox: Inbox
    mailbox: TestMailbox
    erc20: TestERC20
    owner: SignerWithAddress
    solver: SignerWithAddress
    dstAddr: SignerWithAddress
  }> {
    const mailbox = await (
      await ethers.getContractFactory('TestMailbox')
    ).deploy(ethers.ZeroAddress)
    const [owner, solver, dstAddr] = await ethers.getSigners()
    const inboxFactory = await ethers.getContractFactory('Inbox')
    const inbox = await inboxFactory.deploy(
      owner.address,
      false,
      [solver.address],
      await mailbox.getAddress(),
    )

    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('TestERC20')
    const erc20 = await erc20Factory.deploy('eco', 'eco')
    await erc20.mint(owner.address, mintAmount)

    return {
      inbox,
      mailbox,
      erc20,
      owner,
      solver,
      dstAddr,
    }
  }

  async function setBalances() {
    await erc20.connect(owner).transfer(await solver.getAddress(), mintAmount)
  }

  beforeEach(async (): Promise<void> => {
    ;({ inbox, mailbox, erc20, owner, solver, dstAddr } =
      await loadFixture(deployInboxFixture))

    // fund the solver
    await setBalances()
    erc20Address = await erc20.getAddress()
    calldata = await encodeTransfer(dstAddr.address, mintAmount)
    timeStamp = (await time.latest()) + timeDelta
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    const intermediateHash = keccak256(
      abiCoder.encode(
        ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
        [
          sourceChainID,
          (await owner.provider.getNetwork()).chainId,
          [erc20Address],
          [calldata],
          timeStamp,
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
  it('initializes correctly', async () => {
    expect(await inbox.owner()).to.eq(owner.address)
    expect(await inbox.isSolvingPublic()).to.be.false
    expect(await inbox.solverWhitelist(solver)).to.be.true
    expect(await inbox.solverWhitelist(owner)).to.be.false
  })

  describe('setters', async () => {
    it('doesnt let non-owner call set functions', async () => {
      await expect(
        inbox.connect(solver).makeSolvingPublic(),
      ).to.be.revertedWithCustomError(inbox, 'OwnableUnauthorizedAccount')
      await expect(
        inbox.connect(solver).changeSolverWhitelist(owner.address, true),
      ).to.be.revertedWithCustomError(inbox, 'OwnableUnauthorizedAccount')
    })
    it('lets owner make solving public', async () => {
      expect(await inbox.isSolvingPublic()).to.be.false
      await inbox.connect(owner).makeSolvingPublic()
      expect(await inbox.isSolvingPublic()).to.be.true
    })
    it('lets owner change the solver whitelist', async () => {
      expect(await inbox.solverWhitelist(solver)).to.be.true
      expect(await inbox.solverWhitelist(owner)).to.be.false
      await inbox.connect(owner).changeSolverWhitelist(solver.address, false)
      await inbox.connect(owner).changeSolverWhitelist(owner.address, true)
      expect(await inbox.solverWhitelist(solver)).to.be.false
      expect(await inbox.solverWhitelist(owner)).to.be.true
    })
  })

  describe('fulfill when the intent is invalid', () => {
    it('should revert if solved by someone who isnt whitelisted when solving isnt public', async () => {
      expect(await inbox.isSolvingPublic()).to.be.false
      expect(await inbox.solverWhitelist(owner.address)).to.be.false
      await expect(
        inbox
          .connect(owner)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeDelta,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'UnauthorizedSolveAttempt')
    })
    it('should revert if the timestamp is expired', async () => {
      timeStamp -= 2 * timeDelta
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'IntentExpired')
    })

    it('should revert if the generated hash does not match the expected hash', async () => {
      const goofyHash = keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string'],
          ["you wouldn't block a chain"],
        ),
      )
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            goofyHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'InvalidHash')
    })
    it('should revert via InvalidHash if all intent data was input correctly, but the intent used a different inbox on creation', async () => {
      const anotherInbox = await (
        await ethers.getContractFactory('Inbox')
      ).deploy(
        owner.address,
        false,
        [owner.address],
        await mailbox.getAddress(),
      )
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const intermediateHash = keccak256(
        abiCoder.encode(
          ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
          [
            sourceChainID,
            (await owner.provider.getNetwork()).chainId,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
          ],
        ),
      )
      const sameIntentDifferentInboxHash = keccak256(
        abiCoder.encode(
          ['address', 'bytes32'],
          [await anotherInbox.getAddress(), intermediateHash],
        ),
      )

      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            sameIntentDifferentInboxHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'InvalidHash')
    })
  })

  describe('fulfill when the intent is valid', () => {
    it('should revert if the call fails', async () => {
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'IntentCallFailed')
    })
    it('should revert if one of the targets is the mailbox', async () => {
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const intermediateHash = keccak256(
        abiCoder.encode(
          ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
          [
            sourceChainID,
            (await owner.provider.getNetwork()).chainId,
            [await mailbox.getAddress()],
            [calldata],
            timeStamp,
            nonce,
          ],
        ),
      )
      const newHash = keccak256(
        abiCoder.encode(
          ['address', 'bytes32'],
          [await inbox.getAddress(), intermediateHash],
        ),
      )
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [await mailbox.getAddress()],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            newHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'CallToMailbox')
    })
    it('should not revert when called by a whitelisted solver', async () => {
      expect(await inbox.solverWhitelist(solver)).to.be.true

      await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)

      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      ).to.not.be.reverted
    })
    it('should not revert when called by a non-whitelisted solver when solving is public', async () => {
      expect(await inbox.solverWhitelist(owner)).to.be.false
      await inbox.connect(owner).makeSolvingPublic()
      expect(await inbox.isSolvingPublic()).to.be.true

      await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)

      await expect(
        inbox
          .connect(owner)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      ).to.not.be.reverted
    })

    it('should succeed with non-hyper proving', async () => {
      expect(await inbox.fulfilled(intentHash)).to.equal(ethers.ZeroAddress)
      expect(await erc20.balanceOf(solver.address)).to.equal(mintAmount)
      expect(await erc20.balanceOf(dstAddr.address)).to.equal(0)

      // transfer the tokens to the inbox so it can process the transaction
      await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)

      // should emit an event
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      )
        .to.emit(inbox, 'Fulfillment')
        .withArgs(intentHash, sourceChainID, dstAddr.address)
      // should update the fulfilled hash
      expect(await inbox.fulfilled(intentHash)).to.equal(dstAddr.address)

      // check balances
      expect(await erc20.balanceOf(solver.address)).to.equal(0)
      expect(await erc20.balanceOf(dstAddr.address)).to.equal(mintAmount)
    })

    it('should revert if the intent has already been fulfilled', async () => {
      // transfer the tokens to the inbox so it can process the transaction
      await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)

      // should emit an event
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      )
        .to.emit(inbox, 'Fulfillment')
        .withArgs(intentHash, sourceChainID, dstAddr.address)
      // should revert
      await expect(
        inbox
          .connect(solver)
          .fulfill(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      ).to.be.revertedWithCustomError(inbox, 'IntentAlreadyFulfilled')
    })
  })
  describe('hyper proving', () => {
    beforeEach(async () => {
      dummyHyperProver = await (
        await ethers.getContractFactory('TestProver')
      ).deploy()

      expect(await mailbox.dispatched()).to.be.false

      await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)
    })
    it('fulfill hyper instant', async () => {
      await expect(
        inbox
          .connect(solver)
          .fulfillHyperInstant(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
            await dummyHyperProver.getAddress(),
          ),
      )
        .to.emit(inbox, 'HyperInstantFulfillment')
        .withArgs(intentHash, sourceChainID, dstAddr.address)

      expect(await mailbox.destinationDomain()).to.eq(sourceChainID)
      expect(await mailbox.recipientAddress()).to.eq(
        ethers.zeroPadValue(await dummyHyperProver.getAddress(), 32),
      )
      expect(await mailbox.messageBody()).to.eq(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32[]', 'address[]'],
          [[intentHash], [dstAddr.address]],
        ),
      )
      expect(await mailbox.dispatched()).to.be.true
    })
    it('fulfill hyper batch', async () => {
      await expect(
        inbox
          .connect(solver)
          .fulfillHyperBatched(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
            await dummyHyperProver.getAddress(),
          ),
      )
        .to.emit(inbox, 'AddToBatch')
        .withArgs(
          intentHash,
          sourceChainID,
          dstAddr.address,
          await dummyHyperProver.getAddress(),
        )

      expect(await mailbox.dispatched()).to.be.false
    })
  })
})
