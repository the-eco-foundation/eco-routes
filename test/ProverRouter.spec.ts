import { ethers } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ProverRouter } from '../typechain-types'

describe('ProverRouter test', () => {
  let router: ProverRouter

  let owner: SignerWithAddress
  let nonOwner: SignerWithAddress

  beforeEach(async (): Promise<void> => {
    ;[owner, nonOwner] = await ethers.getSigners()

    router = await (
      await ethers.getContractFactory('ProverRouter')
    ).deploy(owner)
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

  it('sets prover and emits event', async () => {
    const someChainID = 12345
    expect(await router.provers(someChainID)).to.eq(ethers.ZeroAddress)

    await expect(router.connect(owner).setProver(someChainID, owner.address))
      .to.emit(router, 'NewProver')
      .withArgs(someChainID, owner.address)
    expect(await router.provers(someChainID)).to.eq(owner.address)
  })

  it('sets inbox and emits event', async () => {
    const someChainID = 12345
    expect(await router.inboxes(someChainID)).to.eq(ethers.ZeroAddress)

    await expect(router.connect(owner).setInbox(someChainID, owner.address))
      .to.emit(router, 'NewInbox')
      .withArgs(someChainID, owner.address)
    expect(await router.inboxes(someChainID)).to.eq(owner.address)
  })
})
