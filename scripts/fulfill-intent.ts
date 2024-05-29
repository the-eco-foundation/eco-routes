import { ethers } from 'hardhat'
// eslint-disable-next-line
import { Inbox__factory } from '../typechain-types'
import { encodeTransfer } from '../utils/encode'

async function main() {
  const nonce = ethers.encodeBytes32String('0x987')
  const targets: string[] = ['erc20Address']
  const calldata: string[] = [
    await encodeTransfer('0xbD7897D8c7dB7016e67D82aEd8b7490AACcaF5AB', 0),
  ]
  const timeStamp: number = 0
  const claimerAddress: string = '0x123'
  const inboxContractAddress = ''

  const [signer] = await ethers.getSigners()
  console.log('Interacting with account:', signer.address)

  const inbox = Inbox__factory.connect(inboxContractAddress, signer)

  try {
    const tx = await inbox.fulfill(
      nonce,
      targets,
      calldata,
      timeStamp,
      claimerAddress,
    )
    console.log('Inbox fulfilled: ', tx)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
