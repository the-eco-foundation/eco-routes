import { Block, Provider, hexlify, keccak256 } from 'ethers'
import { ethers } from 'hardhat'
import { toBytes, numberToHex } from 'viem'
import { Prover, Prover__factory } from '../typechain-types'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''

const blockNumber = numberToHex(9934320)
// const hexBlockNumber = hexlify(blockNumber)
const L1RPCURL = 'https://eth-sepolia.g.alchemy.com/v2/'
const baseRPCURL = 'https://base-sepolia.g.alchemy.com/v2/'
const opRPCURL = 'https://op-sepolia.g.alchemy.com/v2/'
const proverAddress = '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'

const L1WorldStateRoot = ''
const batchIndex = ''

async function proveOutputRoot() {
  const baseProvider = ethers.getDefaultProvider(baseRPCURL + apikey)
  const opProvider = ethers.getDefaultProvider(opRPCURL + apikey)

  const block: Block = await baseProvider.send('eth_getBlockByNumber', [
    blockNumber,
    false,
  ])
  console.log(block)
}

proveOutputRoot()
