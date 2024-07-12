import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ProverRouter, TestProver, Prover } from '../typechain-types'
import { Test } from 'mocha'
import { smock, FakeContract } from '@defi-wonderland/smock'
import { toQuantity } from 'ethers'

describe('ProverRouter test', () => {
  let router: ProverRouter
  let prover: FakeContract<Prover>
  //   let prover: TestProver

  let owner: SignerWithAddress
  let nonOwner: SignerWithAddress

  beforeEach(async (): Promise<void> => {
    ;[owner, nonOwner] = await ethers.getSigners()

    router = await (
      await ethers.getContractFactory('ProverRouter')
    ).deploy(owner)
    prover = await smock.fake<Prover>('contracts/Prover.sol:Prover', {
      address: owner.address,
    })
    // prover = await (
    //   await ethers.getContractFactory('TestProver')
    // ).deploy(await router.getAddress())
  })

  it('constructs', async () => {
    expect(await router.owner()).to.eq(await owner.getAddress())
  })

  it('doesnt let non-owner call set methods', async () => {
    await expect(
      router.connect(nonOwner).setProver(0, nonOwner.address),
    ).to.be.revertedWithCustomError(router, 'OwnableUnauthorizedAccount')
    await expect(
      router.connect(nonOwner).setInbox(0, nonOwner.address),
    ).to.be.revertedWithCustomError(router, 'OwnableUnauthorizedAccount')
  })

  it('sets prover', async () => {
    const someChainID = 12345
    expect(await router.provers(someChainID)).to.eq(ethers.ZeroAddress)

    await router.connect(owner).setProver(someChainID, owner.address)
    expect(await router.provers(someChainID)).to.eq(owner.address)
  })

  it('sets inbox', async () => {
    const someChainID = 12345
    expect(await router.inboxes(someChainID)).to.eq(ethers.ZeroAddress)

    await router.connect(owner).setInbox(someChainID, owner.address)
    expect(await router.inboxes(someChainID)).to.eq(owner.address)
  })

  it('passes calls through', async () => {
    await router.setProver(0, prover)
    const proveL1WorldStateArgs = toQuantity(123)

    await router.connect(nonOwner).proveL1WorldState(1, proveL1WorldStateArgs)
    expect(prover.proveL1WorldState).to.have.been.calledWith(
      proveL1WorldStateArgs,
    )
  })
})
