import { ethers } from 'hardhat'
import { USDCLike } from '../typechain-types'

async function deployUSDCLike() {
  const factory = await ethers.getContractFactory('USDCLike')

  const token: USDCLike = await factory.deploy('USDCLike', 'USDCL')
  console.log(await token.getAddress())
}

async function main() {
  deployUSDCLike()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
