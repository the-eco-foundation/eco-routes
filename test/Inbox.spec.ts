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
import { keccak256, toBeHex } from 'ethers'

describe('Inbox Test', (): void => {
  let inbox: Inbox
  let mailbox: TestMailbox
  let erc20: TestERC20
  let owner: SignerWithAddress
  let solver: SignerWithAddress
  let dstAddr: SignerWithAddress
  let intentHash: string
  let otherHash: string
  let calldata: DataHexString
  let otherCallData: DataHexString
  let timeStamp: number
  let otherTimeStamp: number
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
    const inbox = await inboxFactory.deploy(owner.address, false, [
      solver.address,
    ])
    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('TestERC20')
    const erc20 = await erc20Factory.deploy('eco', 'eco')
    await erc20.mint(solver.address, mintAmount)

    return {
      inbox,
      mailbox,
      erc20,
      owner,
      solver,
      dstAddr,
    }
  }

  async function createIntentData(
    amount: number,
    timeDelta: number,
  ): Promise<{
    intentHash: string
    calldata: DataHexString
    timeStamp: number
  }> {
    erc20Address = await erc20.getAddress()
    const _calldata = await encodeTransfer(dstAddr.address, amount)
    const _timestamp = (await time.latest()) + timeDelta
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    const intermediateHash = keccak256(
      abiCoder.encode(
        ['uint256', 'uint256', 'address[]', 'bytes[]', 'uint256', 'bytes32'],
        [
          sourceChainID,
          (await owner.provider.getNetwork()).chainId,
          [erc20Address],
          [_calldata],
          _timestamp,
          nonce,
        ],
      ),
    )
    const _intentHash = keccak256(
      abiCoder.encode(
        ['address', 'bytes32'],
        [await inbox.getAddress(), intermediateHash],
      ),
    )
    return {
      intentHash: _intentHash,
      calldata: _calldata,
      timeStamp: _timestamp,
    }
  }

  beforeEach(async (): Promise<void> => {
    ;({ inbox, mailbox, erc20, owner, solver, dstAddr } =
      await loadFixture(deployInboxFixture))
    ;({ intentHash, calldata, timeStamp } = await createIntentData(
      mintAmount,
      timeDelta,
    ))
  })
  it('initializes correctly', async () => {
    expect(await inbox.owner()).to.eq(owner.address)
    expect(await inbox.isSolvingPublic()).to.be.false
    expect(await inbox.solverWhitelist(solver)).to.be.true
    expect(await inbox.solverWhitelist(owner)).to.be.false
  })

  describe('onlyOwner', async () => {
    it('doesnt let non-owner call onlyOwner functions', async () => {
      await expect(
        inbox.connect(solver).makeSolvingPublic(),
      ).to.be.revertedWithCustomError(inbox, 'OwnableUnauthorizedAccount')
      await expect(
        inbox.connect(solver).changeSolverWhitelist(owner.address, true),
      ).to.be.revertedWithCustomError(inbox, 'OwnableUnauthorizedAccount')
      await expect(
        inbox.connect(solver).setMailbox(await mailbox.getAddress()),
      ).to.be.revertedWithCustomError(inbox, 'OwnableUnauthorizedAccount')
      await expect(
        inbox.connect(solver).drain(solver.address),
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

    it('lets owner set mailbox, but only when it is the zero addreses', async () => {
      expect(await inbox.mailbox()).to.eq(ethers.ZeroAddress)
      await inbox.connect(owner).setMailbox(await mailbox.getAddress())
      expect(await inbox.mailbox()).to.eq(await mailbox.getAddress())
      await inbox.connect(owner).setMailbox(solver.address)
      expect(await inbox.mailbox()).to.eq(await mailbox.getAddress())
    })
  })

  describe('fulfill when the intent is invalid', () => {
    it('should revert if solved by someone who isnt whitelisted when solving isnt public', async () => {
      expect(await inbox.isSolvingPublic()).to.be.false
      expect(await inbox.solverWhitelist(owner.address)).to.be.false
      await expect(
        inbox
          .connect(owner)
          .fulfillStorage(
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
          .fulfillStorage(
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
          .fulfillStorage(
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
      ).deploy(owner.address, false, [owner.address])
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
          .fulfillStorage(
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
          .fulfillStorage(
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
      await inbox.connect(owner).setMailbox(await mailbox.getAddress())
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
          .fulfillStorage(
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
          .fulfillStorage(
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
          .fulfillStorage(
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
          .fulfillStorage(
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
        .to.emit(inbox, 'ToBeProven')
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
          .fulfillStorage(
            sourceChainID,
            [erc20Address],
            [calldata],
            timeStamp,
            nonce,
            dstAddr.address,
            intentHash,
          ),
      )
        .to.emit(inbox, 'ToBeProven')
        .withArgs(intentHash, sourceChainID, dstAddr.address)
      // should revert
      await expect(
        inbox
          .connect(solver)
          .fulfillStorage(
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
      await inbox.connect(owner).setMailbox(await mailbox.getAddress())
      expect(await mailbox.dispatched()).to.be.false

      await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)
    })
    it('fetches the fee', async () => {
      expect(
        await inbox.fetchFee(
          sourceChainID,
          calldata,
          ethers.zeroPadBytes(await dummyHyperProver.getAddress(), 32),
        ),
      ).to.eq(toBeHex(`100000`, 32))
    })
    it('fails to fulfill hyper instant if the fee is too low', async () => {
      expect(await mailbox.dispatched()).to.be.false
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
            {
              value:
                Number(
                  await inbox.fetchFee(
                    sourceChainID,
                    calldata,
                    ethers.zeroPadBytes(
                      await dummyHyperProver.getAddress(),
                      32,
                    ),
                  ),
                ) - 1,
            },
          ),
      ).to.be.revertedWithCustomError(inbox, 'InsufficientFee')
      expect(await mailbox.dispatched()).to.be.false
    })
    it('fulfills hyper instant', async () => {
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
            {
              value: Number(
                await inbox.fetchFee(
                  sourceChainID,
                  calldata,
                  ethers.zeroPadBytes(await dummyHyperProver.getAddress(), 32),
                ),
              ),
            },
          ),
      )
        .to.emit(inbox, 'Fulfillment')
        .withArgs(intentHash, sourceChainID, dstAddr.address)
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
    it('fulfills hyper batch', async () => {
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
        .to.emit(inbox, 'Fulfillment')
        .withArgs(intentHash, sourceChainID, dstAddr.address)
        .to.emit(inbox, 'AddToBatch')
        .withArgs(
          intentHash,
          sourceChainID,
          dstAddr.address,
          await dummyHyperProver.getAddress(),
        )

      expect(await mailbox.dispatched()).to.be.false
    })
    it('drains', async () => {
      const fee = await inbox.fetchFee(
        sourceChainID,
        calldata,
        ethers.zeroPadBytes(await dummyHyperProver.getAddress(), 32),
      )
      const excess = ethers.parseEther('.123')
      await inbox
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
          {
            value: fee + excess,
          },
        )
      const initialSolverbalance = await ethers.provider.getBalance(
        solver.address,
      )
      await inbox.connect(owner).drain(solver.address)
      expect(await ethers.provider.getBalance(solver.address)).to.eq(
        initialSolverbalance + excess,
      )
      expect(await ethers.provider.getBalance(await inbox.getAddress())).to.eq(
        0,
      )
    })
    context('sendBatch', async () => {
      it('should revert if number of intents exceeds MAX_BATCH_SIZE', async () => {
        const i = intentHash
        const hashes: string[] = [i, i, i, i, i, i, i, i, i, i, i, i, i, i]
        expect(hashes.length).to.be.greaterThan(await inbox.MAX_BATCH_SIZE())
        await expect(
          inbox
            .connect(solver)
            .sendBatch(
              sourceChainID,
              await dummyHyperProver.getAddress(),
              hashes,
            ),
        ).to.be.revertedWithCustomError(inbox, 'BatchTooLarge')
        expect(await mailbox.dispatched()).to.be.false
      })
      it('should revert if sending a batch containing an intent that has not been fulfilled', async () => {
        const hashes: string[] = [intentHash]
        expect(hashes.length).to.be.lessThanOrEqual(
          await inbox.MAX_BATCH_SIZE(),
        )
        await expect(
          inbox
            .connect(solver)
            .sendBatch(
              sourceChainID,
              await dummyHyperProver.getAddress(),
              hashes,
            ),
        )
          .to.be.revertedWithCustomError(inbox, 'IntentNotFulfilled')
          .withArgs(hashes[0])
        expect(await mailbox.dispatched()).to.be.false
      })
      it('should revert if sending a batch with too low a fee', async () => {
        expect(await mailbox.dispatched()).to.be.false
        await inbox
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
          )
        expect(await mailbox.dispatched()).to.be.false
        await expect(
          inbox
            .connect(solver)
            .sendBatch(
              sourceChainID,
              await dummyHyperProver.getAddress(),
              [intentHash],
              {
                value:
                  Number(
                    await inbox.fetchFee(
                      sourceChainID,
                      calldata,
                      ethers.zeroPadBytes(
                        await dummyHyperProver.getAddress(),
                        32,
                      ),
                    ),
                  ) - 1,
              },
            ),
        ).to.be.revertedWithCustomError(inbox, 'InsufficientFee')
        expect(await mailbox.dispatched()).to.be.false
      })
      it('succeeds for a single intent', async () => {
        expect(await mailbox.dispatched()).to.be.false
        await inbox
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
          )
        expect(await mailbox.dispatched()).to.be.false
        await expect(
          inbox
            .connect(solver)
            .sendBatch(
              sourceChainID,
              await dummyHyperProver.getAddress(),
              [intentHash],
              {
                value: Number(
                  await inbox.fetchFee(
                    sourceChainID,
                    calldata,
                    ethers.zeroPadBytes(
                      await dummyHyperProver.getAddress(),
                      32,
                    ),
                  ),
                ),
              },
            ),
        ).to.not.be.reverted
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
      it('succeeds for multiple intents', async () => {
        expect(await mailbox.dispatched()).to.be.false
        await inbox
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
          )
        const newTokenAmount = 12345
        const newTimeDelta = 1123
        ;({
          intentHash: otherHash,
          calldata: otherCallData,
          timeStamp: otherTimeStamp,
        } = await createIntentData(newTokenAmount, newTimeDelta))
        await erc20.mint(solver.address, newTokenAmount)
        await erc20
          .connect(solver)
          .transfer(await inbox.getAddress(), newTokenAmount)
        await inbox
          .connect(solver)
          .fulfillHyperBatched(
            sourceChainID,
            [erc20Address],
            [otherCallData],
            otherTimeStamp,
            nonce,
            dstAddr.address,
            otherHash,
            await dummyHyperProver.getAddress(),
          )
        expect(await mailbox.dispatched()).to.be.false
        await expect(
          inbox
            .connect(solver)
            .sendBatch(
              sourceChainID,
              await dummyHyperProver.getAddress(),
              [intentHash, otherHash],
              {
                value: Number(
                  await inbox.fetchFee(
                    sourceChainID,
                    calldata,
                    ethers.zeroPadBytes(
                      await dummyHyperProver.getAddress(),
                      32,
                    ),
                  ),
                ),
              },
            ),
        ).to.not.be.reverted
        expect(await mailbox.destinationDomain()).to.eq(sourceChainID)
        expect(await mailbox.recipientAddress()).to.eq(
          ethers.zeroPadValue(await dummyHyperProver.getAddress(), 32),
        )
        expect(await mailbox.messageBody()).to.eq(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32[]', 'address[]'],
            [
              [intentHash, otherHash],
              [dstAddr.address, dstAddr.address],
            ],
          ),
        )
        expect(await mailbox.dispatched()).to.be.true
      })
    })
  })
})
