import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'

// settlement chain, mainnet
const sourceId = 1

export const helix = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: 1923,
  name: 'Swell',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://swell-mainnet.alt.technology'],
      webSocket: ['wss://swell-mainnet.alt.technology/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Swell Chain Explorer',
      url: 'https://explorer.swellnetwork.io',
      apiUrl: 'https://explorer.swellnetwork.io/api/v2',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sourceId]: {
        address: '0x87690676786cDc8cCA75A472e483AF7C8F2f0F57',
      },
    },
    l2OutputOracle: {
      [sourceId]: {
        address: '0x0000000000000000000000000000000000000001',
      },
    },
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
    portal: {
      [sourceId]: {
        address: '0x758E0EE66102816F5C3Ec9ECc1188860fbb87812',
      },
    },
    l1StandardBridge: {
      [sourceId]: {
        address: '0x7aA4960908B13D104bf056B23E2C76B43c5AACc8',
      },
    },
  },
  sourceId,
})
