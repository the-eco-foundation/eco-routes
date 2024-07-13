import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ProverRouter, TestProver, IntentSource } from '../typechain-types'
import { Test } from 'mocha'
import { toQuantity } from 'ethers'

describe('ProverRouter test', () => {
  let router: ProverRouter
  let prover: TestProver

  let owner: SignerWithAddress
  let nonOwner: SignerWithAddress

  beforeEach(async (): Promise<void> => {
    ;[owner, nonOwner] = await ethers.getSigners()

    router = await (
      await ethers.getContractFactory('ProverRouter')
    ).deploy(owner)

    prover = await (
      await ethers.getContractFactory('TestProver')
    ).deploy(await router.getAddress())
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

  it('passes calls to proveL1WorldState through', async () => {
    await router.connect(owner).setProver(0, prover)
    const proveL1WorldStateArgs = toQuantity(123)
    await router.connect(nonOwner).proveL1WorldState(0, proveL1WorldStateArgs)
    expect(await prover.proveL1WorldStateData()).to.eq(proveL1WorldStateArgs)
  })
  it('passes calls to proveOutputRoot through', async () => {
    await router.connect(owner).setProver(0, prover)
    const proveOutputRootArgs = [
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222222222222222222222222222',
      3,
      ['0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c'],
      '0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c',
      ['0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c'],
      '0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c',
    ]
    await router.connect(nonOwner).proveOutputRoot(0, ...proveOutputRootArgs)
    expect(await prover.connect(nonOwner).getProveOutputRootData()).to.deep.eq(
      proveOutputRootArgs,
    )
  })

  it('passes calls to proveIntent through', async () => {
    await router.connect(owner).setProver(0, prover)
    await router.connect(owner).setInbox(0, await nonOwner.getAddress())
    const proveIntentArgs = [
      await owner.getAddress(),
      '0x2222222222222222222222222222222222222222222222222222222222222222',
      3,
      ['0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c'],
      '0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c',
      ['0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c'],
      '0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c',
    ]
    await router.connect(nonOwner).proveIntent(0, ...proveIntentArgs)
    const data = await prover.getProveIntentData()
    expect(data[0]).to.eq(proveIntentArgs[0])
    expect(data[1]).to.eq(await router.inboxes(0))
    expect(data.slice(2)).to.deep.eq(proveIntentArgs.slice(1))
  })
  it('passes through a call to withdraw', async () => {
    await router.connect(owner).setProver(0, prover)
    const fakeHash = toQuantity('420')

    const source = await (
      await ethers.getContractFactory('IntentSource')
    ).deploy(await router.getAddress(), 3600, 0)

    await prover.addProvenIntent(fakeHash, nonOwner.address)
    await expect(
        source.connect(nonOwner).withdrawRewards(fakeHash)
    )
  })
})
