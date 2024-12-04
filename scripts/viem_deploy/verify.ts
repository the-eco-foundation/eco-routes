import { Chain, Hex } from 'viem'
import { promises as fs } from 'fs'
import * as path from 'path'

// async function a() {
//   // {
//   //   "address": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
//   //   "chain": "1",
//   //   "files": {
//   //     "metadata.json": "{...}",
//   //     "SimpleStorage.sol": "pragma solidity ^0.8.0; contract SimpleStorage { function get() public view returns (uint) { return 1; } }"
//   //   },
//   //   "creatorTxHash": "0xbc2f0848023b6a4b89dd049dadc551428a8e95153bc70d9eee6c14ec843f0a98",
//   //   "chosenContract": "0"
//   // }
// }
// https://github.com/Aniket-Engg/sol-verifier
// https://docs.sourcify.dev/docs/api/#/Stateless%20Verification/post_verify
// https://github.com/k1rill-fedoseev/sourcify-to-etherscan/blob/master/src/etherscan.ts
// export async function verifyContract(
//   chain: Chain,
//   address: Hex,
//   contractName: string,
//   abi: string,
//   bytecode: string,
//   constructorArgs: any[],
// ) {
//   const verificationPayload = {
//     module: 'contract',
//     action: 'verifysourcecode',
//     contractaddress: address,
//     sourceCode: JSON.stringify({
//       language: 'Solidity',
//       sources: { [`${contractName}.sol`]: { content: bytecode } },
//       settings: {
//         optimizer: { enabled: true, runs: 200 },
//         outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
//       },
//     }),
//     constructorArguments: constructorArgs.map(String).join(''),
//   }
//   const url = chain.blockExplorers?.default.apiUrl
//   if (!url) {
//     throw new Error('Block explorer API URL not found')
//   }
//   const response = await fetch(url, {
//     method: 'POST',
//     body: new URLSearchParams(verificationPayload),
//   })

