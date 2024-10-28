import { optimism } from '@hyperlane-xyz/registry'
import { ethers } from 'hardhat'

/* eslint-disable no-magic-numbers */
const networkIds: any = {
  noChain: 0,
  sepolia: 11155111,
  optimismSepolia: 11155420,
  baseSepolia: 84532,
  ecoTestnet: 471923,
  // arbitrumSepolia: 421614,
  0: 'noChain',
  11155111: 'sepolia',
  11155420: 'optimismSepolia',
  84532: 'baseSepolia',
  471923: 'ecoTestnet',
  // 421614: 'arbitrumSepolia',
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
  0: 'Self',
  1: 'Settlement',
  2: 'SettlementL3',
  3: 'Bedrock',
  4: 'Cannon',
  5: 'HyperProver',
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
      l1BlockAddress: '0x0000000000000000000000000000000000000000',
      l2l1MessageParserAddress: '0x0000000000000000000000000000000000000000',
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'sepolia',
        id: networkIds.sepolia,
        contract: '0x0000000000000000000000000000000000000000',
      },
      provingTimeSeconds: 36,
      finalityDelaySeconds: 0,
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      optimismSepolia: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1', // optimismSepolia Dispute Game Factory
      baseSepolia: '0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1', // baseSepolia Dispute Game Factory
      // arbitrumSepolia: '0xd80810638dbDF9081b72C1B33c65375e807281C8', // arbitrumSepolia Rollup Admin Contract
    },
  },
  optimismSepolia: {
    network: networkIds[11155420],
    chainId: networkIds.optimismSepolia,
    alchemyNetwork: 'optimism-sepolia',
    sourceChains: ['baseSepolia', 'ecoTestnet'],
    proverContract: {
      address: '0xfBC728D2ab7575988eCEEBc2d7B69846cA8c8453',
      deploymentBlock: 16795390n, // '0x10046Fe'
    },
    intentSource: {
      address: '0x1285E45A43A057d33A64690f8160F7F0311f343f',
      deploymentBlock: 16795394n, // '0x1004702
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xaF908126aB3C58b737c6170842F2Bf5D358c250A',
      deploymentBlock: 18354796n, // '0x118126c
    },
    hyperProverContractAddress: '0x258b353Bc9B2C4780f470Ca71502b5a51Efc4228',
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
  },
  baseSepolia: {
    network: networkIds[84532],
    chainId: networkIds.baseSepolia,
    alchemyNetwork: 'base-sepolia',
    sourceChains: ['optimismSepolia', 'ecoTestnet'],
    proverContract: {
      address: '0x235264209566a026FaDA7d1e467218F5a6A412Cb',
      deploymentBlock: 14812482n, // '0xe20542',
    },
    intentSource: {
      address: '0x1285E45A43A057d33A64690f8160F7F0311f343f',
      deploymentBlock: 14812485n, // '0xe20545',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xaF908126aB3C58b737c6170842F2Bf5D358c250A',
      deploymentBlock: 14812488n, // '0xe20548',
    },
    hyperProverContractAddress: '0x258b353Bc9B2C4780f470Ca71502b5a51Efc4228',
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
        // Old L2 Ourput Oracle Address
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
  },
  ecoTestnet: {
    network: networkIds[471923],
    chainId: networkIds.ecoTestnet,
    alchemyNetwork: 'eco-testnet',
    sourceChains: ['baseSepolia', 'optimismSepolia'],
    rpcUrl: 'https://eco-testnet.rpc.caldera.xyz/http',
    settlementNetwork: 'baseSepolia',
    proverContract: {
      address: '0x8c2F4fdA46853Feb5b2Cf6EF19D64f525778C07f',
      deploymentBlock: '0x35dc32', // 3529778n
    },
    intentSource: {
      address: '0x1285E45A43A057d33A64690f8160F7F0311f343f',
      deploymentBlock: 3529780n, // '0x35dc34',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xaF908126aB3C58b737c6170842F2Bf5D358c250A',
      deploymentBlock: 3529786n, // '0x35dc3a',
    },
    hyperProverContractAddress: '0x258b353Bc9B2C4780f470Ca71502b5a51Efc4228',
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
  },
  arbitrumSepolia: {
    network: networkIds[421614],
    chainId: networkIds.arbitrumSepolia,
    alchemyNetwork: 'arbitrum-sepolia',
    settlementNetwork: 'sepolia',
    intentSourceAddress: '',
    proverContract: {
      address: '',
      deploymentBlock: '', // 0n
    },
    inboxAddress: '',
    intentSource: {
      minimumDuration: 1000,
      counter: 0,
    },
    proving: {
      mechanism: provingMechanisms.HyperProver,
      provingTimeSeconds: 604800,
      finalityDelaySeconds: 0,
    },
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
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
}

const deploymentChainConfigs = {
  baseSepolia: [
    deploymentConfigs.sepoliaSettlement,
    deploymentConfigs.baseSepoliaSelf,
    deploymentConfigs.baseSepoliaCannon,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
  ],
  optimismSepolia: [
    deploymentConfigs.sepoliaSettlement,
    deploymentConfigs.baseSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
    deploymentConfigs.optimismSepoliaCannon,
  ],
  ecoTestnet: [
    deploymentConfigs.sepoliaSettlementL3,
    deploymentConfigs.baseSepoliaSettlement,
    deploymentConfigs.optimismSepoliaCannon,
    deploymentConfigs.ecoTestnetBedrock,
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
        provingMechanism: provingMechanisms.settlementL3,
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
      provingMechanism: provingMechanisms.cannonL3L2,
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
        provingMechanism: provingMechanisms.cannon,
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
        provingMechanism: provingMechanisms.bedrockL2Settlement,
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
        provingMechanism: provingMechanisms.bedrockL2L3,
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
        provingMechanism: provingMechanisms.cannon,
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
