import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  AbiCoder,
  encodeRlp,
  getAddress,
  keccak256,
  toBeHex,
  solidityPackedKeccak256,
  stripZerosLeft,
  zeroPadValue,
} from 'ethers'
// const SecureTrie = require('merkle-patricia-tree').SecureTrie

// Connect to local Ethereum node
const provider = new ethers.JsonRpcProvider('http://localhost:8545')
const account0Pk =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const signer = new ethers.Wallet(account0Pk, provider)

async function setupContracts() {
  const proverFactory = (await ethers.getContractFactory('Prover')).connect(
    signer,
  )
  const prover = await proverFactory.deploy([])
  await prover.deploymentTransaction().wait()

  const storageFactory = (
    await ethers.getContractFactory('SimpleStorage')
  ).connect(signer)
  const storage = await storageFactory.deploy()
  await storage.deploymentTransaction().wait()

  return { prover, storage }
}

async function getStorageProof(storage, slot) {
  const proof = await provider.send('eth_getProof', [
    await storage.getAddress(),
    [zeroPadValue(toBeHex(slot), 32)],
    'latest',
  ])

  return {
    key: proof.storageProof[0].key,
    value: proof.storageProof[0].value,
    proof: proof.storageProof[0].proof,
    hash: proof.storageHash,
  }
}

async function verifyStorageProof(prover, key, valueRlp, proof, hash) {
  try {
    await prover.proveStorage(key, valueRlp, proof, hash)
    return true
  } catch (error) {
    console.error(`Error verifying key ${key}:`, error)
    return false
  }
}

describe('Prover Poc Tests', () => {
  let prover, storage

  before(async () => {
    const contracts = await setupContracts()
    prover = contracts.prover
    storage = contracts.storage
  })

  it('should verify SLOT1', async () => {
    const slot = 1
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0x5fb30336a8d0841cf15d452afa297cb6d10877d7')
    expect(valueRlp).to.eq('0x945fb30336a8d0841cf15d452afa297cb6d10877d7')
    expect(lengthPrefix).to.eq('0x94')

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true
  })

  it('should verify SLOT2', async () => {
    const slot = 2
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq(
      '0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(valueRlp).to.eq(
      '0xa0825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(lengthPrefix).to.eq('0xa0')

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true
  })

  it('should verify SLOT3', async () => {
    const slot = 3
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0x407ef388ae4cde1f592306c95')
    expect(valueRlp).to.eq('0x8d0407ef388ae4cde1f592306c95')
    expect(lengthPrefix).to.eq('0x8d')

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true
  })

  it('unable to verify SLOT3 with fixed length prefix', async () => {
    const slot = 3
    const { key, value, proof, hash } = await getStorageProof(storage, slot)

    const lengthPrefix = '0xa0'
    const valueRlp = lengthPrefix + stripZerosLeft(toBeHex(value)).slice(2)

    expect(value).to.eq('0x407ef388ae4cde1f592306c95')
    expect(valueRlp).to.eq('0xa00407ef388ae4cde1f592306c95')

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.false
  })

  it('unable to verify SLOT3 with fixed length prefix', async () => {
    const slot = 3
    const { key, value, proof, hash } = await getStorageProof(storage, slot)

    const lengthPrefix = '0xa0'
    const valueRlp = lengthPrefix + zeroPadValue(toBeHex(value), 32).slice(2)

    expect(value).to.eq('0x407ef388ae4cde1f592306c95')
    expect(valueRlp).to.eq(
      '0xa0000000000000000000000000000000000000000407ef388ae4cde1f592306c95',
    )

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.false
  })

  it('unable to encode odd number bytes SLOT3', async () => {
    const slot = 3
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    expect(value).to.eq('0x407ef388ae4cde1f592306c95')
    try {
      const valueRlp = encodeRlp(toBeHex(stripZerosLeft(value)))
    } catch {
      console.log('Crashed')
    }
  })
})
