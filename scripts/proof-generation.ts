import hre, { ethers } from 'hardhat'
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import { Signer, Wallet, providers } from 'ethers'

const L1_NETWORK = 'sepolia'
const L2_NETWORK = 'baseSepolia'
const pk = process.env.PRIVATE_KEY || ''

// this is the address on sepolia (L1) where Base Sepolia's l2 state is posted --> L2 output oracle
const baseOutputContractAddress = '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254' // sepolia address

const txToProve =
  '0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee'
const inboxContract = '0xa506283526A6948619Ac101f0ee7d21a86FcBEDA'
const intentHash =
  '0xaac8c197b419c8be5545949d5a1a6dc3514dd018dabd603f0e3c9006dec55105'
const storageSlot = hre.ethers.utils.solidityKeccak256(
  ['bytes'],
  [
    hre.ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'uint256'],
      [intentHash, 0],
    ),
  ],
)

async function main() {
  await hre.changeNetwork(L2_NETWORK)

  const txDetails = await hre.ethers.provider.getTransaction(txToProve)
  const txBlock = txDetails.blockNumber

  await hre.changeNetwork(L1_NETWORK)
  const provider = new providers.AlchemyProvider('Sepolia')
  //   const signer = (await hre.ethers.getSigners())[0]
  const signer: Signer = new Wallet(pk, provider)

  const baseOutputContract = hre.ethers.ContractFactory.fromSolidity(
    L2OutputArtifact,
    signer,
  ).attach(baseOutputContractAddress)
  console.log(baseOutputContract)

  const outputIndex =
    await baseOutputContract.functions.getL2OutputIndexAfter(txBlock)
  console.log(2)
  const outputData = (
    await baseOutputContract.functions.getL2OutputAfter(txBlock)
  )[0]
  console.log(3)
  const l2EndBatchBlock = outputData.l2BlockNumber.toHexString()
  // eslint-disable-next-line no-unused-vars
  const outputRoot = outputData.outputRoot
  console.log(4)

  hre.changeNetwork(L2_NETWORK)
  const l2OutputStorageRoot = (
    await hre.ethers.provider.send('eth_getBlockByNumber', [
      l2EndBatchBlock,
      false,
    ])
  ).stateRoot
  const proof = await hre.ethers.provider.send('eth_getProof', [
    inboxContract,
    [storageSlot],
    l2EndBatchBlock,
  ])

  const balance =
    proof.balance === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.balance.length & (1 === 1)
        ? hre.ethers.utils.hexZeroPad(proof.balance, 1)
        : proof.balance
  const nonce =
    proof.nonce === '0x0'
      ? '0x'
      : // eslint-disable-next-line no-self-compare
        proof.nonce.length & (1 === 1)
        ? hre.ethers.utils.hexZeroPad(proof.nonce, 1)
        : proof.nonce

  const proveIntentParams = [
    proof.storageProof[0].value,
    inboxContract,
    intentHash,
    outputIndex - 1, // see comment in contract
    proof.storageProof[0].proof,
    hre.ethers.utils.RLP.encode([
      nonce,
      balance,
      proof.storageHash,
      proof.codeHash,
    ]),
    proof.accountProof,
    l2OutputStorageRoot,
  ]
  console.log(proveIntentParams)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
