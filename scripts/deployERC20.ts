import { ethers, run } from 'hardhat'
import { ERC20Test } from '../typechain-types'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  const testERC20Factory = await ethers.getContractFactory('T')

  const erc20: ERC20Test = await testERC20Factory.deploy()
  console.log('erc20 deployed to:', await erc20.getAddress())

  await run('verify:verify', {
    address: await erc20.getAddress(),
    constructorArguments: [],
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
