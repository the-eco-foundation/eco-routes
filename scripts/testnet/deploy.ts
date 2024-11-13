import { network } from 'hardhat'
import { actors } from '../../config/testnet/config'
import {
  deployProtocol,
  getDeployNetwork,
  getEmptyProtocolDeploy,
  ProtocolDeploy,
} from '../deloyProtocol'
import { SepoliaChainConfigs } from '../configs/chain.config'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const protocolDeploy: ProtocolDeploy = getEmptyProtocolDeploy()

deployProtocol(protocolDeploy, getDeployNetwork(network.name), actors.solver, [
  SepoliaChainConfigs.baseSepoliaChainConfiguration,
  SepoliaChainConfigs.optimismSepoliaChainConfiguration,
  // ecoTestnetChainConfiguration,
  SepoliaChainConfigs.arbitrumSepoliaChainConfiguration,
  SepoliaChainConfigs.mantleSepoliaChainConfiguration,
]).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
