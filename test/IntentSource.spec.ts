import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import hre from 'hardhat'
import { TestERC20, IntentSource, TestProver } from '../typechain-types'
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { DataHexString } from 'ethers/lib.commonjs/utils/data'
import { Block, keccak256, AbiCoder } from 'ethers'
import { NumberLike } from '@nomicfoundation/hardhat-network-helpers/dist/src/types.js'
// import { ERC20 } from '../typechain-types/@openzeppelin/contracts/token/ERC20/ERC20.js'
const { ethers } = hre

describe('Intent Source Test', (): void => {
  let intentSource: IntentSource
  let tokenA: TestERC20
  let tokenB: TestERC20
  let creator: SignerWithAddress
  let solver: SignerWithAddress
  let dest: SignerWithAddress
  let prover: TestProver
  let hash32: string
  let calldata: DataHexString
  let expiryTime: number
  const mintAmount: number = 1000
  const minimumDuration = 1000

  async function deploySourceFixture(): Promise<{
    intentSource: IntentSource
    tokenA: TestERC20
    tokenB: TestERC20
    creator: SignerWithAddress
    solver: SignerWithAddress
  }> {
    const [creator, solver] = await ethers.getSigners()
    dest = creator

    // deploy prover
    const proverFactory = await ethers.getContractFactory('TestProver')
    prover = await proverFactory.deploy()

    const intentSourceFactory = await ethers.getContractFactory('IntentSource')
    const intentSource = await intentSourceFactory.deploy(
      prover,
      minimumDuration
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

  async function encodeIdentifier(
    counter: number,
    chainid: NumberLike
  ): Promise<DataHexString> {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    const encodedData = abiCoder.encode(
      ['uint256', 'uint256'],
      [counter, chainid]
    )
    return keccak256(encodedData)
  }

  async function encodeTransfer(
    to: string,
    value: number
  ): Promise<DataHexString> {
    // Contract ABIs
    const erc20ABI = ['function transfer(address to, uint256 value)']
    const abiInterface = new ethers.Interface(erc20ABI)
    const callData = abiInterface.encodeFunctionData('transfer', [to, value])
    return callData
  }

  beforeEach(async (): Promise<void> => {
    ;({ intentSource, tokenA, tokenB, creator, solver } = await loadFixture(
      deploySourceFixture
    ))

    // fund the creator and approve it to create an intent
    await mintAndApprove()
    calldata = await encodeTransfer(dest.address, mintAmount)
    // expiryTime = (await time.latest()) + 2 * minimumDuration
    // const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    // const encodedData = abiCoder.encode(
    //   ['uint256', 'address[]', 'bytes[]', 'uint256'],
    //   [nonce, [erc20Address], [calldata], timeStamp]
    // )
    // hash32 = ethers.keccak256(encodedData)
  })

  describe('constructor', () => {
    it('works', async () => {
      //   expect(true).to.eq(true)
      expect(await intentSource.CHAIN_ID()).to.eq(
        (await ethers.provider.getNetwork()).chainId
      )
      expect(await intentSource.PROVER()).to.eq(await prover.getAddress())
      expect(await intentSource.MINIMUM_DURATION()).to.eq(minimumDuration)
      expect(await intentSource.counter()).to.eq(0)
    })
    describe('intent creation', () => {
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
                (await time.latest()) + minimumDuration
              )
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
                (await time.latest()) + minimumDuration
              )
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
                (await time.latest()) + minimumDuration
              )
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
                (await time.latest()) + minimumDuration
              )
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
                (await time.latest()) + minimumDuration - 1
              )
          ).to.be.revertedWithCustomError(intentSource, 'ExpiryTooSoon')
        })
      })
      it('creates properly and emits event', async () => {
        const expiry = (await time.latest()) + minimumDuration + 10
        await expect(
          intentSource
            .connect(creator)
            .createIntent(
              1,
              [await tokenA.getAddress()],
              [await encodeTransfer(creator.address, mintAmount)],
              [await tokenA.getAddress(), await tokenB.getAddress()],
              [mintAmount, mintAmount * 2],
              expiry
            )
        ).to.emit(intentSource, 'IntentCreated')
        //   .withArgs(
        //     encodeIdentifier(0, (await ethers.provider.getNetwork()).chainId),
        //     await creator.getAddress(),
        //     1,
        //     [await tokenA.getAddress()],
        //     [await encodeTransfer(creator.address, mintAmount)],
        //     [await tokenA.getAddress(), await tokenB.getAddress()],
        //     [mintAmount, mintAmount * 2],
        //     expiry
        //   )
        const identifier = encodeIdentifier(
          0,
          (await ethers.provider.getNetwork()).chainId
        )
        const intent = await intentSource.intents(identifier)
        expect(intent.creator).to.eq(creator.address)
        expect(intent.destinationChain).to.eq(1)
        expect(intent.targets).to.deep.eq([await tokenA.getAddress()])

        // const encodedData = abiCoder.encode(
        //   ['uint256', 'address[]', 'bytes[]', 'uint256'],
        //   [nonce, [erc20Address], [calldata], timeStamp]
        // )
        // const hash = keccak256(AbiCoder.enc)
      })
    })

    // it('should revert if the data is invalid', async () => {
    //   // unequal length of addresses and calldata
    //   await expect(
    //     inbox.fulfill(
    //       nonce,
    //       [erc20Address],
    //       [calldata, calldata],
    //       timeStamp,
    //       dstAddr.address
    //     )
    //   ).to.be.revertedWithCustomError(inbox, 'InvalidData')
    //   // empty addresses
    //   await expect(
    //     inbox.fulfill(
    //       nonce,
    //       [],
    //       [calldata, calldata],
    //       timeStamp,
    //       dstAddr.address
    //     )
    //   ).to.be.revertedWithCustomError(inbox, 'InvalidData')
    // })
  })

  //   describe('when the intent is valid', () => {
  //     it('should revert if the call fails', async () => {
  //       await expect(
  //         inbox.fulfill(
  //           nonce,
  //           [erc20Address],
  //           [calldata],
  //           timeStamp,
  //           dstAddr.address,
  //         ),
  //       ).to.be.revertedWithCustomError(inbox, 'IntentCallFailed')
  //     })

  //     it('should succeed', async () => {
  //       expect(await inbox.fulfilled(nonce)).to.be.deep.equal([
  //         ethers.ZeroHash,
  //         ethers.ZeroAddress,
  //       ])
  //       expect(await erc20.balanceOf(solver.address)).to.equal(mintAmount)
  //       expect(await erc20.balanceOf(dstAddr.address)).to.equal(0)

  //       // transfer the tokens to the inbox so it can process the transaction
  //       await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)

  //       // should emit an event
  //       await expect(
  //         inbox
  //           .connect(solver)
  //           .fulfill(
  //             nonce,
  //             [erc20Address],
  //             [calldata],
  //             timeStamp,
  //             dstAddr.address,
  //           ),
  //       )
  //         .to.emit(inbox, 'Fulfillment')
  //         .withArgs(nonce)
  //       // should update the fulfilled hash
  //       expect(await inbox.fulfilled(nonce)).to.be.deep.equal([
  //         hash32,
  //         dstAddr.address,
  //       ])

  //       // check balances
  //       expect(await erc20.balanceOf(solver.address)).to.equal(0)
  //       expect(await erc20.balanceOf(dstAddr.address)).to.equal(mintAmount)
  //     })

  //     it('should revert if the intent has already been fulfilled', async () => {
  //       // transfer the tokens to the inbox so it can process the transaction
  //       await erc20.connect(solver).transfer(await inbox.getAddress(), mintAmount)

  //       // should emit an event
  //       await expect(
  //         inbox
  //           .connect(solver)
  //           .fulfill(
  //             nonce,
  //             [erc20Address],
  //             [calldata],
  //             timeStamp,
  //             dstAddr.address,
  //           ),
  //       )
  //         .to.emit(inbox, 'Fulfillment')
  //         .withArgs(nonce)
  //       // should revert
  //       await expect(
  //         inbox
  //           .connect(solver)
  //           .fulfill(
  //             nonce,
  //             [erc20Address],
  //             [calldata],
  //             timeStamp,
  //             dstAddr.address,
  //           ),
  //       ).to.be.revertedWithCustomError(inbox, 'IntentAlreadyFulfilled')
  //     })
  //   })
})
