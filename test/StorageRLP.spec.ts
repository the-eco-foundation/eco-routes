import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  AbiCoder,
  encodeRlp,
  encodeBytes32String,
  getAddress,
  keccak256,
  toBeHex,
  solidityPackedKeccak256,
  stripZerosLeft,
  zeroPadValue,
} from 'ethers'

// Connect to local Ethereum node
const provider = new ethers.JsonRpcProvider('http://localhost:8545')
const account0Pk =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const signer = new ethers.Wallet(account0Pk, provider)

async function setupContracts() {
  //   const proverFactory = (await ethers.getContractFactory('Prover')).connect(
  //     signer,
  //   )
  // //   const prover = await proverFactory.deploy([])
  // //   await prover.deploymentTransaction().wait()

  const storageFactory = (
    await ethers.getContractFactory('SimpleStorage')
  ).connect(signer)
  const storage = await storageFactory.deploy()
  await storage.deploymentTransaction().wait()

  return { storage }
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

async function verifyStorageProofRootClaim(prover, key, valueRlp, proof, hash) {
  try {
    await prover.proveStorageRootClaim(key, valueRlp, proof, hash)
    return true
  } catch (error) {
    console.error(`Error verifying key ${key}:`, error)
    return false
  }
}

async function verifyStorageProofGameId(prover, key, valueRlp, proof, hash) {
  try {
    await prover.proveStorageGameId(key, valueRlp, proof, hash)
    return true
  } catch (error) {
    console.error(`Error verifying key ${key}:`, error)
    return false
  }
}

async function verifyStorageProofClaimant(prover, key, valueRlp, proof, hash) {
  try {
    await prover.proveStorageClaimant(key, valueRlp, proof, hash)
    return true
  } catch (error) {
    console.error(`Error verifying key ${key}:`, error)
    return false
  }
}

describe('Prover Storage RLP Tests', () => {
  let prover, storage

  before(async () => {
    const contracts = await setupContracts()
    prover = contracts.storage
    storage = contracts.storage
  })

  it('should verify SLOT0 Output Root bytes32', async () => {
    const slot = 0
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq(
      '0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(valueRlp).to.eq(
      '0xa0825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(lengthPrefix).to.eq('0xa0') // 80 + 32 = a0

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofRootClaim(
      prover,
      key,
      toBeHex(
        '0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
      ),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT1 Output Root bytes32 with 4 bytes of leading zeros', async () => {
    const slot = 1
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq(
      '0x51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(valueRlp).to.eq(
      '0x9c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(lengthPrefix).to.eq('0x9c') // 80 + 27 = 9c

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofRootClaim(
      prover,
      key,
      //valueRlp,
      toBeHex(
        '0x0000000051ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
      ),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT4 gameId 24 bytes', async () => {
    const slot = 4
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0xf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95')
    expect(valueRlp).to.eq(
      '0x98f25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(lengthPrefix).to.eq('0x98') // 80 + 24 = 98

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofRootClaim(
      prover,
      key,
      //valueRlp,
      toBeHex('0xf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95'),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT5 gameId 24 bytes with 4 bytes of leading zeros', async () => {
    const slot = 5
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0xb3e9d5835b6d61c407ef388ae4cde1f592306c95')
    expect(valueRlp).to.eq('0x94b3e9d5835b6d61c407ef388ae4cde1f592306c95')
    expect(lengthPrefix).to.eq('0x94') // 80 + 20 = 94

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofRootClaim(
      prover,
      key,
      //valueRlp,
      toBeHex('0x00000000b3e9d5835b6d61c407ef388ae4cde1f592306c95'),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT6 gameId 29 bytes', async () => {
    const slot = 6
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq(
      '0x3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(valueRlp).to.eq(
      '0x9d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(lengthPrefix).to.eq('0x9d') // 80 + 29 = 9d

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofRootClaim(
      prover,
      key,
      //valueRlp,
      toBeHex('0x3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95'),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT7 gameId 29 bytes with 4 bytes of leading zeros', async () => {
    const slot = 7
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0xbdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95')
    expect(valueRlp).to.eq(
      '0x99bdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95',
    )
    expect(lengthPrefix).to.eq('0x99') // 80 + 21 = 99

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofGameId(
      prover,
      key,
      //valueRlp,
      toBeHex('0x00000000bdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95'),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT10 address 20 bytes', async () => {
    const slot = 10
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0x5fb30336a8d0841cf15d452afa297cb6d10877d7')
    expect(valueRlp).to.eq('0x945fb30336a8d0841cf15d452afa297cb6d10877d7')
    expect(lengthPrefix).to.eq('0x94') // 80 + 20 = 94

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofClaimant(
      prover,
      key,
      //valueRlp,
      toBeHex('0x5FB30336A8d0841cf15d452afA297cB6D10877D7'),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })

  it('should verify SLOT11 address 20 bytes with 4 bytes of leading zeroes', async () => {
    const slot = 11
    const { key, value, proof, hash } = await getStorageProof(storage, slot)
    const valueRlp = encodeRlp(stripZerosLeft(toBeHex(value)))
    const lengthPrefix = valueRlp.slice(0, 4)

    expect(value).to.eq('0xa8d0841cf15d452afa297cb6d10877d7')
    expect(valueRlp).to.eq('0x90a8d0841cf15d452afa297cb6d10877d7')
    expect(lengthPrefix).to.eq('0x90') // 80 + 16 = 90

    const valid = await verifyStorageProof(prover, key, valueRlp, proof, hash)
    expect(valid).to.be.true

    const validRaw = await verifyStorageProofClaimant(
      prover,
      key,
      //valueRlp,
      getAddress('0x00000000A8d0841Cf15D452aFA297cb6D10877d7'),
      proof,
      hash,
    )
    expect(validRaw).to.be.true
  })
})
