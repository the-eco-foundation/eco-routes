import { Wallet } from 'ethers'

async function walletGen() {
  const wallet = await Wallet.createRandom()
  console.log(`address: ${wallet.address}, key: ${wallet.privateKey}`)
}

async function main() {
  walletGen()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
