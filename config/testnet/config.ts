import { zeroAddress } from 'viem'
import { DeployNetwork } from '../../scripts/deloyProtocol'

/* eslint-disable no-magic-numbers */
import { ethers } from 'hardhat'

const networkIds: any = {
  noChain: 0,
  sepolia: 11155111,
  optimismSepolia: 11155420,
  baseSepolia: 84532,
  ecoTestnet: 471923,
  arbitrumSepolia: 421614,
  mantleSepolia: 5003,
  0: 'noChain',
  11155111: 'sepolia',
  11155420: 'optimismSepolia',
  84532: 'baseSepolia',
  471923: 'ecoTestnet',
  421614: 'arbitrumSepolia',
  5003: 'mantleSepolia',
}

const actors: any = {
  deployer: '0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4',
  intentCreator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
  solver: '0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E',
  claimant: '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
  prover: '0x923d4fDfD0Fb231FDA7A71545953Acca41123652',
  recipient: '0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9',
}

const provingMechanisms: any = {
  Self: 0, // Destination is Self
  Settlement: 1, // Source Chain is an L2, Destination is A L1 Settlement Chain
  SettlementL3: 2, // Source Chain is an L3, Destination is a L2 Settlement Chain
  Bedrock: 3, // Source Chain is an L2, Destination Chain is an L2 using Bedrock
  Cannon: 4, // Source Chain is an L2, Destination Chain is an L2 using Cannon
  HyperProver: 5, // Source Chain is an L2 Destination Chain is an L2 using HyperProver
  ArbitrumNitro: 6, // Source Chain is an L2 Destination Chain is an L2 using Arbitrum Nitro
  0: 'Self',
  1: 'Settlement',
  2: 'SettlementL3',
  3: 'Bedrock',
  4: 'Cannon',
  5: 'HyperProver',
  6: 'ArbitrumNitro',
}

const settlementTypes: any = {
  Finalized: 0,
  Posted: 1,
  Confirmed: 2,
  0: 'Finalized', // Finalized on Settlement Chain
  1: 'Posted', // Posted to Settlement Chain
  2: 'Confirmed', // Confirmed Locally
}

// Note intents currently being used are for USDC with a common set of actors
// the other data coming from the network
// Here we store a minimal set of addtional fieds
const intent: any = {
  rewardAmounts: [1001],
  targetAmounts: [1000],
  duration: 3600,
}

