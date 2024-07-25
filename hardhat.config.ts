import * as dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-viem'
import 'solidity-docgen'
import '@nomicfoundation/hardhat-verify'
dotenv.config()
const DEPLOY_PRIVATE_KEY =
  process.env.DEPLOY_PRIVATE_KEY || '0x' + '11'.repeat(32) // this is to avoid hardhat error
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const L3_DEPLOYER_PK = process.env.L3_DEPLOYER_PK || '0x' + '11'.repeat(32)

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.26',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
    settings: {
      metadata: {
        bytecodeHash: 'none',
      },
      outputSelection: {
        '*': {
          '*': ['metadata', 'storageLayout'],
        },
      },
    },
  },
  networks: {
    sepolia: {
      chainId: 11155111,
      url: `https://sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 500000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    optimismSepolia: {
      chainId: 11155420,
      url: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 500000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    optimismSepoliaBlockscout: {
      chainId: 11155420,
      url: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 500000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    baseSepolia: {
      chainId: 84532,
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    mainnet: {
      chainId: 1,
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    optimism: {
      chainId: 10,
      url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 100000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    base: {
      chainId: 8453,
      url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    L3Caldera: {
      chainId: 471923,
      url: `https://eco-testnet.rpc.caldera.xyz/http`,
      accounts: [L3_DEPLOYER_PK],
    },
  },
  etherscan: {
    apiKey: {
      optimismSepolia: process.env.OPTIMISM_SCAN_API_KEY || '',
      optimismSepoliaBlockscout: process.env.OPTIMISM_BLOCKSCOUT_API_KEY || '',
      baseSepolia: process.env.BASE_SCAN_API_KEY || '',
      optimism: process.env.OPTIMISM_SCAN_API_KEY || '',
      optimisticEthereum: process.env.OPTIMISM_SCAN_API_KEY || '',
      base: process.env.BASE_SCAN_API_KEY || '',
      L3Caldera: 'nonEmptyString',
    },
    customChains: [
      {
        network: 'optimismSepolia',
        chainId: 11155420,
        urls: {
          apiURL: 'https://api-sepolia-optimism.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io',
        },
      },
      {
        network: 'optimismSepoliaBlockscout',
        chainId: 11155420,
        urls: {
          apiURL: 'https://optimism-sepolia.blockscout.com/api',
          browserURL: 'https://optimism-sepolia.blockscout.com/',
        },
      },
      {
        network: 'L3Caldera',
        chainId: 471923,
        urls: {
          apiURL: 'https://eco-testnet.explorer.caldera.xyz/api',
          browserURL: 'https://eco-testnet.explorer.caldera.xyz/',
        },
      },
    ],
  },
  mocha: {
    timeout: 50000,
  },
  docgen: {
    outputDir: 'docs/solidity',
    templates: './templates',
    theme: 'markdown',
    // pages: 'single',
    // pages: 'items',
    pages: 'files',
    // exclude: ['governance/community'],
    collapseNewlines: true,
    pageExtension: '.md',
  },
  gasReporter: {
    enabled: !!process.env.ENABLE_GAS_REPORT,
    currency: 'USD',
    gasPrice: 100,
    outputFile: process.env.CI ? 'gas-report.txt' : undefined,
  },
}

export default config
