import { ethers, run } from 'hardhat'
import { Inbox } from '../typechain-types'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inbox: Inbox = await inboxFactory.deploy()
  console.log('Inbox deployed to:', await inbox.getAddress())
  // console.log('waiting 30 seconds to ensure bytecode is on chain')
  // await setTimeout(30000)

  await run('verify:verify', {
    address: await inbox.getAddress(),
    constructorArguments: [],
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
