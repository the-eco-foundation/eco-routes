import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { TestERC20, Inbox } from '../typechain-types'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { DataHexString } from 'ethers/lib.commonjs/utils/data'
import { encodeTransfer } from '../utils/encode'
import { keccak256 } from 'ethers'

describe('Inbox Test', (): void => {
  let inbox: Inbox
  let erc20: TestERC20
  let owner: SignerWithAddress
  let solver: SignerWithAddress
  let dstAddr: SignerWithAddress
  let intentHash: string
  let calldata: DataHexString
  let timeStamp: number
  const nonce = ethers.encodeBytes32String('0x987')
  let erc20Address: string
  const timeDelta = 1000
  const mintAmount = 1000
  const sourceChainID = 123

  async function deployInboxFixture(): Promise<{
    inbox: Inbox
    erc20: TestERC20
    owner: SignerWithAddress
    solver: SignerWithAddress
    dstAddr: SignerWithAddress
  }> {
    const [owner, solver, dstAddr] = await ethers.getSigners()
    const inboxFactory = await ethers.getContractFactory('Inbox')
    const inbox = await inboxFactory.deploy()

    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('TestERC20')
    const erc20 = await erc20Factory.deploy('eco', 'eco')
    await erc20.mint(owner.address, mintAmount)

    return {
      inbox,
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
    ;({ inbox, erc20, owner, solver, dstAddr } =
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

  describe('when the intent is invalid', () => {
    it('should revert if the timestamp is expired', async () => {
      timeStamp -= 2 * timeDelta
      await expect(
        inbox.fulfill(
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
      //   const asvfa = keccak256("you wouldn't block a chain")
      await expect(
        inbox.fulfill(
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
      ).deploy()
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
        inbox.fulfill(
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

  describe('when the intent is valid', () => {
    it('should revert if the call fails', async () => {
      await expect(
        inbox.fulfill(
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

    it('should succeed', async () => {
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
})
