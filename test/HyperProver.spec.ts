import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { HyperProver, Inbox, TestERC20, TestMailbox } from '../typechain-types'
import { encodeTransfer } from '../utils/encode'

describe('HyperProver Test', (): void => {
  let inbox: Inbox
  let dispatcher: TestMailbox
  let hyperProver: HyperProver
  let token: TestERC20
  let owner: SignerWithAddress
  let solver: SignerWithAddress
  let claimant: SignerWithAddress
  const amount: number = 1234567890
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()

  async function deployHyperproverFixture(): Promise<{
    inbox: Inbox
    token: TestERC20
    owner: SignerWithAddress
    solver: SignerWithAddress
    claimant: SignerWithAddress
  }> {
    const [owner, solver, claimant] = await ethers.getSigners()
    dispatcher = await (
      await ethers.getContractFactory('TestMailbox')
    ).deploy(await owner.getAddress())

    const inbox = await (
      await ethers.getContractFactory('Inbox')
    ).deploy(owner.address, true, [], await dispatcher.getAddress())

    const token = await (
      await ethers.getContractFactory('TestERC20')
    ).deploy('token', 'tkn')

    return {
      inbox,
      token,
      owner,
      solver,
      claimant,
    }
  }

  beforeEach(async (): Promise<void> => {
    ;({ inbox, token, owner, solver, claimant } = await loadFixture(
      deployHyperproverFixture,
    ))
  })
  describe('invalid', async () => {
    beforeEach(async () => {
      hyperProver = await (
        await ethers.getContractFactory('HyperProver')
      ).deploy(await owner.getAddress(), await inbox.getAddress())
    })
    it('should revert when msg.sender is not the mailbox', async () => {
      await expect(
        hyperProver
          .connect(solver)
          .handle(12345, ethers.sha256('0x'), ethers.sha256('0x')),
      ).to.be.revertedWithCustomError(hyperProver, 'UnauthorizedHandle')
    })
    it('should revert when sender field is not the inbox', async () => {
      await expect(
        hyperProver
          .connect(owner)
          .handle(12345, ethers.sha256('0x'), ethers.sha256('0x')),
      ).to.be.revertedWithCustomError(hyperProver, 'UnauthorizedDispatch')
    })
  })

  describe('valid', async () => {
    it('should handle the message if it comes from the correct inbox and mailbox', async () => {
      hyperProver = await (
        await ethers.getContractFactory('HyperProver')
      ).deploy(await owner.getAddress(), await inbox.getAddress())
      const intentHash = ethers.sha256('0x')
      const claimantAddress = await claimant.getAddress()
      const msgBody = abiCoder.encode(
        ['bytes32', 'address'],
        [intentHash, claimantAddress],
      )
      expect(await hyperProver.provenIntents(intentHash)).to.eq(
        ethers.ZeroAddress,
      )
      await expect(
        hyperProver
          .connect(owner)
          .handle(
            12345,
            ethers.zeroPadValue(await inbox.getAddress(), 32),
            msgBody,
          ),
      )
        .to.emit(hyperProver, 'IntentProven')
        .withArgs(intentHash, claimantAddress)
      expect(await hyperProver.provenIntents(intentHash)).to.eq(claimantAddress)
    })
  })

  describe('e2e', async () => {
    it('works', async () => {
      hyperProver = await (
        await ethers.getContractFactory('HyperProver')
      ).deploy(await dispatcher.getAddress(), await inbox.getAddress())
      await token.mint(solver.address, amount)
      const sourceChainID = 12345
      const calldata = await encodeTransfer(await claimant.getAddress(), amount)
      const timeStamp = (await time.latest()) + 1000
      const nonce = ethers.encodeBytes32String('0x987')
      const intermediateHash = ethers.keccak256(
        abiCoder.encode(
          ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
          [
            sourceChainID,
            (await owner.provider.getNetwork()).chainId,
            [await token.getAddress()],
            [calldata],
            timeStamp,
            nonce,
          ],
        ),
      )
      const intentHash = ethers.keccak256(
        abiCoder.encode(
          ['address', 'bytes32'],
          [await inbox.getAddress(), intermediateHash],
        ),
      )
      const fulfillData = [
        sourceChainID,
        [await token.getAddress()],
        [calldata],
        timeStamp,
        nonce,
        await claimant.getAddress(),
        intentHash,
        await hyperProver.getAddress(),
      ]
      await token.connect(solver).transfer(await inbox.getAddress(), amount)

      expect(await hyperProver.provenIntents(intentHash)).to.eq(
        ethers.ZeroAddress,
      )

      await expect(
        dispatcher.dispatch(
          12345,
          ethers.zeroPadValue(await hyperProver.getAddress(), 32),
          calldata,
        ),
      ).to.be.revertedWithCustomError(hyperProver, 'UnauthorizedDispatch')

      await expect(inbox.connect(solver).fulfillHyperInstant(...fulfillData))
        .to.emit(hyperProver, `IntentProven`)
        .withArgs(intentHash, await claimant.getAddress())
      expect(await hyperProver.provenIntents(intentHash)).to.eq(
        await claimant.getAddress(),
      )
    })
  })
})
