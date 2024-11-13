import { networks } from '../../config/mainnet/config'

export const baseChainConfiguration = {
  chainId: networks.base.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.base.proving.mechanism, // provingMechanism
    settlementChainId: networks.base.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.base.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.base.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.base.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const optimismChainConfiguration = {
  chainId: networks.optimism.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.optimism.proving.mechanism, // provingMechanism
    settlementChainId: networks.optimism.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.optimism.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.     blockhashOracle: networks.optimism.proving.l1BlockAddress,
    blockhashOracle: networks.optimism.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.optimism.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const helixChainConfiguration = {
  chainId: networks.helix.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.helix.proving.mechanism, // provingMechanism
    settlementChainId: networks.helix.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.helix.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.helix.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.helix.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const arbitrumChainConfiguration = {
  chainId: networks.arbitrum.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.arbitrum.proving.mechanism, // provingMechanism
    settlementChainId: networks.arbitrum.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.arbitrum.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.arbitrum.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.arbitrum.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

export const mantleChainConfiguration = {
  chainId: networks.mantle.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.mantle.proving.mechanism, // provingMechanism
    settlementChainId: networks.mantle.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.mantle.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.mantle.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.mantle.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
