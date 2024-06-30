import { ethers, run, network } from 'hardhat'
import { Inbox } from '../typechain-types'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inbox: Inbox = await inboxFactory.deploy()
  console.log('Inbox deployed to:', await inbox.getAddress())

  if (network.name !== 'hardhat') {
    await run('verify:verify', {
      address: await inbox.getAddress(),
      constructorArguments: [],
    })
  }
  console.log('Inbox verified at:', await inbox.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
