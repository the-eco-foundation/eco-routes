import config from '../../config/testnet/config'
import {
  AbiCoder,
  BigNumberish,
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
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
import * as DisputeGameFactoryArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/DisputeGameFactory.sol/DisputeGameFactory.json'
import * as L2ToL1MessagePasser from '@eth-optimism/contracts-bedrock/forge-artifacts/L2ToL1MessagePasser.sol/L2ToL1MessagePasser.json'
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

  // Providers
  export const layer1Provider = new AlchemyProvider(
    config.sepolia.network,
    ALCHEMY_API_KEY,
  )
  export const layer2SourceProvider = new AlchemyProvider(
    config.baseSepolia.network,
    ALCHEMY_API_KEY,
  )
  export const layer2DestinationProvider = new AlchemyProvider(
    config.optimismSepolia.network,
    ALCHEMY_API_KEY,
  )

  // Signers
  // Layer2 Source
  export const layer2SourceIntentCreator: Signer = new Wallet(
    INTENT_CREATOR_PRIVATE_KEY,
    layer2SourceProvider,
  )
  export const layer2SourceIntentProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    layer2SourceProvider,
  )
  export const layer2SourceSolver: Signer = new Wallet(
    SOLVER_PRIVATE_KEY,
    layer2SourceProvider,
  )
  export const layer2SourceClaimant: Signer = new Wallet(
    CLAIMANT_PRIVATE_KEY,
    layer2SourceProvider,
  )
  // Layer2 Destination
  export const layer2DestinationSolver: Signer = new Wallet(
    SOLVER_PRIVATE_KEY,
    layer2DestinationProvider,
  )
  export const layer2DestinationProver: Signer = new Wallet(
    PROVER_PRIVATE_KEY,
    layer2DestinationProvider,
  )
  // Contracts
  // Note: we use providers for all System Contracts and Signers for Intent Protocol Contracts
  // Layer 1 Sepolia
  export const layer1Layer2DestinationOutputOracleContract = new Contract(
    config.sepolia.l2BaseOutputOracleAddress,
    L2OutputArtifact.abi,
    layer1Provider,
  )
  export const layer1Layer2DisputeGameFactory = new Contract(
    config.sepolia.l2OptimismDisputeGameFactory,
    DisputeGameFactoryArtifact.abi,
    layer1Provider,
  )
  // Layer 2 Source Base Sepolia
  export const layer2Layer1BlockAddressContract = new Contract(
    config.baseSepolia.l1BlockAddress,
    IL1Block__factory.abi,
    layer2SourceProvider,
  )
  export const layer2SourceIntentSourceContract = new Contract(
    config.baseSepolia.intentSource.address,
    IntentSource__factory.abi,
    layer2SourceIntentCreator,
  )
  export const layer2SourceIntentSourceContractClaimant = new Contract(
    config.baseSepolia.intentSource.address,
    IntentSource__factory.abi,
    layer2SourceClaimant,
  )
  export const layer2SourceProverContract = new Contract(
    config.baseSepolia.proverContract.address,
    Prover__factory.abi,
    layer2SourceIntentProver,
  )
  export const layer2SourceUSDCContract = new Contract(
    config.baseSepolia.usdcAddress,
    ERC20__factory.abi,
    layer2SourceIntentCreator,
  )

  // Layer 2 Destination Optimism Sepolia
  export const layer2DestinationInboxContract = new Contract(
    config.optimismSepolia.inbox.address,
    Inbox__factory.abi,
    layer2DestinationSolver,
  )
  export const Layer2DestinationMessagePasserContract = new Contract(
    config.optimismSepolia.l2l1MessageParserAddress,
    L2ToL1MessagePasser.abi,
    layer2DestinationProvider,
  )
  export const layer2DestinationUSDCContract = new Contract(
    config.optimismSepolia.usdcAddress,
    ERC20__factory.abi,
    layer2DestinationSolver,
  )

  // const rewardToken: ERC20 = ERC20__factory.connect(rewardTokens[0], creator)

  // Intent Parameters to baseSepolia
  export const intentCreator = config.intents.optimismSepolia.creator
  export const intentSourceAddress = config.baseSepolia.intentSource.address
  export const intentRewardAmounts =
    config.intents.optimismSepolia.rewardAmounts
  export const intentRewardTokens = config.intents.optimismSepolia.rewardTokens
  export const intentDestinationChainId: BigNumberish =
    config.intents.optimismSepolia.destinationChainId
  export const intentTargetTokens = config.intents.optimismSepolia.targetTokens
  export const intentTargetAmounts =
    config.intents.optimismSepolia.targetAmounts
  export const intentRecipient = config.intents.optimismSepolia.recipient
  export const intentDuration = config.intents.optimismSepolia.duration
}