//   const data = await response.json()
//   if (data.status === '1') {
//     console.log('Verification successful:', data.result)
//     return true
//   } else {
//     console.error('Verification failed:', data.result)
//     return false
//   }
// }
const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/api'
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY as Hex
const OUTPUT_DIR = path.join(__dirname, '../../artifacts/build-info')
export type VerifyContractType = {
  chainId: number
  codeformat: 'solidity-standard-json-input' | 'solidity-single-file'
  // sourceCode: string
  constructorArguements: string
  contractname: string
  contractaddress: Hex
  contractFilePath: string
  creatorTxHash: Hex
  // compilerversion: string
}
export async function verifyContract(ver: VerifyContractType) {
  if (!ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY not found')
  }

  // // query ETH balances on Arbitrum, Base and Optimism
  // const chains = [42161, 8453, 10]
  console.log('Current directory:', __dirname)
  console.log('Artifact Output directory:', OUTPUT_DIR)
  // for (const ver of verifies) {
  // const outputData = await parseOutputFile(ver.contractFilePath)
  const outputData = await readOutputFile()

  const metadata = JSON.parse(outputData.output.contracts[ver.contractFilePath][ver.contractname].metadata)
  const version = `v${metadata.compiler.version}`
  const target = Object.entries(metadata.settings.compilationTarget)[0].join(':')
  const sources = Object.entries(outputData.input.sources)
  // .filter(([key,]) => key !== ver.contractFilePath)
  .reduce((acc, [key, value]) => {
    acc[key as string] = { content: (value as any).content }
    return acc
  }, {} as Record<string, { content: string }>)
  // .reduce((acc, [key, value]) => {
  //   acc[key as string] = { content: (value as any).content }
  //   return acc
  // },{})
  const args = ver.constructorArguements
  console.log(target)
  console.log(version)
  console.log(metadata.settings)
  console.log(Object.keys(sources).length)
  console.log(args)
  const standardJson = {
    language: metadata.language,
    sources: sources,
    settings: {
      viaIR: metadata.settings.viaIR,
      optimizer: metadata.settings.optimizer,
      evmVersion: metadata.settings.evmVersion,
      remappings: metadata.settings.remappings,
      libraries: metadata.settings.libraries
    }
  }
  // ?chainid=1
  //  &module=contract
  //  &action=verifysourcecode
  //  &apikey=YourApiKeyToken
  const body = {
    chainId: `${ver.chainId}`,
    // module: 'contract',
    // action: 'verifysourcecode',
    // apikey: ETHERSCAN_API_KEY,
    contractaddress: ver.contractaddress,
    sourceCode: JSON.stringify(standardJson),
    codeformat: 'solidity-standard-json-input',
    contractname: target,
    compilerversion: version,
    constructorArguements: args
  }

  const str = new URLSearchParams(body).toString()
  console.log(str)
  try {
    const urlparam = {
      chainid: `${ver.chainId}`,
      module: 'contract',
      action: 'verifysourcecode',
      apikey: ETHERSCAN_API_KEY,
    }
    const addParams = new URLSearchParams(urlparam).toString()
    const url = ETHERSCAN_V2_API_URL + '?' + addParams
    const result = await fetch(url, {
      method: 'POST',
      body: str,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }
    })
    // const result = await fetch(ETHERSCAN_V2_API_URL, {
    //   method: 'POST',
    //   body: JSON.stringify(body),
    //   headers: { 'Content-Type': 'application/json' }
    // })
    const res = await result.json()

    console.log(res)
  } catch (e) {
    console.error(e)
  }


  // endpoint accepts one chain at a time, loop for all your chains
  //   const query = await fetch(`https://api.etherscan.io/v2/api
  //  ?chainid=${ver.chainId}
  //  &module=contract
  //  &action=verifysourcecode
  //  &apikey=${ETHERSCAN_API_KEY}`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Accept': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       chainId: ver.chainId,
  //       codeformat: 'solidity-standard-json-input',
  //       sourceCode: outputData.toString(),
  //       // constructorArguements: ver.constructorArguements,
  //       contractaddress: ver.contractaddress,
  //       contractname: ver.contractFilePath,
  //       // compilerversion: outputData.compilerversion,
  //     })
  //   })
  // const meta = outputData.output.contracts[ver.contractFilePath][ver.contractname].metadata.toString()
  // const query = await fetch(`https://sourcify.dev/server/verify`, {
  //   method: 'POST',
  //   headers:
  //   {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     address: ver.contractaddress,
  //     chain: ver.chainId.toString(),
  //     files: {
  //       "metadata.json": meta,
  //     },
  //     creatorTxHash: ver.creatorTxHash,
  //     // chosenContract: 'a',
  //   })
  //   //     "address": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
  //   // "chain": "1",
  //   // "files": {
  //   //   "metadata.json": "{...}",
  //   //   "SimpleStorage.sol": "pragma solidity ^0.8.0; contract SimpleStorage { function get() public view returns (uint) { return 1; } }"
  //   // },
  //   // "creatorTxHash": "0xbc2f0848023b6a4b89dd049dadc551428a8e95153bc70d9eee6c14ec843f0a98",
  //   // "chosenContract": "0"
  // })

  // const response = await query.json()
  // if (response) {
  //   console.error('Error:', response)
  //   return
  // }

  // const balance = response.result
  // console.log(balance)
  // }
}
// import hre from "hardhat";
// export async function verifyContract(verif: VerifyContractType) {
//   const outputData = await readOutputFile()
//   // const outputData = await hre.artifacts.getBuildInfo('contracts/Prover.sol:Prover')
//   const url = 'https://sourcify.dev/server/'
//   // const urlVerify = 'https://sourcify.dev/server/verify'
//   try {
//     /// get contract index from output of buildinfo
//     let index
//     if (outputData) {
//       // index = getObjectKeyIndex(buildinfo.output.contracts, config.sourceName)
//       console.log(Object.keys(outputData.output.contracts))
//       index = Object.keys(outputData.output.contracts).indexOf(
//         verif.contractFilePath
//       )
//       console.log("chosen contract", index)
//     } else {
//       // throw error
//     }
//     const address = verif.contractaddress
//     const metadataString = JSON.stringify(outputData)
//     try {
//       const checkResponse = await axios.get(
//         `${url}checkByAddresses?addresses=${address.toLowerCase()}&chainIds=${verif.chainId}`
//       )
//       const { data: checkData } = checkResponse
//       console.log(checkData[0].status)
//       // if (checkData[0].status === "perfect") {
//       //   console.log(`already verified: ${verif.contractFilePath} (${address}), skipping.`)
//       //   return
//       // }
//     } catch (e) {
//       console.error(
//         ((e as any).response && JSON.stringify((e as any).response.data)) || e
//       )
//     }

//     if (!metadataString) {
//       console.error(
//         `Contract ${verif.contractFilePath} was deployed without saving metadata. Cannot submit to sourcify, skipping.`
//       )
//       return
//     }