const networks: any = {
  sepolia: {
    network: networkIds[11155111],
    chainId: networkIds.sepolia,
    alchemyNetwork: 'sepolia',
    proving: {
      mechanism: provingMechanisms.Settlement,
      l1BlockAddress: ethers.ZeroAddress,
      l2l1MessageParserAddress: ethers.ZeroAddress,
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'sepolia',
        id: networkIds.sepolia,
        contract: ethers.ZeroAddress,
      },
      provingTimeSeconds: 36,
      finalityDelaySeconds: 0,
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      optimismSepolia: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1', // optimismSepolia Dispute Game Factory
      baseSepolia: '0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1', // baseSepolia Dispute Game Factory
      mantleSepolia: '0x4121dc8e48Bc6196795eb4867772A5e259fecE07',
      // arbitrumSepolia: '0xd80810638dbDF9081b72C1B33c65375e807281C8', // arbitrumSepolia Rollup Admin Contract
    },
  },
  optimismSepolia: {
    network: networkIds[11155420],
    chainId: networkIds.optimismSepolia,
    alchemyNetwork: 'optimism-sepolia',
    sourceChains: ['baseSepolia', 'ecoTestnet', 'mantleSepolia'],
    proverContract: {
      address: '0x39F49d1ac7A6EE02e0dFE0B9E431b1B8751177c3',
      deploymentBlock: 16795390n, // '0x10046Fe'
    },
    intentSource: {
      address: '0x62a2324Fa89C44625d1152e362600Fa20b439a10',
      deploymentBlock: 16795394n, // '0x1004702
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x29a7490df0E44fF69912f0C63f6a379d696292cc',
      deploymentBlock: 18354796n, // '0x118126c
    },
    hyperProverContractAddress: '0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981',
    proving: {
      mechanism: provingMechanisms.Cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'sepolia',
        id: networkIds.sepolia,
        contract: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
      },
      provingTimeSeconds: 302400,
      finalityDelaySeconds: 0,
    },
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    hyperlaneMailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
    gasLimit: 8000000,
  },
  baseSepolia: {
    network: networkIds[84532],
    chainId: networkIds.baseSepolia,
    alchemyNetwork: 'base-sepolia',
    sourceChains: ['optimismSepolia', 'ecoTestnet', 'mantleSepolia'],
    proverContract: {
      address: '0xFA693a838DE0922Bc863a53Ff658D8384EC703FC',
      deploymentBlock: 14812482n, // '0xe20542',
    },
    intentSource: {
      address: '0x62a2324Fa89C44625d1152e362600Fa20b439a10',
      deploymentBlock: 14812485n, // '0xe20545',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x29a7490df0E44fF69912f0C63f6a379d696292cc',
      deploymentBlock: 14812488n, // '0xe20548',
    },
    hyperProverContractAddress: '0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981',
    proving: {
      mechanism: provingMechanisms.Cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'sepolia',
        id: networkIds.sepolia,
        // Dispute Game Factory address
        contract: '0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1',
        // Old L2 Output Oracle Address
        // contract: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
      },
      provingTimeSeconds: 302400,
      finalityDelaySeconds: 604800,
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      ecoTestnet: '0xb3EDAE5AB86f16242018c7cED4fBCabb3c784951', // ecoTestnet L2 Output Oracle
    },
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    hyperlaneMailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
    gasLimit: 8000000,
  },
  ecoTestnet: {
    network: networkIds[471923],
    chainId: networkIds.ecoTestnet,
    alchemyNetwork: 'eco-testnet',
    sourceChains: ['baseSepolia', 'optimismSepolia', 'mantleSepolia'],
    rpcUrl: 'https://eco-testnet.rpc.caldera.xyz/http',
    settlementNetwork: 'baseSepolia',
    proverContract: {
      address: '0x6e54fa98C9292fc1B343F74d67EC2671515c24D2',
      deploymentBlock: '0x35dc32', // 3529778n
    },
    intentSource: {
      address: '0x62a2324Fa89C44625d1152e362600Fa20b439a10',
      deploymentBlock: 3529780n, // '0x35dc34',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x29a7490df0E44fF69912f0C63f6a379d696292cc',
      deploymentBlock: 3529786n, // '0x35dc3a',
    },
    hyperProverContractAddress: '0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981',
    proving: {
      mechanism: provingMechanisms.Bedrock,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'baseSepolia',
        id: 84532,
        contract: '0xb3EDAE5AB86f16242018c7cED4fBCabb3c784951',
      },
      provingTimeSeconds: 3600,
      finalityDelaySeconds: 12,
    },
    usdcAddress: '0xCf4bc4786C11eB28169C7dd7B630d2Ea48856708',
    hyperlaneMailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
    gasLimit: 8000000,
  },
  arbitrumSepolia: {
    network: networkIds[421614],
    chainId: networkIds.arbitrumSepolia,
    alchemyNetwork: 'arbitrum-sepolia',
    sourceChains: [],
    settlementNetwork: networkIds[11155111],
    proverContract: {
      address: '0x39F49d1ac7A6EE02e0dFE0B9E431b1B8751177c3',
      deploymentBlock: 14812482n, // '0xe20542',
    },
    intentSource: {
      address: '0x62a2324Fa89C44625d1152e362600Fa20b439a10',
      deploymentBlock: 14812485n, // '0xe20545',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x29a7490df0E44fF69912f0C63f6a379d696292cc',
      deploymentBlock: 14812488n, // '0xe20548',
    },
    hyperProverContractAddress: '0x45509D6f3020a099456B865deF46807724b39222',
    proving: {
      mechanism: '',
      l1BlockAddress: '',
      l2l1MessageParserAddress: '',
      outputRootVersionNumber: 0,
      settlementChain: {
        network: networkIds[11155111],
        id: networkIds.sepolia,
        // Dispute Game Factory address
        contract: '',
        // Old L2 Output Oracle Address
        // contract: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
      },
      provingTimeSeconds: 302400,
      finalityDelaySeconds: 604800,
    },
    // The following destination chains are useful for proving
    // destinationChains: [
    //   84532, // baseSepolia
    //   11155420, // optimismSepolia
    //   471923, // ecoTestnet
    // ],
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    hyperlaneMailboxAddress: '0xc756cFc1b7d0d4646589EDf10eD54b201237F5e8',
    gasLimit: 8000000,
  },
  mantleSepolia: {
    network: 'mantleSepolia',
    chainId: networkIds.mantleSepolia,
    sourceChains: ['baseSepolia', 'optimismSepolia', 'ecoTestnet'],
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    proverContract: {
      address: '0x39F49d1ac7A6EE02e0dFE0B9E431b1B8751177c3',
      deploymentBlock: 14812482n, // '0xe20542',
    },
    intentSource: {
      address: '0x62a2324Fa89C44625d1152e362600Fa20b439a10',
      deploymentBlock: 14812485n, // '0xe20545',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x29a7490df0E44fF69912f0C63f6a379d696292cc',
      deploymentBlock: 14812488n, // '0xe20548',
    },
    hyperProverContractAddress: '0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981',
    proving: {
      mechanism: provingMechanisms.Bedrock,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      settlementChain: {
        network: networkIds[11155111],
        id: networkIds.sepolia,
        // L2 Output Oracle Address
        contract: '0x4121dc8e48Bc6196795eb4867772A5e259fecE07',
      },
      provingTimeSeconds: 302400,
      finalityDelaySeconds: 604800,
    },
    usdcAddress: '0x26F232C215d535309FDAcCe68340af3c039A452f',
    hyperlaneMailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
    gasLimit: 250000000000,
  },
}

