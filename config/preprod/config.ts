/* eslint-disable no-magic-numbers */
import { ethers } from 'hardhat'

const networkIds: any = {
  noChain: 0,
  mainnet: 1,
  optimism: 10,
  base: 8453,
  helix: 8921733,
  arbitrum: 42161,
  mantle: 5000,
  0: 'noChain',
  1: 'mainnet',
  10: 'optimism',
  8453: 'base',
  8921733: 'helix',
  42161: 'arbitrum',
  5000: 'mantle',
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
  mainnet: {
    network: networkIds[1],
    chainId: networkIds.mainnet,
    alchemyNetwork: 'mainnet',
    proving: {
      mechanism: provingMechanisms.Settlement,
      l1BlockAddress: ethers.ZeroAddress,
      l2l1MessageParserAddress: ethers.ZeroAddress,
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: networkIds[1],
        id: networkIds.mainnet,
        contract: ethers.ZeroAddress,
      },
      provingTimeSeconds: 36,
      finalityDelaySeconds: 0,
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      base: '0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e', // base Dispute Game Factory
      optimism: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9', // optimism Dispute Game Factory
      mantle: '0x31d543e7BE1dA6eFDc2206Ef7822879045B9f481', // mantle L2 OUTPUT ORACLE
    },
  },
  optimism: {
    network: networkIds[10],
    chainId: networkIds.optimism,
    alchemyNetwork: 'optimism',
    sourceChains: [networkIds[8543], networkIds[8921733], networkIds[5000]],
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
      mechanism: provingMechanisms.Cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: networkIds[1],
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
    sourceChains: [networkIds[10], networkIds[8921733], networkIds[5000]],
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
      mechanism: provingMechanisms.Cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      l1BlockSlotNumber: 2,
      settlementChain: {
        network: networkIds[1],
        id: networkIds.mainnet,
        // Dispute Game Factory
        contract: '0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e',
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
    sourceChains: [networkIds[10], networkIds[8453], networkIds[5000]],
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
      mechanism: provingMechanisms.Bedrock,
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
  arbitrum: {
    network: 'arbitrum',
    chainId: networkIds.arbitrum,
    alchemyNetwork: 'arbitrum',
    sourceChains: [],
    proverContractAddress: '0xE275b0635C3783EFA4F1A299879145a407C81f48',
    hyperProverContractAddress: '0xB1017F865c6306319C65266158979278F7f50118',
    intentSourceAddress: '0xa6B316239015DFceAC5bc9c19092A9B6f59ed905',
    inboxAddress: '0xfB853672cE99D9ff0a7DE444bEE1FB2C212D65c0',
    intentSource: {
      minimumDuration: 1000,
      counter: 0,
    },
    proving: {
      mechanism: provingMechanisms.arbitrumNitro,
      l1BlockAddress: ethers.ZeroAddress,
      l2l1MessageParserAddress: ethers.ZeroAddress,
      l2OutputOracleSlotNumber: 0,
      outputRootVersionNumber: 0,
      settlementChain: {
        network: networkIds[1],
        id: networkIds.main,
        // L2 Output Oracle Address
        contract: ethers.ZeroAddress,
      },
    },
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    hyperlaneMailboxAddress: '0x979Ca5202784112f4738403dBec5D0F3B9daabB9',
    gasLimit: 8000000,
  },
  mantle: {
    network: networkIds[5000],
    chainId: networkIds.mantle,
    alchemyNetwork: 'mantle',
    sourceChains: [networkIds[10], networkIds[8453], networkIds[8921733]],
    proverContractAddress: '0xE275b0635C3783EFA4F1A299879145a407C81f48',
    hyperProverContractAddress: '0xaf034DD5eaeBB49Dc476402C6650e85Cc22a0f1a',
    intentSourceAddress: '0xa6B316239015DFceAC5bc9c19092A9B6f59ed905',
    inboxAddress: '0xfB853672cE99D9ff0a7DE444bEE1FB2C212D65c0',
    intentSource: {
      minimumDuration: 1000,
      counter: 0,
    },
    proving: {
      mechanism: provingMechanisms.Bedrock,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      settlementChain: {
        network: 'mainnet',
        id: networkIds.mainnet,
        // L2 Output Oracle Address
        contract: '0x31d543e7BE1dA6eFDc2206Ef7822879045B9f481',
      },
    },
    usdcAddress: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
    hyperlaneMailboxAddress: '0x398633D19f4371e1DB5a8EFE90468eB70B1176AA',
    gasLimit: 25000000000,
  },
}

const deploymentConfigs = {
  mainnetSettlement: {
    chainConfigurationKey: {
      chainId: networkIds.mainnet,
      provingMechanism: provingMechanisms.Settlement, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.mainnet.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.mainnet.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.mainnet.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.mainnet.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.mainnet.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.mainnet.proving.finalityDelaySeconds,
    },
  },
  mainnetSettlementL3: {
    chainConfigurationKey: {
      chainId: networkIds.mainnet,
      provingMechanism: provingMechanisms.SettlementL3, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.mainnet.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.mainnet.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.mainnet.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.mainnet.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.mainnet.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.mainnet.proving.finalityDelaySeconds,
    },
  },
  baseSettlement: {
    chainConfigurationKey: {
      chainId: networkIds.base,
      provingMechanism: provingMechanisms.Settlement, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.base.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.base.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.base.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.base.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.base.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.base.proving.finalityDelaySeconds,
    },
  },
  baseSelf: {
    chainConfigurationKey: {
      chainId: networkIds.base,
      provingMechanism: provingMechanisms.Self, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.base.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.base.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.base.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.base.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.base.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.base.proving.finalityDelaySeconds,
    },
  },
  baseCannon: {
    chainConfigurationKey: {
      chainId: networkIds.base,
      provingMechanism: provingMechanisms.Cannon, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.base.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.base.proving.settlementChain.contract, // settlementContract
      blockhashOracle: networks.base.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.base.proving.outputRootVersionNumber, // outputRootVersionNumber
      provingTimeSeconds: networks.base.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.base.proving.finalityDelaySeconds,
    },
  },
  optimismCannon: {
    chainConfigurationKey: {
      chainId: networkIds.optimism,
      provingMechanism: provingMechanisms.Cannon, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.optimism.proving.settlementChain.id,
      settlementContract: networks.optimism.proving.settlementChain.contract,
      blockhashOracle: networks.optimism.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.optimism.proving.outputRootVersionNumber,
      provingTimeSeconds: networks.optimism.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.optimism.proving.finalityDelaySeconds,
    },
  },
  helixBedrock: {
    chainConfigurationKey: {
      chainId: networkIds.helix,
      provingMechanism: provingMechanisms.Bedrock, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.helix.proving.settlementChain.id,
      settlementContract: networks.helix.proving.settlementChain.contract,
      blockhashOracle: networks.helix.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.helix.proving.outputRootVersionNumber,
      provingTimeSeconds: networks.helix.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.helix.proving.finalityDelaySeconds,
    },
  },
  mantleBedrock: {
    chainConfigurationKey: {
      chainId: networkIds.mantle,
      provingMechanism: provingMechanisms.Bedrock, // provingMechanism
    },
    chainConfiguration: {
      exists: true,
      settlementChainId: networks.mantle.proving.settlementChain.id,
      settlementContract: networks.mantle.proving.settlementChain.contract,
      blockhashOracle: networks.mantle.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.mantle.proving.outputRootVersionNumber,
      provingTimeSeconds: networks.mantle.proving.provingTimeSeconds,
      finalityDelaySeconds: networks.mantle.proving.finalityDelaySeconds,
    },
  },
}

const deploymentChainConfigs = {
  base: [
    deploymentConfigs.mainnetSettlement,
    deploymentConfigs.baseSelf,
    deploymentConfigs.baseCannon,
    deploymentConfigs.optimismCannon,
    deploymentConfigs.helixBedrock,
    deploymentConfigs.mantleBedrock,
  ],
  optimism: [
    deploymentConfigs.mainnetSettlement,
    deploymentConfigs.baseCannon,
    deploymentConfigs.helixBedrock,
    deploymentConfigs.optimismCannon,
    deploymentConfigs.mantleBedrock,
  ],
  helix: [
    deploymentConfigs.mainnetSettlementL3,
    deploymentConfigs.baseSettlement,
    deploymentConfigs.optimismCannon,
    deploymentConfigs.helixBedrock,
    deploymentConfigs.mantleBedrock,
  ],
  mantle: [
    deploymentConfigs.mainnetSettlement,
    deploymentConfigs.baseCannon,
    deploymentConfigs.helixBedrock,
    deploymentConfigs.optimismCannon,
    deploymentConfigs.mantleBedrock,
  ],
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
        provingMechanism: provingMechanisms.SettlementL3,
        settlementTypes: settlementTypes.finalized,
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
      provingMechanism: provingMechanisms.Cannon,
      settlementTypes: settlementTypes.finalized,
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
  // helix to mantle
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
      chainId: networkIds.mantle,
      providerName: 'mantleProvider',
      contracts: {
        inboxContract: {
          address: networks.mantle.inbox.address,
          variableName: 'mantleInboxContractSolver',
        },
      },
      provingMechanism: provingMechanisms.Bedrock,
      settlementTypes: settlementTypes.finalized,
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.helix.usdcAddress,
          variableName: 'helixUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.mantle.usdcAddress,
          variableName: 'mantleUSDCContractSolver',
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
        provingMechanism: provingMechanisms.Cannon,
        settlementTypes: settlementTypes.finalized,
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
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
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
  // base to mantle
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
      chainId: networkIds.mantle,
      providerName: 'mantleProvider',
      contracts: {
        inboxContract: {
          address: networks.mantle.inbox.address,
          variableName: 'mantleInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.base.usdcAddress,
          variableName: 'baseUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.mantle.usdcAddress,
          variableName: 'mantleUSDCContractSolver',
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
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
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
        provingMechanism: provingMechanisms.Cannon,
        settlementTypes: settlementTypes.finalized,
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
  // optimism to mantle
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
      chainId: networkIds.mantle,
      providerName: 'mantleProvider',
      contracts: {
        inboxContract: {
          address: networks.mantle.inbox.address,
          variableName: 'mantleInboxContractSolver',
        },
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.optimism.usdcAddress,
          variableName: 'optimismUSDCContractIntentCreator',
        },
        targetToken: {
          address: networks.mantle.usdcAddress,
          variableName: 'mantleUSDCContractSolver',
        },
      },
      rewardAmounts: intent.rewardAmounts,
      targetAmounts: intent.targetAmounts,
      duration: intent.duration,
    },
  },
  // mantle to helix
  {
    source: {
      chainId: networkIds.mantle,
      providerName: 'mantleProvider',
      contracts: {
        intentSourceContract: {
          address: networks.mantle.intentSource.address,
          variableName: 'mantleIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.mantle.proverContract.address,
          variableName: 'mantleProverContract',
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
        provingMechanism: provingMechanisms.Bedrock,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.mantle.usdcAddress,
          variableName: 'mantleUSDCContractIntentCreator',
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
  // mantle to base
  {
    source: {
      chainId: networkIds.mantle,
      providerName: 'mantleProvider',
      contracts: {
        intentSourceContract: {
          address: networks.mantle.intentSource.address,
          variableName: 'mantleIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.mantle.proverContract.address,
          variableName: 'mantleProverContract',
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
        provingMechanism: provingMechanisms.Cannon,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.mantle.usdcAddress,
          variableName: 'mantleUSDCContractIntentCreator',
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
  // mantle to optimism
  {
    source: {
      chainId: networkIds.mantle,
      providerName: 'mantleProvider',
      contracts: {
        intentSourceContract: {
          address: networks.mantle.intentSource.address,
          variableName: 'mantleIntentSourceContractIntentCreator',
        },
        proverContract: {
          address: networks.mantle.proverContract.address,
          variableName: 'mantleProverContract',
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
        provingMechanism: provingMechanisms.Cannon,
        settlementTypes: settlementTypes.finalized,
      },
    },
    intent: {
      contracts: {
        rewardToken: {
          address: networks.mantle.usdcAddress,
          variableName: 'mantleUSDCContractIntentCreator',
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
