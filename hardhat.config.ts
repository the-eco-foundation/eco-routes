import * as dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-viem'
import 'solidity-docgen'

dotenv.config()
const DEPLOY_PRIVATE_KEY = process.env.PRIVATE_KEY || '0x' + '11'.repeat(32) // this is to avoid hardhat error
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

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
    optimismMainnet: {
      chainId: 10,
      url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 100000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    mainnetOptimismBlockscout: {
      chainId: 10,
      url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 100000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    optimismGoerli: {
      chainId: 420,
      url: `https://opt-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 500000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    optimismSepolia: {
      chainId: 11155420,
      url: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 500000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    sepoliaOptimismBlockscout: {
      chainId: 11155420,
      url: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      gasPrice: 500000000,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    baseGoerli: {
      chainId: 84531,
      url: `https://base-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    baseSepolia: {
      chainId: 84532,
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    baseMainnet: {
      chainId: 8453,
      url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    ethGoerli: {
      chainId: 5,
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
    ethMainnet: {
      chainId: 1,
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [DEPLOY_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      optimism: process.env.OPTIMISM_ETHERSCAN_API_KEY || '',
      goerliOptimism: process.env.OPTIMISM_ETHERSCAN_API_KEY || '',
      mainnetOptimismBlockscout:
        process.env.MAINNET_OPTIMISM_BLOCKSCOUT_API_KEY || '',
      sepoliaOptimism: process.env.OPTIMISM_ETHERSCAN_API_KEY || '',
      sepoliaOptimismBlockscout:
        process.env.SEPOLIA_OPTIMISM_BLOCKSCOUT_API_KEY || '',
      baseMainnet: process.env.BASE_SCAN_API_KEY || '',
      baseGoerli: process.env.BASE_SCAN_API_KEY || '',
      baseSepolia: process.env.BASE_SCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'optimism',
        chainId: 10,
        urls: {
          apiURL: 'https://api-optimistic.etherscan.io/api',
          browserURL: 'https://optimism.etherscan.io',
        },
      },
      {
        network: 'goerliOptimism',
        chainId: 420,
        urls: {
          apiURL: 'https://api-goerli-optimism.etherscan.io/api',
          browserURL: 'https://goerli-optimism.etherscan.io',
        },
      },
      {
        network: 'sepoliaOptimism',
        chainId: 11155420,
        urls: {
          apiURL: 'https://api-sepolia-optimism.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io',
        },
      },
      {
        network: 'sepoliaOptimismBlockscout',
        chainId: 11155420,
        urls: {
          apiURL: 'https://optimism-sepolia.blockscout.com/api',
          browserURL: 'https://optimism-sepolia.blockscout.com/',
        },
      },
      {
        network: 'mainnetOptimismBlockscout',
        chainId: 10,
        urls: {
          apiURL: 'https://optimism.blockscout.com/api',
          browserURL: 'https://optimism.blockscout.com/',
        },
      },
      {
        network: 'baseGoerli',
        chainId: 84531,
        urls: {
          apiURL: 'https://api-goerli.basescan.org/api',
          browserURL: 'https://goerli.basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'baseMainnet',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
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
