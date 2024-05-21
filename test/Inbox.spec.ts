import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { ERC20Test, Inbox } from '../typechain-types'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'

describe('Inbox Test', (): void => {
  let inbox: Inbox
  let erc20: ERC20Test
  let owner: SignerWithAddress
  let solver: SignerWithAddress
  const mintAmount = 1000

  async function deployInboxFixture(): Promise<{
    inbox: Inbox
    erc20: ERC20Test
    owner: SignerWithAddress
    solver: SignerWithAddress
  }> {
    const [owner, solver] = await ethers.getSigners()
    const inboxFactory = await ethers.getContractFactory('Inbox')
    const inbox = await inboxFactory.deploy()

    // deploy ERC20 test
    const erc20Factory = await ethers.getContractFactory('ERC20Test')
    const erc20 = await erc20Factory.deploy('eco', 'eco', mintAmount)

    return {
      inbox,
      erc20,
      owner,
      solver,
    }
  }

  async function setBalances() {
    await erc20.connect(owner).transfer(await solver.getAddress(), mintAmount)
  }

  beforeEach(async (): Promise<void> => {
    ;({ inbox, erc20, owner, solver } = await loadFixture(deployInboxFixture))

    // fund the solver
    await setBalances()
  })

  it('should revert if the timestamp is expired', async () => {
    expect(true).to.be.false
  })

  it('should revert if the data is invalid', async () => {
    expect(true).to.be.false
  })

  it('should revert if the hash is invalid', async () => {
    expect(true).to.be.false
  })

  it('should revert if the intent has already been fulfilled', async () => {
    expect(true).to.be.false
  })

  describe('when the intent is valid', () => {
    it('should revert if the call fails', async () => {
      expect(true).to.be.false
    })

    it('should revert if one of the calls fails', async () => {
      expect(true).to.be.false
    })

    it('should succeed', async () => {
      // should update the fulfilled hash

      // should emit an event

      // should return a result

      // check balances
      expect(true).to.be.false
    })
  })
})
