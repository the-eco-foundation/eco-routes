import { ethers } from 'ethers'

async function makeWallets(number: number) {
  for (let i = 0; i < number; i++) {
    const wallet = await ethers.Wallet.createRandom()
    console.log(
      `address: ${wallet.address}, key: ${wallet.signingKey.privateKey}`,
    )
  }
}

makeWallets(1)
