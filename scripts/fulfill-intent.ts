import { ethers } from 'hardhat'
// eslint-disable-next-line
import { Inbox__factory } from '../typechain-types'
import { encodeTransfer } from '../utils/encode'

async function main() {
  const nonce = ethers.encodeBytes32String('0x987')
  const targets: string[] = ['0xAb1D243b07e99C91dE9E4B80DFc2B07a8332A2f7']
  const calldata: string[] = [await encodeTransfer('0x982E148216E3Aa6B38f9D901eF578B5c06DD7502', 1)]
  const timeStamp: number = 0
  const claimerAddress: string = '0x982E148216E3Aa6B38f9D901eF578B5c06DD7502'
  const inboxContractAddress = '0x3a7e440f1c95fD2Ff8f1f028701f821Ad0fa018a'

  const [signer] = await ethers.getSigners()
  console.log('Interacting with account:', signer.address)

  const inbox = Inbox__factory.connect(inboxContractAddress, signer)

  try {
    const tx = await inbox.fulfill(nonce, targets, calldata, timeStamp, claimerAddress)
    console.log('Inbox fulfilled: ', tx)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
