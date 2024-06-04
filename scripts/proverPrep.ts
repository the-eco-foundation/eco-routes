import { Block, hexlify } from 'ethers'
import { ethers } from 'hardhat'
import { toBytes } from 'viem'
import { Prover__factory } from '../typechain-types'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''
const l1BlockAddress = process.env.L1BLOCK || ''

const blockNumber = '0x5a12ed'
const L1RPCURL = 'https://eth-sepolia.g.alchemy.com/v2/'
const proverAddress = '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'

async function doSomeProving(_blockNumber: string) {
  const provider = ethers.getDefaultProvider(L1RPCURL + apikey)
  const wallet = new ethers.Wallet(pk, provider)
  const prover = Prover__factory.connect(proverAddress, wallet)

  const block: Block = await provider.send('eth_getBlockByNumber', [
    _blockNumber,
    false,
  ])
  const blockData = assembleBlockData(block)
  let tx
  try {
    tx = await prover.proveL1WorldState(
      await prover.rlpEncodeDataLibList(blockData),
    )
  } catch (e) {
    console.log(e)
  }
  // have successfully proven L1 state
}

function assembleBlockData(block: Block) {
  const blockData = []
  blockData.push(block.parentHash)
  blockData.push(block.sha3Uncles) // not sure where this bit is? 0x1dcc
  blockData.push(block.miner)
  blockData.push(block.stateRoot)
  blockData.push(block.transactionsRoot) // 0x9d6f
  blockData.push(block.receiptsRoot)
  blockData.push(block.logsBloom) // 0xc44
  blockData.push(block.difficulty)
  blockData.push(hexlify(toBytes(block.number)))
  blockData.push(block.gasLimit)
  blockData.push(block.gasUsed)
  blockData.push(block.timestamp)
  blockData.push(block.extraData)
  blockData.push(block.mixHash)
  blockData.push(block.nonce)
  blockData.push(block.baseFeePerGas)
  blockData.push(block.withdrawalsRoot) // 0xdc3d
  blockData.push(block.blobGasUsed)
  blockData.push(block.excessBlobGas)
  blockData.push(block.parentBeaconBlockRoot)
  return blockData
}

doSomeProving(blockNumber)
