import { run } from 'hardhat'
import { ethers } from 'ethers'
import { Chain, Hex, zeroAddress } from 'viem'
import { DeployNetworkConfig } from './deloyProtocol'
import { networks as mainnetNetworks } from '../config/mainnet/config'
import { networks as sepoliaNetworks } from '../config/testnet/config'
import {
  optimism,
  optimismSepolia,
  arbitrum,
  base,
  polygon,
  arbitrumSepolia,
  baseSepolia,
  polygonAmoy,
} from '@alchemy/aa-core'
import { mantle, mantleSepoliaTestnet } from 'viem/chains'
export function isZeroAddress(address: Hex): boolean {
  return address === zeroAddress
}

export async function waitBlocks(
  provider: ethers.Provider,
  blocks: number = 5,
) {
  const tillBlock = (await provider.getBlockNumber()) + blocks
  await new Promise<void>((resolve) => {
    provider.on('block', (blockNumber) => {
      if (blockNumber === tillBlock) {
        console.log(
          `finished block ${blockNumber}, after waiting for ${blocks} blocks`,
        )
        resolve()
      }
    })
  })
}

type AsyncFunction = () => Promise<any>

/**
 * This method waits on a function to return a non-falsy value for a certain number of blocks
 *
 * @param func the asyn function to call
 * @param options options for the waitBlocks function
 * @returns the result of the function
 */
export async function retryFunction(
  func: AsyncFunction,
  provider: ethers.Provider,
  ops: { blocks: number } = { blocks: 25 },
) {
  const maxWaitBlock = (await provider.getBlockNumber()) + ops.blocks
  let ans
  let err: Error = new Error('waiting on function failed')
  while (!ans) {
    try {
      ans = await func()
      if (ans) {
        return ans
      }
    } catch (e: any) {
      err = e as any
    }
    const currentBlock = await provider.getBlockNumber()
    if (currentBlock >= maxWaitBlock) {
      console.log('Reached maximum wait time at block: ', currentBlock)
      break
    }
  }
  console.log('Error waiting on function: ', err)
}

export async function verifyContract(
  provider: ethers.Provider,
  contractName: string,
  address: Hex,
  args: any[],
) {
  // wait for 60 for the api endpoint to sync with the rpc
  await waitSeconds(60)
  try {
    await retryFunction(async () => {
      const code = await provider.getCode(address)
      if (code.length > 3) {
        console.log(`${address} has code:`, code.substring(0, 10) + '...')
        return code
      }
      await waitBlocks(provider)
    }, provider)
    await run('verify:verify', {
      address,
      constructorArguments: args,
    })
    console.log(`${contractName} verified at:`, address)
    return await provider.getCode(address)
  } catch (e) {
    console.log(`Error verifying ${contractName}: `, e)
  }
}

/**
 * Checks if the storage prover is supported on a network
 * @param network the network to check
 * @returns
 */
export function proverSupported(network: string): boolean {
  const unsupported =
    network.includes('polygon') || network.includes('arbitrum')
  return !unsupported
}

export async function waitSeconds(seconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, seconds * 1000)
  })
}

export function getDeployNetwork(networkName: string): DeployNetworkConfig {
  // mainnet
  switch (networkName) {
    case 'base':
      return mainnetNetworks.base
    case 'optimism':
      return mainnetNetworks.optimism
    case 'helix':
      return mainnetNetworks.helix
    case 'arbitrum':
      return mainnetNetworks.arbitrum
    case 'mantle':
      return mainnetNetworks.mantle
    case 'polygon':
      return mainnetNetworks.polygon
  }

  // sepolia
  switch (networkName) {
    case 'baseSepolia':
      return sepoliaNetworks.baseSepolia
    case 'optimismSepolia':
      return sepoliaNetworks.optimismSepolia
    case 'optimismSepoliaBlockscout':
      return sepoliaNetworks.optimismSepolia
    case 'ecoTestnet':
      return sepoliaNetworks.ecoTestnet
    case 'arbitrumSepolia':
      return sepoliaNetworks.arbitrumSepolia
    case 'mantleSepolia':
      return sepoliaNetworks.mantleSepolia
    case 'polygonSepolia':
      return sepoliaNetworks.polygonSepolia
  }
  throw new Error('Network not found')
}

export function getDeployChainConfig(chain: Chain): DeployNetworkConfig {
  // mainnet
  switch (chain) {
    case base:
      return mainnetNetworks.base
    case optimism:
      return mainnetNetworks.optimism
    // case 'helix':
    //   return mainnetNetworks.helix
    case arbitrum:
      return mainnetNetworks.arbitrum
    case mantle:
      return mainnetNetworks.mantle
    case polygon:
      return mainnetNetworks.polygon
  }

  // sepolia
  switch (chain) {
    case baseSepolia:
      return sepoliaNetworks.baseSepolia
    case optimismSepolia:
      return sepoliaNetworks.optimismSepolia
    // case 'ecoTestnet':
    //   return sepoliaNetworks.ecoTestnet
    case arbitrumSepolia:
      return sepoliaNetworks.arbitrumSepolia
    case mantleSepoliaTestnet:
      return sepoliaNetworks.mantleSepolia
    case polygonAmoy:
      return sepoliaNetworks.polygonSepolia
  }
  throw new Error('Network not found')
}
