/* eslint-disable no-magic-numbers */

const networkIds: any = {
  sepolia: 11155111,
  optimismSepolia: 11155420,
  baseSepolia: 84532,
  ecoTestNet: 471923,
  // arbitrumSepolia: 421614,
  11155111: 'sepolia',
  11155420: 'optimismSepolia',
  84532: 'baseSepolia',
  471923: 'ecoTestNet',
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
  // self: 0, // Destination is Self
  // settlement: 10, // Source Chain is an L2, Destination is A L1 Settlement Chain
  settlementL3: 11, // Source Chain is an L3, Destination is a L2 Settlement Chain
  // bedrock: 20, // Source Chain is an L2, Destination Chain is an L2 using Bedrock
  // bedrockL2L3: 21, // Source Chain is an L2, Destination Chain is an L3 using Bedrock
  bedrockL3L2: 22, // Source Chain is an L3, Destination Chain is an L2 using Bedrock
  // bedrockL1Settlement: 23, // Source Chain is an L1, settlement chain for the Destination Chain which is an L2 using Bedrock
  bedrockL2Settlement: 24, // Source Chain is the L2, settlement chain for the Destination Chain which is an L3 using Bedrock
  cannon: 30, // Source Chain is an L2, Destination Chain is an L2 using Cannon
  cannonL2L3: 31, // Source Chain is an L2, Destination Chain is an L3 using Cannon
  cannonL3L2: 32, // Source Chain is an L3, Destination Chain is an L2 using Cannon
  // cannonL1Settlement: 33, // Source Chain is an L1 settlement chain for the Destination Chain which is an L2 using Cannon
  // cannonL2Settlement: 34, // Source Chain is the L2 settlement chain for the Destination Chain which is an L3 using Cannon
  hyperProver: 40, // Source Chain is an L2 Destination Chain is an L2 using HyperProver
  // 0: 'self',
  // 10: 'settlement',
  11: 'settlementL3',
  // 20: 'bedrock',
  // 21: 'bedrockL2L3',
  22: 'bedrockL3L2',
  // 23: 'bedrockL1Settlement',
  24: 'bedrockL2Settlement',
  30: 'cannon',
  31: 'cannonL2L3',
  // 32: 'cannonL3L2',
  // 33: 'cannonL1Settlement',
  // 34: 'cannonL2Settlement',
  40: 'hyperProver',
}

const provingState: any = {
  finalized: 0,
  posted: 1,
  confirmed: 2,
  0: 'finalized', // Finalized on Settlement Chain
  1: 'posted', // Posted to Settlement Chain
  2: 'confirmed', // Confirmed Locally
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
    sourceChains: ['baseSepolia', 'ecoTestNet'],
    proverContract: {
      address: '0x992d4Bc028c623606031E6BEa670ff7c0c31000b',
      deploymentBlock: 16795390n, // '0x10046Fe'
    },
    intentSource: {
      address: '0x12D5583f6c7C237A9C1A42d7D02DB45c87759D89',
      deploymentBlock: 16795394n, // '0x1004702
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x0Eb5a399E077aA9bC4F4b6b9AC772AD2C1962896',
      deploymentBlock: 16795397n, // '0x1004705
    },
    hyperproverContractAddress: '0x95Bd42d6360337Ba368d75d8b67f812093CB3924',
    proving: {
      mechanism: provingMechanisms.cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'sepolia',
        id: networkIds.sepolia,
        contract: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
      },
    },
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    hyperlaneMailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
  },
  baseSepolia: {
    network: networkIds[84532],
    chainId: networkIds.baseSepolia,
    alchemyNetwork: 'base-sepolia',
    sourceChains: ['optimismSepolia', 'ecoTestNet'],
    proverContract: {
      address: '0x992d4Bc028c623606031E6BEa670ff7c0c31000b',
      deploymentBlock: 14812482n, // '0xe20542',
    },
    intentSource: {
      address: '0x12D5583f6c7C237A9C1A42d7D02DB45c87759D89',
      deploymentBlock: 14812485n, // '0xe20545',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x0Eb5a399E077aA9bC4F4b6b9AC772AD2C1962896',
      deploymentBlock: 14812488n, // '0xe20548',
    },
    hyperproverContractAddress: '0x5736424f0D2091b8613C601cDc5617CfE2Fd28e8',
    proving: {
      mechanism: provingMechanisms.cannon,
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
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      ecoTestNet: '0xb3EDAE5AB86f16242018c7cED4fBCabb3c784951', // ecoTestNet L2 Output Oracle
    },
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    hyperlaneMailboxAddress: '0x6966b0E55883d49BFB24539356a2f8A673E02039',
  },
  ecoTestNet: {
    network: networkIds[471923],
    chainId: networkIds.ecoTestNet,
    alchemyNetwork: 'eco-testnet',
    sourceChains: ['baseSepolia', 'optimismSepolia'],
    rpcUrl: 'https://eco-testnet.rpc.caldera.xyz/http',
    settlementNetwork: 'baseSepolia',
    proverContract: {
      address: '0x2c6f1fB4E9eFB68574DD9d246c18d394Cda4CA7C',
      deploymentBlock: '0x35dc32', // 3529778n
    },
    intentSource: {
      address: '0x94f5AABaF0ec954a3254d52bdE8DaD149e1ef4B8',
      deploymentBlock: 3529780n, // '0x35dc34',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x4532e00e61D6198E63933606dA47834581340ADF',
      deploymentBlock: 3529786n, // '0x35dc3a',
    },
    hyperproverContractAddress: '0xe3C261393f69bF1472Cd73656C4adE129d112B72',
    proving: {
      mechanism: 1,
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
      mechanism: 3,
    },
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
}

