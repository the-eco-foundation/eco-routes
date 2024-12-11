import {
  optimism,
  optimismSepolia,
  arbitrum,
  base,
  polygon,
  arbitrumSepolia,
  baseSepolia,
  zora,
} from '@alchemy/aa-core'
import { Chain, mantle, mantleSepoliaTestnet } from 'viem/chains'

// Mainnet chains
export const mainnetDep: Chain[] = [
  arbitrum,
  base,
  mantle,
  optimism,
  polygon,

  // lol
  zora,
] as any

// Test chains
export const sepoliaDep: Chain[] = [
  // arbitrumSepolia,
  baseSepolia,
  // mantleSepoliaTestnet,
  // optimismSepolia,
] as any

/**
 * The chains to deploy from {@link ProtocolDeploy}
 */
// export const DeployChains = [sepoliaDep, mainnetDep].flat() as Chain[]
export const DeployChains = [sepoliaDep].flat() as Chain[]
