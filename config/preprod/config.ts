/* eslint-disable no-magic-numbers */

const networkIds: any = {
  mainnet: 1,
  optimism: 10,
  base: 8453,
  helix: 8921733,
  1: 'mainnet',
  10: 'optimism',
  8453: 'base',
  8921733: 'helix',
}

const actors: any = {
  deployer: '0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4',
  intentCreator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
  inboxOwner: '0xBc6c49e5CdeC14CBD10478bf56296BD63c6c3F0e',
  solver: '0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E',
  claimant: '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
  prover: '0x923d4fDfD0Fb231FDA7A71545953Acca41123652',
  recipient: '0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9',
}

const provingMechanisms: any = {
  // self: 0, // Destination is Self
  // settlement: 10, // Source Chain is an L2, Destination is A L1 Settlement Chain
  settlementL3: 11, // Source Chain is an L3, Destination is a L2 Settlement Chain
  bedrock: 20, // Source Chain is an L2, Destination Chain is an L2 using Bedrock
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
  mainnet: {
    network: networkIds[1],
    chainId: networkIds.mainnet,
    alchemyNetwork: 'mainnet',
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      base: '0x56315b90c40730925ec5485cf004d835058518A0', // base L2 OUTPUT ORACLE
      optimism: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9', // optimism Dispute Game Factory
    },
  },
  optimism: {
    network: networkIds[10],
    chainId: networkIds.optimism,
    alchemyNetwork: 'optimism',
    sourceChains: ['base', 'helix'],
    proverContract: {
      address: '0xa7411320887c5a4C8BD9ED7c54fDbeDEb93bFee4',
      deploymentBlock: 126754500n, // '0x78E1eC4'
    },
    intentSource: {
      address: '0xB78Edd10Bf8Dc630cEEBE77aE0e32B6cAAdE3Fbe',
      deploymentBlock: 126754500n, // '0x78E1eC4
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x811D3CFE659f653A27581a9C22D8e08A1112cb0e',
      deploymentBlock: 126754500n, // '0x78E1eC4
    },
    hyperproverContractAddress: '0x9bFceD7B2bbE10Bcc85e4bF16dB7272dc0c2fc16',
    proving: {
      mechanism: provingMechanisms.cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'mainnet',
        id: networkIds.mainnet,
        contract: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9',
      },
    },
    usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    hyperlaneMailboxAddress: '0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D',
  },
  base: {
    network: networkIds[8453],
    chainId: networkIds.base,
    alchemyNetwork: 'base',
    sourceChains: ['optimism', 'helix'],
    proverContract: {
      address: '0xa7411320887c5a4C8BD9ED7c54fDbeDEb93bFee4',
      deploymentBlock: 21159000n, // '0x142dc58',
    },
    intentSource: {
      address: '0xB78Edd10Bf8Dc630cEEBE77aE0e32B6cAAdE3Fbe',
      deploymentBlock: 21159000n, // '0x142dc58',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x3886f2550364C9A59F4b329984745f346Da38990',
      deploymentBlock: 21159000n, // '0x142dc58',
    },
    hyperproverContractAddress: '0x9d532072e79D578Ea7C83F340b86E7148333CAaA',
    proving: {
      mechanism: provingMechanisms.bedrock,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'mainnet',
        id: networkIds.mainnet,
        // L2 Output Oracle Address
        contract: '0x56315b90c40730925ec5485cf004d835058518A0',
      },
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      helix: '0xf3B21c72BFd684eC459697c48f995CDeb5E5DB9d', // helix L2 Output Oracle
    },
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    hyperlaneMailboxAddress: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D',
  },
  helix: {
    network: networkIds[8921733],
    chainId: networkIds.helix,
    alchemyNetwork: 'helix',
    sourceChains: ['base', 'optimism'],
    rpcUrl: 'https://helix-test.calderachain.xyz/http',
    settlementNetwork: 'base',
    proverContract: {
      address: '0xa7411320887c5a4C8BD9ED7c54fDbeDEb93bFee4',
      deploymentBlock: 2828800n, // 0x2b2a00
    },
    intentSource: {
      address: '0xB78Edd10Bf8Dc630cEEBE77aE0e32B6cAAdE3Fbe',
      deploymentBlock: 2828800n, // 0x2b2a00
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0x2c71758fC4D224E5426C5700c6e599E515254D05',
      deploymentBlock: 2828800n, // 0x2b2a00
    },
    hyperproverContractAddress: '0x6A9901b8Ecf763FC6A0Dd9ced9C7D597A0f68394',
    proving: {
      mechanism: 1,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: 'base',
        id: 8453,
        contract: '0xf3B21c72BFd684eC459697c48f995CDeb5E5DB9d',
      },
    },
    usdcAddress: '0x44D5B1DacCB7E8a7341c1AE0b17Dc65a659B1aCA',
    hyperlaneMailboxAddress: '0x4B216a3012DD7a2fD4bd3D05908b98C668c63a8d',
  },
}

