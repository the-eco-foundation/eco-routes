import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { AbiCoder, getAddress, keccak256 } from 'ethers'
import { HyperProver, Inbox, TestERC20, TestMailbox } from '../typechain-types'
import { encodeTransfer } from '../utils/encode'

describe('HyperProver Test', (): void => {
  let inbox: Inbox
  let processor: TestMailbox
  let hyperProver: HyperProver
  let token: TestERC20
  let owner: SignerWithAddress
  let solver: SignerWithAddress
  let claimant: SignerWithAddress
  const amount: number = 1234567890
  const abicoder = ethers.AbiCoder.defaultAbiCoder()

  async function deployHyperproverFixture(): Promise<{
    inbox: Inbox
    processor: TestMailbox
    token: TestERC20
    owner: SignerWithAddress
    solver: SignerWithAddress
    claimant: SignerWithAddress
  }> {
    const [owner, solver, claimant] = await ethers.getSigners()
    const processor = await (
      await ethers.getContractFactory('TestMailbox')
    ).deploy(ethers.ZeroAddress)
    const dispatcher = await (
      await ethers.getContractFactory('TestMailbox')
    ).deploy(await processor.getAddress())

    const inbox = await (
      await ethers.getContractFactory('Inbox')
    ).deploy(owner.address, true, [], await dispatcher.getAddress())

    const token = await (
      await ethers.getContractFactory('TestERC20')
    ).deploy('token', 'tkn')

    return {
      inbox,
      processor,
      token,
      owner,
      solver,
      claimant,
    }
  }

  beforeEach(async (): Promise<void> => {
    ;({ inbox, processor, token, owner, solver, claimant } = await loadFixture(
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
      const msgBody = abicoder.encode(
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

  //   describe('e2e', async () => {
  //     it('works', async () => {
  //       hyperProver = await (
  //         await ethers.getContractFactory('HyperProver')
  //       ).deploy(await processor.getAddress(), await inbox.getAddress())
  //       const intentHash = ethers.sha256('0x')

  //       await token.mint(solver.address, amount)
  //       const sourceChainID = 12345
  //       const erc20Address = await token.getAddress()
  //       const calldata = await encodeTransfer(ethers.ZeroAddress, amount - 1000)
  //       const timestamp = (await time.latest()) + 1000
  //       const nonce = ethers.encodeBytes32String('0x987')
  //       const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  //       const intermediateHash = keccak256(
  //         abiCoder.encode(
  //           ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
  //           [
  //             12345,
  //             (await owner.provider.getNetwork()).chainId,
  //             [erc20Address],
  //             [calldata],
  //             timestamp,
  //             nonce,
  //           ],
  //         ),
  //       )
  //       const intentHash = keccak256(
  //         abiCoder.encode(
  //           ['address', 'bytes32'],
  //           [await inbox.getAddress(), intermediateHash],
  //         ),
  //       )
  //       fulfillData = [
  //         sourceChainID,
  //         [erc20Address],
  //         [calldata],
  //         timestamp,
  //         nonce,
  //         claimant,
  //         intentHash,
  //         await hyperProver.getAddress(),
  //       ]
  //     })
  //   })
})
