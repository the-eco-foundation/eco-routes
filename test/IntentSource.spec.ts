import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { TestERC20, IntentSource, TestProver } from '../typechain-types'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { DataHexString } from 'ethers/lib.commonjs/utils/data'

describe('Intent Source Test', (): void => {
  let source: IntentSource
  let erc20: TestERC20
  let creator: SignerWithAddress
  let solver: SignerWithAddress
  let prover: TestProver
  let hash32: string
  let calldata: DataHexString
  let timeStamp: number
  let erc20Address: string
  const mintAmount = 1000

  async function deployInboxFixture(): Promise<{
    intentSource: IntentSource
    tokenA: TestERC20
    tokenB: TestERC20
    prover: TestProver
    creator: SignerWithAddress
    solver: SignerWithAddress
    dstAddr: SignerWithAddress
  }> {
    const [creator, solver, dstAddr] = await ethers.getSigners()
    const intentSourceFactory = await ethers.getContractFactory('IntentSource')
    const intentSource = await intentSourceFactory.deploy()

    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('TestERC20')
    const tokenA = await erc20Factory.deploy('A', 'A')
    const tokenB = await erc20Factory.deploy('B', 'B')

    // deploy prover
    const proverFactory = await ethers.getContractFactory('TestProver')
    const prover = await proverFactory.deploy()

    return {
      intentSource,
      tokenA,
      tokenB,
      prover,
      creator,
      solver,
      dstAddr,
    }
  }

//   async function setBalances() {
//     await erc20.connect(owner).transfer(await solver.getAddress(), mintAmount)
//   }

//   async function encodeTransfer(
//     to: string,
//     value: number,
//   ): Promise<DataHexString> {
//     // Contract ABIs
//     const erc20ABI = ['function transfer(address to, uint256 value)']
//     const abiInterface = new ethers.Interface(erc20ABI)
//     const callData = abiInterface.encodeFunctionData('transfer', [to, value])
//     return callData
//   }

//   beforeEach(async (): Promise<void> => {
//     ;({ inbox, erc20, owner, solver, dstAddr } =
//       await loadFixture(deployInboxFixture))

//     // fund the solver
//     await setBalances()
//     erc20Address = await erc20.getAddress()
//     calldata = await encodeTransfer(dstAddr.address, mintAmount)
//     timeStamp = (await time.latest()) + timeDelta
//     const abiCoder = ethers.AbiCoder.defaultAbiCoder()
//     const encodedData = abiCoder.encode(
//       ['uint256', 'address[]', 'bytes[]', 'uint256'],
//       [nonce, [erc20Address], [calldata], timeStamp],
//     )
//     hash32 = ethers.keccak256(encodedData)
//   })

//   describe('when the intent is invalid', () => {
//     it('should revert if the timestamp is expired', async () => {
//       timeStamp -= 2 * timeDelta
//       await expect(
//         inbox.fulfill(
//           nonce,
//           [erc20Address],
//           [calldata],
//           timeStamp,
//           dstAddr.address,
//         ),
//       ).to.be.revertedWithCustomError(inbox, 'IntentExpired')
//     })

//     it('should revert if the data is invalid', async () => {
//       // unequal length of addresses and calldata
//       await expect(
//         inbox.fulfill(
//           nonce,
//           [erc20Address],
//           [calldata, calldata],
//           timeStamp,
//           dstAddr.address,
//         ),
//       ).to.be.revertedWithCustomError(inbox, 'InvalidData')
//       // empty addresses
//       await expect(
//         inbox.fulfill(
//           nonce,
//           [],
//           [calldata, calldata],
//           timeStamp,
//           dstAddr.address,
//         ),
//       ).to.be.revertedWithCustomError(inbox, 'InvalidData')
//     })
//   })

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