const routes: any = [
  // helix to base
  {
    source: {
      chainId: networkIds.helix,
      providerName: 'helixProvider',
      contracts: {
        intentSourceContract: {
          address: networks.helix.intentSource.address,
          variableName: 'helixIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.helix.proverContract.address,
          variableName: 'helixProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.base,
      providerName: 'baseProvider',
      contracts: {
        inboxContract: {
          address: networks.base.inbox.address,
          variableName: 'baseInboxContractSolver',
        },
        provingMechanism: provingMechanisms.settlementL3,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.helix.usdcAddress,
          variableName: 'helixUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.base.usdcAddress,
          variableName: 'baseUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // helix to optimism
  {
    source: {
      chainId: networkIds.helix,
      providerName: 'helixProvider',
      contracts: {
        intentSourceContract: {
          address: networks.helix.intentSource.address,
          variableName: 'helixIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.helix.proverContract.address,
          variableName: 'helixProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.optimism,
      providerName: 'optimismProvider',
      contracts: {
        inboxContract: {
          address: networks.optimism.inbox.address,
          variableName: 'optimismInboxContractSolver',
        },
      },
      provingMechanism: provingMechanisms.cannonL3L2,
      provingState: provingState.finalized,
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.helix.usdcAddress,
          variableName: 'helixUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.optimism.usdcAddress,
          variableName: 'optimismUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // base to optimism
  {
    source: {
      chainId: networkIds.base,
      providerName: 'baseProvider',
      contracts: {
        intentSourceContract: {
          address: networks.base.intentSource.address,
          variableName: 'baseIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.base.proverContract.address,
          variableName: 'baseProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.optimism,
      providerName: 'optimismProvider',
      contracts: {
        inboxContract: {
          address: networks.optimism.inbox.address,
          variableName: 'optimismInboxContractSolver',
        },
        provingMechanism: provingMechanisms.cannon,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.base.usdcAddress,
          variableName: 'baseUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.optimism.usdcAddress,
          variableName: 'optimismUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // base to helix
  {
    source: {
      chainId: networkIds.base,
      providerName: 'baseProvider',
      contracts: {
        intentSourceContract: {
          address: networks.base.intentSource.address,
          variableName: 'baseIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.base.proverContract.address,
          variableName: 'baseProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.helix,
      providerName: 'helixProvider',
      contracts: {
        inboxContract: {
          address: networks.helix.inbox.address,
          variableName: 'helixInboxContractSolver',
        },
        provingMechanism: provingMechanisms.bedrockL2SettlementL2Settlement,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.base.usdcAddress,
          variableName: 'baseUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.helix.usdcAddress,
          variableName: 'helixUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // optimism to helix
  {
    source: {
      chainId: networkIds.optimism,
      providerName: 'optimismProvider',
      contracts: {
        intentSourceContract: {
          address: networks.optimism.intentSource.address,
          variableName: 'optimismIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.optimism.proverContract.address,
          variableName: 'optimismProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.helix,
      providerName: 'helixProvider',
      contracts: {
        inboxContract: {
          address: networks.helix.inbox.address,
          variableName: 'helixInboxContractSolver',
        },
        provingMechanism: provingMechanisms.bedrockL2L3,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimism.usdcAddress,
          variableName: 'optimismUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.helix.usdcAddress,
          variableName: 'helixUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // optimism to base
  {
    source: {
      chainId: networkIds.optimism,
      providerName: 'optimismProvider',
      contracts: {
        intentSourceContract: {
          address: networks.optimism.intentSource.address,
          variableName: 'optimismIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.optimism.proverContract.address,
          variableName: 'optimismProverContract',
        },
      },
    },
    destination: {
      chainId: networkIds.base,
      providerName: 'baseProvider',
      contracts: {
        inboxContract: {
          address: networks.base.inbox.address,
          variableName: 'baseInboxContractSolver',
        },
        provingMechanism: provingMechanisms.bedrock,
        provingState: provingState.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimism.usdcAddress,
          variableName: 'optimismUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.base.usdcAddress,
          variableName: 'baseUSDCContractSolver',
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
