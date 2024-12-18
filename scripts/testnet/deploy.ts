import { network } from 'hardhat'
import { actors } from '../../config/testnet/config'
import {
  DeployNetwork,
  deployProtocol,
  getEmptyProtocolDeploy,
  ProtocolDeploy,
} from '../deloyProtocol'
import { SepoliaChainConfigs } from '../configs/chain.config'
import { getDeployNetwork } from '../utils'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const protocolDeploy: ProtocolDeploy = getEmptyProtocolDeploy()

deployProtocol(
  protocolDeploy,
  getDeployNetwork(network.name) as DeployNetwork,
  actors.solver,
  [
    SepoliaChainConfigs.baseSepoliaChainConfiguration,
    SepoliaChainConfigs.optimismSepoliaChainConfiguration,
    // ecoTestnetChainConfiguration,
    SepoliaChainConfigs.arbitrumSepoliaChainConfiguration,
    SepoliaChainConfigs.mantleSepoliaChainConfiguration,
  ],
  { isSolvingPublic: true, deployPre: true },
).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
