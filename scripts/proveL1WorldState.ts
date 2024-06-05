import { Block, Provider, hexlify, keccak256 } from 'ethers'
import { ethers } from 'hardhat'
import { numberToHex, toBytes } from 'viem'
import {
  IL1Block,
  IL1Block__factory,
  Prover,
  Prover__factory,
} from '../typechain-types'

const pk = process.env.PRIVATE_KEY || ''
const apikey = process.env.ALCHEMY_API_KEY || ''

// const blockNumber = process.env.FULFILLMENT_BLOCK_NUMBER || '0x5a12ed'
// const blockNumber = '0x5a12ed'
// const blockNumber = numberToHex(6046560)
const L1RPCURL = 'https://eth-sepolia.g.alchemy.com/v2/'
const L2RPCURL = 'https://opt-sepolia.g.alchemy.com/v2/'
const proverAddress =
  process.env.PROVER_CONTRACT_ADDRESS ||
  '0xBA820f11f874D39d8bc6097F051Fc7A238b62f0e'

async function proveCurrent() {
  const L2provider = ethers.getDefaultProvider(L2RPCURL + apikey)
  const wallet = new ethers.Wallet(pk, L2provider)
  const prover: Prover = Prover__factory.connect(proverAddress, wallet)
  const l1block: IL1Block = IL1Block__factory.connect(
    await prover.l1BlockhashOracle(),
    wallet,
  )
  const currentBlock = await l1block.number()
  console.log(`true hash: ${await l1block.hash()}`)

  await proveL1WorldState(numberToHex(currentBlock))
}

async function proveL1WorldState(_blockNumber: string) {
  const L1provider: Provider = ethers.getDefaultProvider(L1RPCURL + apikey)
  const L2provider = ethers.getDefaultProvider(L2RPCURL + apikey)
  const wallet = new ethers.Wallet(pk, L2provider)
  const prover: Prover = Prover__factory.connect(proverAddress, wallet)

  const block: Block = await L1provider.send('eth_getBlockByNumber', [
    _blockNumber,
    false,
  ])
  console.log('Block:', block)
  let blockData = assembleBlockData(block)
  blockData = await cleanBlockData(blockData)

  console.log(keccak256(await prover.rlpEncodeDataLibList(blockData)))
  //   console.log(block.hash)
  //
  let tx
  try {
    tx = await prover.proveL1WorldState(
      await prover.rlpEncodeDataLibList(blockData),
    )
    await tx.wait()
    console.log(`proven L1 world state root: ${blockData[3]}`)
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
    console.log('index:', index)
    console.log('blockData[index]', blockData[index])
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

// proveL1WorldState(blockNumber)
proveCurrent()
