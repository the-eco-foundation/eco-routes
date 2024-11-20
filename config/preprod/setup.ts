import {
  getDefaultProvider,
  AbiCoder,
  AlchemyProvider,
  Contract,
  Wallet,
  Signer,
} from 'ethers'
import {
  Inbox__factory,
  IntentSource__factory,
  IL1Block__factory,
  Prover__factory,
  ERC20__factory,
} from '../../typechain-types'
import { networks } from '../preprod/config'
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import * as DisputeGameFactoryArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/DisputeGameFactory.sol/DisputeGameFactory.json'
import * as L2ToL1MessagePasserArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2ToL1MessagePasser.sol/L2ToL1MessagePasser.json'
export namespace s {
  // default AbiCoder
  export const abiCoder = AbiCoder.defaultAbiCoder()
  // Private Keys
  export const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || ''
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
    L2OutputArtifact.abi,
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
    networks.optimism.intentSource.address,
    IntentSource__factory.abi,
    optimismIntentCreator,
  )
  export const optimismIntentSourceContractClaimant = new Contract(
    networks.optimism.intentSource.address,
    IntentSource__factory.abi,
    optimismClaimant,
  )
  export const optimismProverContract = new Contract(
    networks.optimism.proverContract.address,
    Prover__factory.abi,
    optimismIntentProver,
  )
  export const optimismInboxContractSolver = new Contract(
    networks.optimism.inbox.address,
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
  export const baseSettlementContractHelix = new Contract(
    networks.base.settlementContracts.helix,
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

  // ECO PROTOCOL Contracts
  export const baseIntentSourceContractIntentCreator = new Contract(
    networks.base.intentSource.address,
    IntentSource__factory.abi,
    baseIntentCreator,
  )
  export const baseIntentSourceContractClaimant = new Contract(
    networks.base.intentSource.address,
    IntentSource__factory.abi,
    baseClaimant,
  )

  export const baseProverContract = new Contract(
    networks.base.proverContract.address,
    Prover__factory.abi,
    baseIntentProver,
  )
  export const baseInboxContractSolver = new Contract(
    networks.base.inbox.address,
    Inbox__factory.abi,
    baseSolver,
  )
  export const baseUSDCContractIntentCreator = new Contract(
    networks.base.usdcAddress,
    ERC20__factory.abi,
    baseIntentCreator,
  )
  export const baseUSDCContractSolver = new Contract(
    networks.base.usdcAddress,
    ERC20__factory.abi,
    baseSolver,
  )
  // helix
  // Providers
  export const helixProvider = getDefaultProvider(networks.helix.rpcUrl)
  // Signers
  export const helixDeployer: Signer = new Wallet(
    DEPLOYER_PRIVATE_KEY,
    helixProvider,
  )
  export const helixIntentCreator: Signer = new Wallet(
    INTENT_CREATOR_PRIVATE_KEY,
    helixProvider,
  )
  export const helixSolver: Signer = new Wallet(
    SOLVER_PRIVATE_KEY,
    helixProvider,
  )
  export const helixIntentProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    helixProvider,
  )
  export const helixClaimant: Signer = new Wallet(
    CLAIMANT_PRIVATE_KEY,
    helixProvider,
  )
  // Contracts
  // Settlement Contracts for other Chains

  // System Proving Contracts
  export const helixl1Block = new Contract(
    networks.helix.proving.l1BlockAddress,
    IL1Block__factory.abi,
    helixProvider,
  )
  export const helixL2L1MessageParserContract = new Contract(
    networks.helix.proving.l2l1MessageParserAddress,
    L2ToL1MessagePasserArtifact.abi,
    helixProvider,
  )
  // ECO PROTOCOL Contracts
  export const helixIntentSourceContractIntentCreator = new Contract(
    networks.helix.intentSource.address,
    IntentSource__factory.abi,
    helixIntentCreator,
  )

  export const helixIntentSourceContractClaimant = new Contract(
    networks.helix.intentSource.address,
    IntentSource__factory.abi,
    helixClaimant,
  )
  export const helixProverContract = new Contract(
    networks.helix.proverContract.address,
    Prover__factory.abi,
    helixIntentProver, // Use deployer as prover as we need to do privileged operations
  )
  export const helixInboxContractSolver = new Contract(
    networks.helix.inbox.address,
    Inbox__factory.abi,
    helixSolver,
  )
  export const helixUSDCContractIntentCreator = new Contract(
    networks.helix.usdcAddress,
    ERC20__factory.abi,
    helixIntentCreator,
  )
  export const helixUSDCContractSolver = new Contract(
    networks.helix.usdcAddress,
    ERC20__factory.abi,
    helixSolver,
  )
  // mantle
  // Providers
  export const mantleProvider = getDefaultProvider(networks.mantle.rpcUrl)
  // export const mantleProvider = new AlchemyProvider(
  //   networks.mantle.network,
  //   ALCHEMY_API_KEY,
  // )
  // Signers
  export const mantleDeployer: Signer = new Wallet(
    DEPLOYER_PRIVATE_KEY,
    mantleProvider,
  )
  export const mantleIntentCreator: Signer = new Wallet(
    INTENT_CREATOR_PRIVATE_KEY,
    mantleProvider,
  )
  export const mantleSolver: Signer = new Wallet(
    SOLVER_PRIVATE_KEY,
    mantleProvider,
  )
  export const mantleIntentProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    mantleProvider,
  )
  export const mantleClaimant: Signer = new Wallet(
    CLAIMANT_PRIVATE_KEY,
    mantleProvider,
  )
  // Contracts
  // Settlement Contracts for other Chains

  // System Proving Contracts
  export const mantlel1Block = new Contract(
    networks.mantle.proving.l1BlockAddress,
    IL1Block__factory.abi,
    mantleProvider,
  )
  export const mantleL2L1MessageParserContract = new Contract(
    networks.mantle.proving.l2l1MessageParserAddress,
    L2ToL1MessagePasserArtifact.abi,
    mantleProvider,
  )
  // ECO PROTOCOL Contracts
  export const mantleIntentSourceContractIntentCreator = new Contract(
    networks.mantle.intentSource.address,
    IntentSource__factory.abi,
    mantleIntentCreator,
  )

  export const mantleIntentSourceContractClaimant = new Contract(
    networks.mantle.intentSource.address,
    IntentSource__factory.abi,
    mantleClaimant,
  )
  export const mantleProverContract = new Contract(
    networks.mantle.proverContract.address,
    Prover__factory.abi,
    mantleIntentProver, // Use deployer as prover as we need to do privileged operations
  )
  export const mantleInboxContractSolver = new Contract(
    networks.mantle.inbox.address,
    Inbox__factory.abi,
    mantleSolver,
  )
  export const mantleUSDCContractIntentCreator = new Contract(
    networks.mantle.usdcAddress,
    ERC20__factory.abi,
    mantleIntentCreator,
  )
  export const mantleUSDCContractSolver = new Contract(
    networks.mantle.usdcAddress,
    ERC20__factory.abi,
    mantleSolver,
  )
}
