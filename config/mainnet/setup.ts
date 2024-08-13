import {
  getDefaultProvider,
  AbiCoder,
  AlchemyProvider,
  BigNumberish,
  Contract,
  Wallet,
  Signer,
} from 'ethers'
import {
  Inbox__factory,
  IntentSource__factory,
  IL1Block__factory,
  Prover__factory,
  ProverL3__factory,
  ERC20__factory,
} from '../../typechain-types'
import {
  provingMechanisms,
  networkIds,
  networks,
  actors,
  bedrock,
  cannon,
  intent,
} from '../../config/testnet/config'
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import * as DisputeGameFactoryArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/DisputeGameFactory.sol/DisputeGameFactory.json'
import * as L2ToL1MessagePasserArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2ToL1MessagePasser.sol/L2ToL1MessagePasser.json'
export namespace s {
  // default AbiCoder
  export const abiCoder = AbiCoder.defaultAbiCoder()
  // Private Keys
  export const DEPLOYER_PRIVATE_KEY = process.env.DEPLOY_PRIVATE_KEY || ''
  export const INTENT_CREATOR_PRIVATE_KEY =
    process.env.INTENT_CREATOR_PRIVATE_KEY || ''
  export const SOLVER_PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY || ''
  export const CLAIMANT_PRIVATE_KEY = process.env.CLAIMANT_PRIVATE_KEY || ''
  export const PROVER_PRIVATE_KEY = process.env.PROVER_PRIVATE_KEY || ''
  export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

  // The following setup is Per Chain
  // mainnet
  // Providers
  export const mainnetProvider = new AlchemyProvider(
    networks.mainnet.network,
    ALCHEMY_API_KEY,
  )
  // Signers
  export const mainnetDeployer: Signer = new Wallet(
    DEPLOYER_PRIVATE_KEY,
    mainnetProvider,
  )
  export const mainnetIntentCreator: Signer = new Wallet(
    INTENT_CREATOR_PRIVATE_KEY,
    mainnetProvider,
  )
  export const mainnetSolver: Signer = new Wallet(
    SOLVER_PRIVATE_KEY,
    mainnetProvider,
  )
  export const mainnetIntentProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    mainnetProvider,
  )
  export const mainnetClaimant: Signer = new Wallet(
    CLAIMANT_PRIVATE_KEY,
    mainnetProvider,
  )
  // Contracts
  // Note: we use providers for all System Contracts and Signers for Intent Protocol Contracts
  // Settlement Contracts for other Chains
  export const mainnetSettlementContractBase = new Contract(
    networks.mainnet.settlementContracts.base,
    DisputeGameFactoryArtifact.abi,
    mainnetProvider,
  )
  export const mainnetSettlementContractOptimism = new Contract(
    networks.mainnet.settlementContracts.optimism,
    DisputeGameFactoryArtifact.abi,
    mainnetProvider,
  )
  // System Proving Contracts
  // ECO PROTOCOL Contracts

  // Opstimismmainnet
  // Providers
  export const optimismProvider = new AlchemyProvider(
    networks.optimism.network,
    ALCHEMY_API_KEY,
  )
  // Signers
  export const optimismDeployer: Signer = new Wallet(
    DEPLOYER_PRIVATE_KEY,
    optimismProvider,
  )
  export const optimismIntentCreator: Signer = new Wallet(
    INTENT_CREATOR_PRIVATE_KEY,
    optimismProvider,
  )
  export const optimismSolver: Signer = new Wallet(
    SOLVER_PRIVATE_KEY,
    optimismProvider,
  )
  export const optimismIntentProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    optimismProvider,
  )
  export const optimismClaimant: Signer = new Wallet(
    CLAIMANT_PRIVATE_KEY,
    optimismProvider,
  )
  // Contracts
  // Settlement Contracts for other Chains
  // System Proving Contracts
  export const optimisml1Block = new Contract(
    networks.optimism.proving.l1BlockAddress,
    IL1Block__factory.abi,
    optimismProvider,
  )
  export const optimimsmmainnetL2L1MessageParserContract = new Contract(
    networks.optimism.proving.l2l1MessageParserAddress,
    L2ToL1MessagePasserArtifact.abi,
    optimismProvider,
  )

  // ECO PROTOCOL Contracts
  export const optimismIntentSourceContractIntentCreator = new Contract(
    networks.optimism.intentSourceAddress,
    IntentSource__factory.abi,
    optimismIntentCreator,
  )
  export const optimismIntentSourceContractClaimant = new Contract(
    networks.optimism.intentSourceAddress,
    IntentSource__factory.abi,
    optimismClaimant,
  )
  export const optimismProverContract = new Contract(
    networks.optimism.proverContractAddress,
    Prover__factory.abi,
    optimismIntentProver,
  )
  export const optimismInboxContractSolver = new Contract(
    networks.optimism.inboxAddress,
    Inbox__factory.abi,
    optimismSolver,
  )
  export const optimismUSDCContractIntentCreator = new Contract(
    networks.optimism.usdcAddress,
    ERC20__factory.abi,
    optimismIntentCreator,
  )
  export const optimismUSDCContractSolver = new Contract(
    networks.optimism.usdcAddress,
    ERC20__factory.abi,
    optimismSolver,
  )
  // base
  // Providers
  export const baseProvider = new AlchemyProvider(
    networks.base.network,
    ALCHEMY_API_KEY,
  )
  // Signers
  export const baseDeployer: Signer = new Wallet(
    DEPLOYER_PRIVATE_KEY,
    baseProvider,
  )
  export const baseIntentCreator: Signer = new Wallet(
    INTENT_CREATOR_PRIVATE_KEY,
    baseProvider,
  )
  export const baseSolver: Signer = new Wallet(SOLVER_PRIVATE_KEY, baseProvider)
  export const baseIntentProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    baseProvider,
  )
  export const baseClaimant: Signer = new Wallet(
    CLAIMANT_PRIVATE_KEY,
    baseProvider,
  )
  // Contracts
  // Settlement Contracts for other Chains
  export const baseSettlementContractEcoTestNet = new Contract(
    networks.base.settlementContracts.ecoTestNet,
    L2OutputArtifact.abi,
    baseProvider,
  )
  // System Proving Contracts
  export const basel1Block = new Contract(
    networks.base.proving.l1BlockAddress,
    IL1Block__factory.abi,
    baseProvider,
  )
  export const baseL2L1MessageParserContract = new Contract(
    networks.base.proving.l2l1MessageParserAddress,
    L2ToL1MessagePasserArtifact.abi,
    baseProvider,
  )
}
