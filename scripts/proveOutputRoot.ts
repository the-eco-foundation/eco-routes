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
const L2OutputOracleAddress = '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254'
const L1SubmissionBlock = numberToHex(5903085)

const L1WorldStateRoot = ''
const batchIndex = ''

async function proveOutputRoot() {
  const baseProvider = ethers.getDefaultProvider(baseRPCURL + apikey)
  const opProvider = ethers.getDefaultProvider(opRPCURL + apikey)
  const L1Provider = ethers.getDefaultProvider(L1RPCURL + apikey)

  const baseIntentFulfillBlock = numberToHex(9934282)

  const L2toL1MessagePasser = '0x4200000000000000000000000000000000000016'

  //   const block: Block = await L1Provider.send('eth_getBlockByNumber', [
  //     blockNumber,
  //     false,
  //   ])
  //   const proofOutput = await L1Provider.send('eth_getProof', [
  //     L2OutputOracleAddress,
  //     [],
  //     L1SubmissionBlock,
  //   ])
  const proofOutput = await baseProvider.send('eth_getProof', [
    L2toL1MessagePasser,
    [],
    baseIntentFulfillBlock,
  ])
  console.log(proofOutput)
}

proveOutputRoot()
