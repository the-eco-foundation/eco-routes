import { Block, Provider, hexlify, keccak256 } from 'ethers'
import { ethers } from 'hardhat'
import { toBytes } from 'viem'
import { Prover, Prover__factory } from '../typechain-types'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''

const blockNumber = '0x5a12ed'
const L1RPCURL = 'https://eth-sepolia.g.alchemy.com/v2/'
const L2RPCURL = 'https://opt-sepolia.g.alchemy.com/v2/'
const proverAddress = '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'

const L1WorldStateRoot = ''
const batchIndex = ''

async function proveOutputRoot() {

}