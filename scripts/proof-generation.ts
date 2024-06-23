import hre from 'hardhat'
// import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'

// const L1_NETWORK = 'sepolia'
const L2_NETWORK = 'baseSepolia'

// this is the address on sepolia (L1) where Base Sepolia's l2 state is posted --> L2 output oracle
// const baseOutputContractAddress = '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254' // sepolia address

// const txToProve =
//   '0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee'
// const inboxContract = '0xa506283526A6948619Ac101f0ee7d21a86FcBEDA'
// const intentHash =
//   '0xaac8c197b419c8be5545949d5a1a6dc3514dd018dabd603f0e3c9006dec55105'
// const storageSlot = hre.ethers.solidityPackedKeccak256(
//   ['bytes'],
//   [
//     hre.ethers.AbiCoder.defaultAbiCoder().encode(
//       ['bytes32', 'uint256'],
//       [intentHash, 0],
//     ),
//   ],
// )

async function main() {
  hre.changeNetwork(L2_NETWORK)
  // const txDetails = await hre.ethers.provider.getTransaction(txToProve)
  // const txBlock = txDetails.blockNumber

  //   hre.changeNetwork(L1_NETWORK)
  //   const baseOutputContract = hre.ethers.ContractFactory.fromSolidity(
  //     L2OutputArtifact,
  //     (await hre.ethers.getSigners())[0],
  //   ).attach(baseOutputContractAddress)
  //   const outputIndex =
  //     await baseOutputContract.functions.getL2OutputIndexAfter(txBlock)
  //   const outputData = (
  //     await baseOutputContract.functions.getL2OutputAfter(txBlock)
  //   )[0]
  //   const l2EndBatchBlock = outputData.l2BlockNumber.toHexString()
  //   // eslint-disable-next-line no-unused-vars
  //   const outputRoot = outputData.outputRoot

  //   hre.changeNetwork(L2_NETWORK)
  //   const l2OutputStorageRoot = (
  //     await hre.ethers.provider.send('eth_getBlockByNumber', [
  //       l2EndBatchBlock,
  //       false,
  //     ])
  //   ).stateRoot
  //   const proof = await hre.ethers.provider.send('eth_getProof', [
  //     inboxContract,
  //     [storageSlot],
  //     l2EndBatchBlock,
  //   ])

  //   const balance =
  //     proof.balance === '0x0'
  //       ? '0x'
  //       : // eslint-disable-next-line no-self-compare
  //         proof.balance.length & (1 === 1)
  //         ? hre.ethers.zeroPadBytes(proof.balance, 1)
  //         : proof.balance
  //   const nonce =
  //     proof.nonce === '0x0'
  //       ? '0x'
  //       : // eslint-disable-next-line no-self-compare
  //         proof.nonce.length & (1 === 1)
  //         ? hre.ethers.zeroPadBytes(proof.nonce, 1)
  //         : proof.nonce

  //   const proveIntentParams = [
  //     proof.storageProof[0].value,
  //     inboxContract,
  //     intentHash,
  //     outputIndex - 1, // see comment in contract
  //     proof.storageProof[0].proof,
  //     hre.ethers.encodeRlp([nonce, balance, proof.storageHash, proof.codeHash]),
  //     proof.accountProof,
  //     l2OutputStorageRoot,
  //   ]
  //   console.log(proveIntentParams)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
