import { ethers, network } from 'hardhat'
import {
  IntentSource,
  Inbox,
  SingletonFactory,
  HyperProver,
} from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { chainAddresses, optimism } from '@hyperlane-xyz/registry'

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
const inboxAddress = '0xBAD17e5280eF02c82f6aa26eE3d5E77458e53538' // OP and base
const salt = ethers.keccak256(ethers.toUtf8Bytes('HYPERPROVER'))
// const mailboxes = {
//   ecoTestnet: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
//   optimismSepolia: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
//   baseSepolia: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
//   optimism: '0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D',
//   base: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D',
// }
// const mailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039' //ecotestnet
// const mailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039' //optimism sepolia
// const mailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039' //base sepolia
const mailboxAddress = '0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D' // optimism
// const mailboxAddress: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D' //base

const networkName: string = network.name
console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  // cant get this import to work

  const singletonFactory: SingletonFactory = await ethers.getContractAt(
    'SingletonFactory',
    singletonFactoryAddress,
  )

  const hyperProverDeployTx = await (
    await ethers.getContractFactory('HyperProver')
  ).getDeployTransaction(mailboxAddress, inboxAddress)

  await singletonFactory.deploy(hyperProverDeployTx.data, salt)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