const routes: any = [
  // ecoTestNet to baseSepolia
  {
    source: {
      chainId: networkIds.ecoTestNet,
      providerName: 'ecoTestNetProvider',
      contracts: {
        intentSourceContract: {
          address: networks.ecoTestNet.intentSource.address,
          variableName: 'ecoTestNetIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.ecoTestNet.proverContract.address,
          variableName: 'ecoTestNetProverContract',
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
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.ecoTestNet.usdcAddress,
          variableName: 'ecoTestNetUSDCContractIntentCreator',
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
  // ecoTestNet to optimismSepolia
  {
    source: {
      chainId: networkIds.ecoTestNet,
      providerName: 'ecoTestNetProvider',
      contracts: {
        intentSourceContract: {
          address: networks.ecoTestNet.intentSource.address,
          variableName: 'ecoTestNetIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.ecoTestNet.proverContract.address,
          variableName: 'ecoTestNetProverContract',
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
      provingState: provingState.finalized,
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.ecoTestNet.usdcAddress,
          variableName: 'ecoTestNetUSDCContractIntentCreator',
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
        provingState: provingState.finalized,
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
  // baseSepolia to ecoTestNet
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
      chainId: networkIds.ecoTestNet,
      providerName: 'ecoTestNetProvider',
      contracts: {
        inboxContract: {
          address: networks.ecoTestNet.inbox.address,
          variableName: 'ecoTestNetInboxContractSolver',
        },
        provingMechanism: provingMechanisms.bedrockL2Settlement,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.baseSepolia.usdcAddress,
          variableName: 'baseSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.ecoTestNet.usdcAddress,
          variableName: 'ecoTestNetUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // optimismSepolia to ecoTestNet
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
      chainId: networkIds.ecoTestNet,
      providerName: 'ecoTestNetProvider',
      contracts: {
        inboxContract: {
          address: networks.ecoTestNet.inbox.address,
          variableName: 'ecoTestNetInboxContractSolver',
        },
        provingMechanism: provingMechanisms.bedrockL2L3,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimismSepolia.usdcAddress,
          variableName: 'optimismSepoliaUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.ecoTestNet.usdcAddress,
          variableName: 'ecoTestNetUSDCContractSolver',
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
        provingState: provingState.finalized,
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
  provingMechanisms,
  provingState,
  networkIds,
  intent,
  actors,
  networks,
  routes,
}
