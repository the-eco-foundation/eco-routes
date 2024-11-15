import { networks } from '../../config/testnet/config'
import { DeployNetworkConfig } from '../deloyProtocol'

export const baseSepoliaChainConfiguration: DeployNetworkConfig = {
  chainId: networks.baseSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.baseSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.baseSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.baseSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const optimismSepoliaChainConfiguration: DeployNetworkConfig = {
  chainId: networks.optimismSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.optimismSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.optimismSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract:
      networks.optimismSepolia.proving.settlementChain.contract, // settlementContract e.g DisputeGameFactory or L2OutputOracle.
    blockhashOracle: networks.optimismSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.optimismSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const ecoTestnetChainConfiguration: DeployNetworkConfig = {
  chainId: networks.ecoTestnet.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.ecoTestnet.proving.mechanism, // provingMechanism
    settlementChainId: networks.ecoTestnet.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.ecoTestnet.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.ecoTestnet.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.ecoTestnet.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const mantleSepoliaChainConfiguration: DeployNetworkConfig = {
  chainId: networks.mantleSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.mantleSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.mantleSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.mantleSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.mantleSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.mantleSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
export const arbitrumSepoliaChainConfiguration: DeployNetworkConfig = {
  chainId: networks.arbitrumSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.arbitrumSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.arbitrumSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract:
      networks.arbitrumSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.arbitrumSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.arbitrumSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
