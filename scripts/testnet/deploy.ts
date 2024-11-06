import { network } from 'hardhat'
import { networks, actors } from '../../config/testnet/config'
import { zeroAddress } from 'viem'
import {
  deployProtocol,
  getDeployNetwork,
  ProtocolDeploy,
} from '../deloyProtocol'
import { getGitHash } from '../publish/gitUtils'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const baseSepoliaChainConfiguration = {
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

const optimismSepoliaChainConfiguration = {
  chainId: networks.optimismSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.optimismSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.optimismSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract:
      networks.optimismSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.optimismSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.optimismSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

const ecoTestnetChainConfiguration = {
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

// const arbitrumSepoliaChainConfiguration = {
//   chainId: networks.arbitrumSepolia.chainId, // chainId
//   chainConfiguration: {
//     provingMechanism: networks.arbitrumSepolia.proving.mechanism, // provingMechanism
//     settlementChainId: networks.arbitrumSepolia.proving.settlementChain.id, // settlementChainId
//     settlementContract:
//       networks.arbitrumSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
//     blockhashOracle: networks.arbitrumSepolia.proving.l1BlockAddress, // blockhashOracle
//     outputRootVersionNumber:
//       networks.arbitrumSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
//   },
// }

// const mantleSepoliaChainConfiguration = {
//   chainId: networks.mantleSepolia.chainId, // chainId
//   chainConfiguration: {
//     provingMechanism: networks.mantleSepolia.proving.mechanism, // provingMechanism
//     settlementChainId: networks.mantleSepolia.proving.settlementChain.id, // settlementChainId
//     settlementContract: networks.mantleSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
//     blockhashOracle: networks.mantleSepolia.proving.l1BlockAddress, // blockhashOracle
//     outputRootVersionNumber:
//       networks.mantleSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
//   },
// }

const protocolDeploy: ProtocolDeploy = {
  proverAddress: zeroAddress,
  intentSourceAddress: zeroAddress,
  inboxAddress: zeroAddress,
  hyperProverAddress: zeroAddress,
  initialSalt: getGitHash(),// + Math.random().toString(),
}

deployProtocol(
  protocolDeploy,
  getDeployNetwork(network.name),
  actors.solver,
  [
    baseSepoliaChainConfiguration,
    optimismSepoliaChainConfiguration,
    ecoTestnetChainConfiguration,
    //   arbitrumSepoliaChainConfiguration,
    // mantleSepoliaChainConfiguration,
  ]).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