const deploymentConfigs = {
  sepoliaSettlement: {
    chainConfigurationKey: {
      chainId: networkIds.sepolia,
      provingMechanism: provingMechanisms.Settlement, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.sepolia.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.sepolia.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.sepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.sepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.sepolia.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.sepolia.proving.finalityDelaySeconds,
    },
  },
  sepoliaSettlementL3: {
    chainConfigurationKey: {
      chainId: networkIds.sepolia,
      provingMechanism: provingMechanisms.SettlementL3, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.sepolia.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.sepolia.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.sepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.sepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.sepolia.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.sepolia.proving.finalityDelaySeconds,
    },
  },
  baseSepoliaSettlement: {
    chainConfigurationKey: {
      chainId: networkIds.baseSepolia,
      provingMechanism: provingMechanisms.Settlement, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.baseSepolia.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.baseSepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.baseSepolia.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.baseSepolia.proving.finalityDelaySeconds,
    },
  },
  baseSepoliaSelf: {
    chainConfigurationKey: {
      chainId: networkIds.baseSepolia,
      provingMechanism: provingMechanisms.Self, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.baseSepolia.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.baseSepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.baseSepolia.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.baseSepolia.proving.finalityDelaySeconds,
    },
  },
  baseSepoliaCannon: {
    chainConfigurationKey: {
      chainId: networkIds.baseSepolia,
      provingMechanism: provingMechanisms.Cannon, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.baseSepolia.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.baseSepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.baseSepolia.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.baseSepolia.proving.finalityDelaySeconds,
    },
  },
  optimismSepoliaCannon: {
    chainConfigurationKey: {
      chainId: networkIds.optimismSepolia,
      provingMechanism: provingMechanisms.Cannon, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.optimismSepolia.proving.settlementChain.id,
      settlementContract:
        networks.optimismSepolia.proving.settlementChain.contract,
      blockhashOracle: networks.optimismSepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.optimismSepolia.proving.outputRootVersionNumber,
      provingTimeSeconds: networks.optimismSepolia.proving.provingTimeSeconds,
      finalityDelaySeconds:
        networks.optimismSepolia.proving.finalityDelaySeconds,
    },
  },
  ecoTestnetBedrock: {
    chainConfigurationKey: {
      chainId: networkIds.ecoTestnet,
      provingMechanism: provingMechanisms.Bedrock, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.ecoTestnet.proving.settlementChain.id,
      settlementContract: networks.ecoTestnet.proving.settlementChain.contract,
      blockhashOracle: networks.ecoTestnet.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.ecoTestnet.proving.outputRootVersionNumber,
      provingTimeSeconds: networks.ecoTestnet.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.ecoTestnet.proving.finalityDelaySeconds,
    },
  },
  mantleSepoliaBedrock: {
    chainConfigurationKey: {
      chainId: networkIds.mantleSepolia,
      provingMechanism: provingMechanisms.Bedrock, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.mantleSepolia.proving.settlementChain.id,
      settlementContract:
        networks.mantleSepolia.proving.settlementChain.contract,
      blockhashOracle: networks.mantleSepolia.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.mantleSepolia.proving.outputRootVersionNumber,
      provingTimeSeconds: networks.mantleSepolia.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.mantleSepolia.proving.finalityDelaySeconds,
    },
  },
}

