import * as dotenv from 'dotenv'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

import '@nomiclabs/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import 'solidity-docgen'

dotenv.config()

const privateKey = process.env.PRIVATE_KEY || '0x' + '11'.repeat(32) // this is to avoid hardhat error
const apiKey = process.env.RPCKEY || ''
const etherscanKey = process.env.ETHERSCAN_API_KEY || ''

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            // details: {
            //   yulDetails: {
            //     optimizerSteps: "u",
            //   },
            // },
            // runs: 4294967295,
          },
          // viaIR: true,
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
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${apiKey}`,
        blockNumber: 18772535
      }
    },
    goerli: {
      chainId: 5,
      url: `https://goerli.infura.io/v3/${apiKey}`,
      accounts: [privateKey],
    },
    sepolia: {
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${apiKey}`,
      accounts: [privateKey],
    },
    mainnet: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${apiKey}`,
      accounts: [privateKey],
      gasPrice: 10000000000
    },
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
  etherscan: {
    apiKey: {
      mainnet: etherscanKey,
      goerli: etherscanKey,
      sepolia: etherscanKey,
    },
  },
}

export default config
