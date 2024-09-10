import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { HyperProver, Inbox, TestMailbox } from '../typechain-types'

describe('HyperProver Test', (): void => {
  let inbox: Inbox
  let dispatcher: TestMailbox
  let processor: TestMailbox
  let hyperProver: HyperProver
  let owner: SignerWithAddress
  let solver: SignerWithAddress

  async function deployHyperproverFixture(): Promise<{
    inbox: Inbox
    dispatcher: TestMailbox
    processor: TestMailbox
    hyperProver: HyperProver
    owner: SignerWithAddress
    solver: SignerWithAddress
  }> {
    const [owner, solver, dstAddr] = await ethers.getSigners()
    const dispatcher = await (
      await ethers.getContractFactory('TestMailbox')
    ).deploy()
    const processor = await (
      await ethers.getContractFactory('TestMailbox')
    ).deploy()

    const inbox = await (
      await ethers.getContractFactory('Inbox')
    ).deploy(owner.address, true, [], await dispatcher.getAddress())
    const hyperProver = await (
      await ethers.getContractFactory('HyperProver')
    ).deploy(await processor.getAddress(), await inbox.getAddress())

    return { inbox, dispatcher, processor, hyperProver, owner, solver }
  }

  beforeEach(async (): Promise<void> => {
    ;({ inbox, dispatcher, processor, hyperProver, owner, solver } =
      await loadFixture(deployHyperproverFixture))
  })
})
