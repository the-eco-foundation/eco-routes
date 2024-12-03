import { Chain, Hex } from "viem"

async function a(){
  // {
  //   "address": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
  //   "chain": "1",
  //   "files": {
  //     "metadata.json": "{...}",
  //     "SimpleStorage.sol": "pragma solidity ^0.8.0; contract SimpleStorage { function get() public view returns (uint) { return 1; } }"
  //   },
  //   "creatorTxHash": "0xbc2f0848023b6a4b89dd049dadc551428a8e95153bc70d9eee6c14ec843f0a98",
  //   "chosenContract": "0"
  // }
}
//https://github.com/Aniket-Engg/sol-verifier
//https://docs.sourcify.dev/docs/api/#/Stateless%20Verification/post_verify
//https://github.com/k1rill-fedoseev/sourcify-to-etherscan/blob/master/src/etherscan.ts
export async function verifyContract(chain: Chain, address: Hex, contractName: string, abi: string, bytecode: string, constructorArgs: any[]) {
  const verificationPayload = {
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: address,
    sourceCode: JSON.stringify({
      language: 'Solidity',
      sources: { [`${contractName}.sol`]: { content: bytecode } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      },
    }),
    constructorArguments: constructorArgs.map(String).join(''),
  }
  const url = chain.blockExplorers?.default.apiUrl
  if (!url) {
    throw new Error('Block explorer API URL not found')
  }
  const response = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams(verificationPayload),
  })

  const data = await response.json()
  if (data.status === '1') {
    console.log('Verification successful:', data.result)
    return true
  } else {
    console.error('Verification failed:', data.result)
    return false
  }
}