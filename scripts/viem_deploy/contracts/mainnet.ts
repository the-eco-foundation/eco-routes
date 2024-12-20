import Prover from '../../../artifacts/contracts/Prover.sol/Prover.json'
import IntentSource from '../../../artifacts/contracts/IntentSource.sol/IntentSource.json'
import Inbox from '../../../artifacts/contracts/Inbox.sol/Inbox.json'
import HyperProver from '../../../artifacts/contracts/HyperProver.sol/HyperProver.json'
import { MainnetChainConfigs } from '../../configs/chain.config'
import { Hex } from 'viem'

export type ContractDeployConfigs = {
  name: string
  abi: any
  bytecode: Hex
  args: any[]
}

export type ContractNames = 'Prover' | 'IntentSource' | 'Inbox' | 'HyperProver'
const MainnetContracts: Record<ContractNames, ContractDeployConfigs> = {
  Prover: {
    name: Prover.contractName,
    abi: Prover.abi,
    bytecode: Prover.bytecode as Hex,
    args: [
      5,
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
    bytecode: IntentSource.bytecode as Hex,
    args: [],
  },
  Inbox: {
    name: Inbox.contractName,
    abi: Inbox.abi,
    bytecode: Inbox.bytecode as Hex,
    args: [],
  },
  HyperProver: {
    name: HyperProver.contractName,
    abi: HyperProver.abi,
    bytecode: HyperProver.bytecode as Hex,
    args: [],
  },
}
export default MainnetContracts
