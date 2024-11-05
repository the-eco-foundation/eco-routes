import { ethers, network } from 'hardhat'
import { networks, actors } from '../../config/testnet/config'
import { zeroAddress } from 'viem'
import { isZeroAddress } from '../utils'
import { deployHyperProver, deployInbox, deployIntentSource, DeployNetwork, deployProver, ProtocolDeploy } from '../deloyProtocol'
import { deleteAddressesJson, transformAddresses } from '../deploy/addresses'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const networkName = network.name
console.log('Deploying to Network: ', network.name)
let deployNetwork: DeployNetwork
switch (networkName) {
  case 'baseSepolia':
    deployNetwork = networks.baseSepolia
    break
  case 'optimismSepolia':
    deployNetwork = networks.optimismSepolia
    break
  case 'optimismSepoliaBlockscout':
    deployNetwork = networks.optimismSepolia
    break
  case 'ecoTestnet':
    deployNetwork = networks.ecoTestnet
    break
  case 'arbitrumSepolia':
    deployNetwork = networks.arbitrumSepolia
    break
  case 'mantleSepolia':
    deployNetwork = networks.mantleSepolia
    break
}
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

const mantleSepoliaChainConfiguration = {
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

let protocolDeploy : ProtocolDeploy = {
  proverAddress: zeroAddress,
  intentSourceAddress: zeroAddress,
  inboxAddress: zeroAddress,
  hyperProverAddress: zeroAddress,
  initialSalt: 'HANDOFFstoyan4'
}

if (process.env.DEPLOY_CI === 'true') {
  console.log('Deploying for CI')
}

console.log(
  `Deploying with salt: ethers.keccak256(ethers.toUtf8bytes(${protocolDeploy.initialSalt})`,
)
const salt = ethers.keccak256(ethers.toUtf8Bytes(protocolDeploy.initialSalt))
console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const singletonDeployer = await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )

  console.log('gasLimit:', deployNetwork.gasLimit)

  console.log(`***************************************************`)
  console.log(`** Deploying contracts to ${networkName} network **`)
  console.log(`***************************************************`)

  if (isZeroAddress(protocolDeploy.proverAddress)) {
    await deployProver(salt, deployNetwork, singletonDeployer, [
      baseSepoliaChainConfiguration,
      optimismSepoliaChainConfiguration,
      ecoTestnetChainConfiguration,
      //   arbitrumSepoliaChainConfiguration,
      // mantleSepoliaChainConfiguration,
    ])
  }

  if (isZeroAddress(protocolDeploy.intentSourceAddress)) {
    protocolDeploy.intentSourceAddress = await deployIntentSource(deployNetwork, salt, singletonDeployer)
  }

  if (isZeroAddress(protocolDeploy.inboxAddress)) {
    protocolDeploy.inboxAddress = await deployInbox(deployNetwork, deployer, false, [actors.solver], salt, singletonDeployer)
  }

  if (isZeroAddress(protocolDeploy.hyperProverAddress) && !isZeroAddress(protocolDeploy.inboxAddress)) {
    protocolDeploy.hyperProverAddress = await deployHyperProver(deployNetwork, protocolDeploy.inboxAddress, salt, singletonDeployer)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
