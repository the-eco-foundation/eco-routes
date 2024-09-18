import { ethers, network } from 'hardhat'
import {
  IntentSource,
  Inbox,
  SingletonFactory,
  HyperProver,
} from '../typechain-types'
import { setTimeout } from 'timers/promises'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { chainAddresses, optimism } from '@hyperlane-xyz/registry'

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
let inboxAddress = '0xBAD17e5280eF02c82f6aa26eE3d5E77458e53538' // OP and base
const salt = ethers.keccak256(ethers.toUtf8Bytes('HYPERPROVER'))

let mailboxAddress: string

const networkName: string = network.name
console.log('Deploying to Network: ', network.name)

switch (networkName) {
  case 'base':
    inboxAddress = '0xBAD17e5280eF02c82f6aa26eE3d5E77458e53538'
    mailboxAddress = '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D'
    break
  case 'optimism':
    inboxAddress = '0xBAD17e5280eF02c82f6aa26eE3d5E77458e53538'
    mailboxAddress = '0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D'
    break
  case 'baseSepolia':
    inboxAddress = '0x'
    mailboxAddress = '0x6966b0E55883d49BFB24539356a2f8A673E02039'
    break
  case 'optimismSepolia':
    inboxAddress = '0x'
    mailboxAddress = '0x6966b0E55883d49BFB24539356a2f8A673E02039'
    break
  default:
    inboxAddress = '0x'
    mailboxAddress = '0x6966b0E55883d49BFB24539356a2f8A673E02039'
    break
}

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

  const hyperprover: HyperProver = await singletonFactory.deploy(
    hyperProverDeployTx.data,
    salt,
  )

  console.log('Waiting for 30 seconds for Bytecode to be on chain')
  await setTimeout(30000)

  try {
    await run('verify:verify', {
      address: hyperprover.address,
      constructorArguments: [mailboxAddress, inboxAddress],
    })
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
