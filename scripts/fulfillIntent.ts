import { ethers } from 'hardhat'
// eslint-disable-next-line
import { Inbox__factory, ERC20, ERC20__factory } from '../typechain-types'
import { encodeTransfer } from '../utils/encode'

async function main() {
  const amt = 1234
  const destAddress = '0xCd80B973e7CBB93C21Cc5aC0A5F45D12A32582aa'.toLowerCase()
  const nonce =
    '0xdc00b7d95b0b345824d6c6d24ce88863f97d83d8f9303afca30ccaefb756c5d3'
  const targets: string[] = ['0xab1d243b07e99c91de9e4b80dfc2b07a8332a2f7']
  const calldata: string[] = [await encodeTransfer(destAddress, amt)]
  const timeStamp: number = 1717090930
  const claimerAddress: string =
    '0xCd80B973e7CBB93C21Cc5aC0A5F45D12A32582aa'.toLowerCase()
  const inboxContractAddress =
    '0xa506283526A6948619Ac101f0ee7d21a86FcBEDA'.toLowerCase()

  const [solver] = await ethers.getSigners()
  console.log('Interacting with account:', solver.address)

  const inbox = Inbox__factory.connect(inboxContractAddress, solver)

  try {
    const rewardToken: ERC20 = ERC20__factory.connect(targets[0], solver)
    await rewardToken.transfer(inboxContractAddress, amt)

    const tx = await inbox.fulfill(
      nonce,
      targets,
      calldata,
      timeStamp,
      claimerAddress,
    )
    console.log('Inbox fulfilled: ', tx.hash)
  } catch (e) {
    console.log(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
