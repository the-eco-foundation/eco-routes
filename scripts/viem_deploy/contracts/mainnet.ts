import Prover from '../../../artifacts/contracts/Prover.sol/Prover.json'
import IntentSource from '../../../artifacts/contracts/IntentSource.sol/IntentSource.json'
import Inbox from '../../../artifacts/contracts/Inbox.sol/Inbox.json'
import HyperProver from '../../../artifacts/contracts/HyperProver.sol/HyperProver.json'
import { MainnetChainConfigs } from '../../configs/chain.config'

export type ContractDeployConfigs = {
  name: string
  abi: any
  bytecode: string
  args?: any[]
}

export type ContractNames = 'Prover' | 'IntentSource' | 'Inbox' | 'HyperProver'
const MainnetContracts: Record<ContractNames, ContractDeployConfigs> = {
  Prover: {
    name: Prover.contractName,
    abi: Prover.abi,
    bytecode: Prover.bytecode,
    args: [
      [
        MainnetChainConfigs.baseChainConfiguration,
        MainnetChainConfigs.optimismChainConfiguration,
        MainnetChainConfigs.arbitrumChainConfiguration,
        MainnetChainConfigs.mantleChainConfiguration,
      ],
    ],
  },
  IntentSource: {
    name: IntentSource.contractName,
    abi: IntentSource.abi,
    bytecode: IntentSource.bytecode,
  },
  Inbox: {
    name: Inbox.contractName,
    abi: Inbox.abi,
    bytecode: Inbox.bytecode,
  },
  HyperProver: {
    name: HyperProver.contractName,
    abi: HyperProver.abi,
    bytecode: HyperProver.bytecode,
  },
}
export default MainnetContracts
