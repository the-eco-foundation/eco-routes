import { ethers, network } from 'hardhat'
import {
  IntentSource,
  Inbox,
  SingletonFactory,
  HyperProver,
} from '../../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { chainAddresses } from '@hyperlane-xyz/registry'

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
const inboxAddress = '0x'
const salt = ethers.keccak256(ethers.toUtf8Bytes('HYPERPROVER'))

const networkName: string = network.name
console.log('Deploying to Network: ', network.name)

async function main() {
  const deployer: SignerWithAddress = (await ethers.getSigners())[0]
  console.log('Deploying contracts with the account:', deployer.address)
  const mailboxAddress: string = chainAddresses.ecotestnet.mailbox

  //   const singletonFactory: SingletonFactory = await ethers.getContractAt('SingletonFactory', singletonFactoryAddress)
  //   const hyperProverDeployTx = (await ethers.getContractFactory('HyperProver')).getDeployTransaction()
  console.log(mailboxAddress)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
