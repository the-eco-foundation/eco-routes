import { network } from 'hardhat'
import {
  deployProtocol,
  getDeployNetwork,
  getEmptyProtocolDeploy,
  ProtocolDeploy,
} from '../deloyProtocol'
import { actors } from '../../config/mainnet/config'
import { MainnetChainConfigs } from '../configs/chain.config'

const protocolDeploy: ProtocolDeploy = getEmptyProtocolDeploy()

deployProtocol(
  protocolDeploy,
  getDeployNetwork(network.name),
  actors.solver,
  [
    MainnetChainConfigs.baseChainConfiguration,
    MainnetChainConfigs.optimismChainConfiguration,
    // MainnetChainConfigs.helixChainConfiguration,
    MainnetChainConfigs.arbitrumChainConfiguration,
    MainnetChainConfigs.mantleChainConfiguration,
  ],
  { isSolvingPublic: true, deployPre: true },
).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