//     const formData = new FormData()
//     formData.append("address", address)
//     formData.append("chain", verif.chainId)
//     formData.append("chosenContract", index)
//     // formData.append("creatorTxHash", index)

//     const fileStream = new Readable()
//     const file = await getFirstJsonFile()
//     fileStream.push(metadataString)
//     fileStream.push(null)
//     formData.append("files", fileStream, file || 'metadata.json')

//     try {
//       const submissionResponse = await axios.post(url, formData, {
//         headers: formData.getHeaders(),
//       })
//       if (submissionResponse.data.result[0].status === "perfect") {
//         console.log(` => contract ${verif.contractFilePath} is now verified`)
//       } else {
//         console.error((` => contract ${verif.contractFilePath} is not verified`))
//       }
//     } catch (e) {
//       //   if (config && config.writeFailingMetadata) {
//       //     const failingMetadataFolder = path.join('failing_metadata', "3");
//       //     fs.ensureDirSync(failingMetadataFolder);
//       //     fs.writeFileSync(
//       //       path.join(failingMetadataFolder, `${name}_at_${address}.json`),
//       //       metadataString
//       //     );
//       //   }
//       console.error(
//         ((e as any).response && JSON.stringify((e as any).response.data)) || e
//       )
//     }

//     // const meta = outputData.output.contracts[verif.contractFilePath][verif.contractname].metadata.toString()
//     // const solFile = outputData.input.sources[verif.contractFilePath].content.toString()
//     // // Create form data for the request
//     // const formData = new FormData()
//     // const contractKey = `files[${verif.contractFilePath}]`
//     // formData.append("address", verif.contractaddress)
//     // formData.append("chain", verif.chainId.toString())
//     // formData.append("files[metadata.json]", meta)
//     // formData.append(contractKey, solFile)
//     // for (const source in outputData.input.sources) {
//     //   const path = `files[${source}]`

//     //   if (contractKey === path) {
//     //     console.log('Skipping contract file')
//     //     continue
//     //   }
//     //   formData.append(`files[${source}]`, outputData.input.sources[source].content.toString())
//     // }
//     // formData.append('chosenContract', '0')
//     // // {
//     // //         address: ver.contractaddress,
//     // //         chain: ver.chainId.toString(),
//     // //         files: {
//     // //           "metadata.json": meta,
//     // //         },
//     // //         creatorTxHash: ver.creatorTxHash,
//     // //         // chosenContract: 'a',
//     // //       }
//     // // Send the POST request to Sourcify's verify endpoint
//     // const response = await axios.post("https://sourcify.dev/server/verify", formData, {
//     //   headers: {
//     //     ...formData.getHeaders(),
//     //   },
//     // })

//     // // Handle the response
//     // if (response.data) {
//     //   console.log("Response from Sourcify:", response.data)
//     // } else {
//     //   console.log("Verification failed with no response.")
//     // }
//   } catch (error) {
//     console.error("Error verifying contract:", error)
//   }

// }


export async function checkVerifyStatus(ver: VerifyContractType){
  const guid = 'vlwuwesge63bzjeqzvfrmddxtw1bibdpuvjvebdatayd1axdds'

  try {
    const urlparam = {
      chainid: `${ver.chainId}`,
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid,
      apikey: ETHERSCAN_API_KEY,
    }
    const addParams = new URLSearchParams(urlparam).toString()
    const url = ETHERSCAN_V2_API_URL + '?' + addParams
    const result = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }
    })
    // const result = await fetch(ETHERSCAN_V2_API_URL, {
    //   method: 'POST',
    //   body: JSON.stringify(body),
    //   headers: { 'Content-Type': 'application/json' }
    // })
    const res = await result.json()

    console.log(res)
  } catch (e) {
    console.error(e)
  }
  
 
}

async function parseOutputFile(filePath: string): Promise<{ compilerversion: string, sourceCode: string }> {
  const data = await readOutputFile()

  return {
    compilerversion: data.solcLongVersion,
    sourceCode: data.input.sources[filePath].content
  }
}

async function readOutputFile(): Promise<any> {
  const filePath = await getFirstJsonFile()
  if (!filePath) {
    throw new Error('No JSON file found in directory')
  }
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading JSON file:', error)
    throw error
  }
}


async function getFirstJsonFile(): Promise<string | null> {
  try {
    const files = await fs.readdir(OUTPUT_DIR)
    for (const file of files) {
      if (path.extname(file) === '.json') {
        return path.join(OUTPUT_DIR, file)
      }
    }
    return null
  } catch (error) {
    console.error('Error reading directory:', error)
    throw error
  }
}