const deploymentChainConfigs = {
  baseSepolia: [
    deploymentConfigs.sepoliaSettlement,
    deploymentConfigs.baseSepoliaSelf,
    deploymentConfigs.baseSepoliaCannon,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
    deploymentConfigs.mantleSepoliaBedrock,
  ],
  optimismSepolia: [
    deploymentConfigs.sepoliaSettlement,
    deploymentConfigs.baseSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.mantleSepoliaBedrock,
  ],
  ecoTestnet: [
    deploymentConfigs.sepoliaSettlementL3,
    deploymentConfigs.baseSepoliaSettlement,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
    deploymentConfigs.mantleSepoliaBedrock,
  ],
  mantleSepolia: [
    deploymentConfigs.sepoliaSettlement,
    deploymentConfigs.baseSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.mantleSepoliaBedrock,
  ],
  arbitrumSepolia: [
    deploymentConfigs.sepoliaSettlement,
    deploymentConfigs.baseSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.mantleSepoliaBedrock,
  ],
}

const routes: any = [
  // ecoTestnet to baseSepolia
  {
    source: {
      chainId: networkIds.ecoTestnet,
      providerName: 'ecoTestnetProvider',
      contracts: {
        intentSourceContract: {
          address: networks.ecoTestnet.intentSource.address,
          variableName: 'ecoTestnetIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.ecoTestnet.proverContract.address,
          variableName: 'ecoTestnetProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.baseSepolia,
      providerName: 'baseSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.baseSepolia.inbox.address,
          variableName: 'baseSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.SettlementL3,
        provingState: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.ecoTestnet.usdcAddress,
          variableName: 'ecoTestnetUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // ecoTestnet to optimismSepolia
  {
    source: {
      chainId: networkIds.ecoTestnet,
      providerName: 'ecoTestnetProvider',
      contracts: {
        intentSourceContract: {
          address: networks.ecoTestnet.intentSource.address,
          variableName: 'ecoTestnetIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.ecoTestnet.proverContract.address,
          variableName: 'ecoTestnetProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.optimismSepolia,
      providerName: 'optimismSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.optimismSepolia.inbox.address,
          variableName: 'optimismSepoliaInboxContractSolver',
        },
      },
      provingMechanism: provingMechanisms.Cannon,
      provingState: settlementTypes.finalized,
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.ecoTestnet.usdcAddress,
          variableName: 'ecoTestnetUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // ecoTestnet to mantleSepolia
  {
    source: {
      chainId: networkIds.ecoTestnet,
      providerName: 'ecoTestnetProvider',
      contracts: {
        intentSourceContract: {
          address: networks.ecoTestnet.intentSource.address,
          variableName: 'ecoTestnetIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.ecoTestnet.proverContract.address,
          variableName: 'ecoTestnetProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.mantleSepolia,
      providerName: 'mantleSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.mantleSepolia.inbox.address,
          variableName: 'mantleSepoliaInboxContractSolver',
        },
      },
      provingMechanism: provingMechanisms.Bedrock,
      settlementTypes: settlementTypes.finalized,
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.ecoTestnet.usdcAddress,
          variableName: 'ecoTestnetUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.mantleSepolia.usdcAddress,
          variableName: 'mantleSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // baseSepolia to optimismSepolia
  {
    source: {
      chainId: networkIds.baseSepolia,
      providerName: 'baseSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.baseSepolia.intentSource.address,
          variableName: 'baseSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.baseSepolia.proverContract.address,
          variableName: 'baseSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.optimismSepolia,
      providerName: 'optimismSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.optimismSepolia.inbox.address,
          variableName: 'optimismSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Cannon,
        provingState: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // baseSepolia to ecoTestnet
  {
    source: {
      chainId: networkIds.baseSepolia,
      providerName: 'baseSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.baseSepolia.intentSource.address,
          variableName: 'baseSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.baseSepolia.proverContract.address,
          variableName: 'baseSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.ecoTestnet,
      providerName: 'ecoTestnetProvider',
      contracts: {
        inboxContract: {
          address: networks.ecoTestnet.inbox.address,
          variableName: 'ecoTestnetInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        provingState: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.ecoTestnet.usdcAddress,
          variableName: 'ecoTestnetUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // baseSepolia to mantleSepolia
  {
    source: {
      chainId: networkIds.baseSepolia,
      providerName: 'baseSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.baseSepolia.intentSource.address,
          variableName: 'baseSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.baseSepolia.proverContract.address,
          variableName: 'baseSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.mantleSepolia,
      providerName: 'mantleSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.mantleSepolia.inbox.address,
          variableName: 'mantleSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.mantleSepolia.usdcAddress,
          variableName: 'mantleSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // optimismSepolia to ecoTestnet
  {
    source: {
      chainId: networkIds.optimismSepolia,
      providerName: 'optimismSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.optimismSepolia.intentSource.address,
          variableName: 'optimismSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.optimismSepolia.proverContract.address,
          variableName: 'optimismSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.ecoTestnet,
      providerName: 'ecoTestnetProvider',
      contracts: {
        inboxContract: {
          address: networks.ecoTestnet.inbox.address,
          variableName: 'ecoTestnetInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        provingState: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.ecoTestnet.usdcAddress,
          variableName: 'ecoTestnetUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // optimismSepolia to baseSepolia
  {
    source: {
      chainId: networkIds.optimismSepolia,
      providerName: 'optimismSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.optimismSepolia.intentSource.address,
          variableName: 'optimismSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.optimismSepolia.proverContract.address,
          variableName: 'optimismSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.baseSepolia,
      providerName: 'baseSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.baseSepolia.inbox.address,
          variableName: 'baseSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Cannon,
        provingState: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // optimismSepolia to mantleSepolia
  {
    source: {
      chainId: networkIds.optimismSepolia,
      providerName: 'optimismSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.optimismSepolia.intentSource.address,
          variableName: 'optimismSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.optimismSepolia.proverContract.address,
          variableName: 'optimismSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.mantleSepolia,
      providerName: 'mantleSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.mantleSepolia.inbox.address,
          variableName: 'mantleSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.mantleSepolia.usdcAddress,
          variableName: 'mantleSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // mantleSepolia to ecoTestnet
  {
    source: {
      chainId: networkIds.mantleSepolia,
      providerName: 'mantleSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.mantleSepolia.intentSource.address,
          variableName: 'mantleSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.mantleSepolia.proverContract.address,
          variableName: 'mantleSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.ecoTestnet,
      providerName: 'ecoTestnetProvider',
      contracts: {
        inboxContract: {
          address: networks.ecoTestnet.inbox.address,
          variableName: 'ecoTestnetInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.mantleSepolia.usdcAddress,
          variableName: 'mantleSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.ecoTestnet.usdcAddress,
          variableName: 'ecoTestnetUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // mantleSepolia to baseSepolia
  {
    source: {
      chainId: networkIds.mantleSepolia,
      providerName: 'mantleSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.mantleSepolia.intentSource.address,
          variableName: 'mantleSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.mantleSepolia.proverContract.address,
          variableName: 'mantleSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.baseSepolia,
      providerName: 'baseSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.baseSepolia.inbox.address,
          variableName: 'baseSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Cannon,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.mantleSepolia.usdcAddress,
          variableName: 'mantleSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // mantleSepolia to optimismSepolia
  {
    source: {
      chainId: networkIds.mantleSepolia,
      providerName: 'mantleSepoliaProvider',
      contracts: {
        intentSourceContract: {
          address: networks.mantleSepolia.intentSource.address,
          variableName: 'mantleSepoliaIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.mantleSepolia.proverContract.address,
          variableName: 'mantleSepoliaProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.optimismSepolia,
      providerName: 'optimismSepoliaProvider',
      contracts: {
        inboxContract: {
          address: networks.optimismSepolia.inbox.address,
          variableName: 'optimismSepoliaInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Cannon,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.mantleSepolia.usdcAddress,
          variableName: 'mantleSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
]

export {
  networkIds,
  actors,
  provingMechanisms,
  settlementTypes,
  intent,
  networks,
  deploymentConfigs,
  deploymentChainConfigs,
  routes,
}
