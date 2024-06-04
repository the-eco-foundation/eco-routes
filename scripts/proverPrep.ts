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

async function proveL1WorldState(_blockNumber: string) {
  const L1provider: Provider = ethers.getDefaultProvider(L1RPCURL + apikey)
  const L2provider = ethers.getDefaultProvider(L2RPCURL + apikey)
  const wallet = new ethers.Wallet(pk, L2provider)
  const prover: Prover = Prover__factory.connect(proverAddress, wallet)

  const block: Block = await L1provider.send('eth_getBlockByNumber', [
    _blockNumber,
    false,
  ])
  let blockData = assembleBlockData(block)
  blockData = await cleanBlockData(blockData)

  //   console.log(keccak256(await prover.rlpEncodeDataLibList(blockData)))
  //   console.log(block.hash)
  //
  let tx
  try {
    tx = await prover.proveL1WorldState(
      await prover.rlpEncodeDataLibList(blockData),
    )
    await tx.wait()
  } catch (e) {
    console.log(e)
  }
  //   have successfully proven L1 state
}

function assembleBlockData(block: Block) {
  const blockData = []
  blockData.push(block.parentHash)
  blockData.push(block.sha3Uncles)
  blockData.push(block.miner)
  blockData.push(block.stateRoot)
  blockData.push(block.transactionsRoot)
  blockData.push(block.receiptsRoot)
  blockData.push(block.logsBloom)
  blockData.push(block.difficulty) // check
  blockData.push(block.number) // check
  blockData.push(block.gasLimit) // check
  blockData.push(block.gasUsed) // check
  blockData.push(block.timestamp) // check
  blockData.push(block.extraData)
  blockData.push(block.mixHash)
  blockData.push(block.nonce) // check
  blockData.push(block.baseFeePerGas) // check
  blockData.push(block.withdrawalsRoot)
  blockData.push(block.blobGasUsed) // check
  blockData.push(block.excessBlobGas) // check
  blockData.push(block.parentBeaconBlockRoot)

  return blockData
}

function cleanBlockData(blockData) {
  // need to do some zero padding and replacements.
  // these are all the fields that can be odd-length (i think)
  // we zero pad them by 1 if they are odd length
  // and set to 0x if the value is 0x0
  // voila, its a valid Byteslike!
  const indicesToCheck = [7, 8, 9, 10, 11, 14, 15, 17, 18]
  for (let i = 0; i < indicesToCheck.length; i++) {
    const index = indicesToCheck[i]
    blockData[index] =
      blockData[index] === '0x0'
        ? '0x'
        : // eslint-disable-next-line no-self-compare
          blockData[index].length & (1 === 1)
          ? ethers.zeroPadValue(
              toBytes(blockData[index]),
              (blockData[index].length + 1 - 2) / 2,
            )
          : blockData[index]
  }
  return blockData
}

proveL1WorldState(blockNumber)
