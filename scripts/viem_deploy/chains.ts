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
import { Chain, mantle, mantleSepoliaTestnet } from 'viem/chains'

export const mainnetDep: Chain[] = [
  arbitrum,
  base,
  mantle,
  optimism,
  polygon,
] as any

export const sepoliaDep: Chain[] = [
  // arbitrumSepolia,
  baseSepolia,
  // mantleSepoliaTestnet,
  // optimismSepolia,

  // polygonAmoy,
] as any
