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
      address: '0xbABB17c866aC6ae03E3dd716C3B609B7eF7c9763',
      deploymentBlock: 127658118n, // '0x79be886'
    },
    intentSource: {
      address: '0x141D21D684aeE355f2c0fab4F92e8a3751b9285A',
      deploymentBlock: 127658118n, // '0x79be886'
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xEB5AFc529D9d7F05Cc445c8aBD81FD06c822feC4',
      deploymentBlock: 127658118n, // '0x79be886'
    },
    hyperproverContractAddress: '0xD66F4bf0aDeA715b54B0394374aFD931485Dab05',
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
      provingTimeSeconds: 604800,
      finalityDelaySeconds: 0,
    },
    usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    hyperlaneMailboxAddress: '0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D',
    gasLimit: 8000000,
  },
  base: {
    network: networkIds[8453],
    chainId: networkIds.base,
    alchemyNetwork: 'base',
    sourceChains: [networkIds[10], networkIds[8921733], networkIds[5000]],
    proverContract: {
      address: '0xA928752DEC135589DCdF7631cf7BD9C527C46664',
      deploymentBlock: 22062818n, // '0x150a6e2',
    },
    intentSource: {
      address: '0x141D21D684aeE355f2c0fab4F92e8a3751b9285A',
      deploymentBlock: 22062818n, // '0x150a6e2',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xEB5AFc529D9d7F05Cc445c8aBD81FD06c822feC4',
      deploymentBlock: 22062818n, // '0x150a6e2',
    },
    hyperproverContractAddress: '0xa22E0FF3D6B3ba9beF24795164cD6212Fd6dc52B',
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
      provingTimeSeconds: 302400,
      finalityDelaySeconds: 604800,
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      helix: '0xf3B21c72BFd684eC459697c48f995CDeb5E5DB9d', // helix L2 Output Oracle
    },
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    hyperlaneMailboxAddress: '0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D',
    gasLimit: 8000000,
  },
  helix: {
    network: networkIds[8921733],
    chainId: networkIds.helix,
    alchemyNetwork: 'helix',
    sourceChains: [networkIds[10], networkIds[8453], networkIds[5000]],
    rpcUrl: 'https://helix-test.calderachain.xyz/http',
    settlementNetwork: 'base',
    proverContract: {
      address: '0x097112f489342F82936DbfC959CE406660E99ef7',
      deploymentBlock: 4640823n, // 0x46d037
    },
    intentSource: {
      address: '0x141D21D684aeE355f2c0fab4F92e8a3751b9285A',
      deploymentBlock: 4640823n, // 0x46d037
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xEB5AFc529D9d7F05Cc445c8aBD81FD06c822feC4',
      deploymentBlock: 4640823n, // 0x46d037
    },
    hyperproverContractAddress: '0xAa1c53Cdac6B4dB56577FF9DEBc37baAFE8c6271',
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
      provingTimeSeconds: 604800,
      finalityDelaySeconds: 0,
    },
    usdcAddress: '0x44D5B1DacCB7E8a7341c1AE0b17Dc65a659B1aCA',
    hyperlaneMailboxAddress: '0x4B216a3012DD7a2fD4bd3D05908b98C668c63a8d',
    gasLimit: 8000000,
  },
  arbitrum: {
    network: 'arbitrum',
    chainId: networkIds.arbitrum,
    alchemyNetwork: 'arbitrum',
    sourceChains: [],
    settlementNetwork: networkIds[1],
    proverContract: {
      address: '0xbABB17c866aC6ae03E3dd716C3B609B7eF7c9763',
      deploymentBlock: 271706508n, // '0xe1031e98c',
    },
    intentSource: {
      address: '0x141D21D684aeE355f2c0fab4F92e8a3751b9285A',
      deploymentBlock: 271706508n, // '0xe1031e98c',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xEB5AFc529D9d7F05Cc445c8aBD81FD06c822feC4',
      deploymentBlock: 271706508n, // '0xe1031e98c',
    },
    hyperProverContractAddress: '0xCb0aF7B2458776699cc9a7d91566bF4Ff12112aD',
    proving: {
      mechanism: provingMechanisms.ArbitrumNitro,
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
      provingTimeSeconds: 604800,
      finalityDelaySeconds: 0,
    },
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    hyperlaneMailboxAddress: '0x979Ca5202784112f4738403dBec5D0F3B9daabB9',
    gasLimit: 15000000,
  },
  mantle: {
    network: networkIds[5000],
    chainId: networkIds.mantle,
    alchemyNetwork: 'mantle',
    sourceChains: [networkIds[10], networkIds[8453], networkIds[8921733]],
    proverContract: {
      address: '0xbABB17c866aC6ae03E3dd716C3B609B7eF7c9763',
      deploymentBlock: 71392367n, // '0x4415c6f',
    },
    intentSource: {
      address: '0x141D21D684aeE355f2c0fab4F92e8a3751b9285A',
      deploymentBlock: 71392367n, // '0x4415c6f',
      minimumDuration: 1000,
      counter: 0,
    },
    inbox: {
      address: '0xEB5AFc529D9d7F05Cc445c8aBD81FD06c822feC4',
      deploymentBlock: 71392367n, // '0x4415c6f',
    },
    hyperProverContractAddress: '0xddf12ba146f50a2886bf1f52E213001eff0c93EA',
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
      provingTimeSeconds: 604800,
      finalityDelaySeconds: 604800,
    },
    usdcAddress: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
    hyperlaneMailboxAddress: '0x398633D19f4371e1DB5a8EFE90468eB70B1176AA',
    gasLimit: 30000000000,
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
  arbitrum: [
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
