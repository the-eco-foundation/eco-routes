import config from '../config/config'
import { BigNumberish, AlchemyProvider, Contract, Wallet, Signer } from 'ethers'
import {
  Inbox__factory,
  IntentSource__factory,
  IL1Block__factory,
  Prover__factory,
  ERC20,
  ERC20__factory,
} from '../typechain-types'
import * as L2OutputArtifact from '@eth-optimism/contracts-bedrock/forge-artifacts/L2OutputOracle.sol/L2OutputOracle.json'
// import * as L2ToL1MessagePasser from '@eth-optimism/contracts-bedrock/forge-artifacts/L2ToL1MessagePasser.sol/L2ToL1MessagePasser.json'
export namespace Constants {
  // Private Keys
  export const DEPLOY_PRIVATE_KEY = process.env.DEPLOY_PRIVATE_KEY || ''
  export const INTENT_CREATOR_PRIVATE_KEY =
    process.env.INTENT_CREATOR_PRIVATE_KEY || ''
  export const SOLVER_PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY || ''
  export const CLAIMANT_PRIVATE_KEY = process.env.CLAIMANT_PRIVATE_KEY || ''
  export const PROVER_PRIVATE_KEY = process.env.PROVER_PRIVATE_KEY || ''
  export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

  // Providers
  export const layer1Provider = new AlchemyProvider(
    config.layer1.network,
    ALCHEMY_API_KEY,
  )
  export const layer2SourceProvider = new AlchemyProvider(
    config.layer2Source.network,
    ALCHEMY_API_KEY,
  )
  export const layer2DestinationProvider = new AlchemyProvider(
    config.layer2Destination.network,
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
    config.layer1.l2BaseOutputOracleAddress,
    L2OutputArtifact.abi,
    layer1Provider,
  )
  // Layer 2 Source Sepolia Optimism
  export const layer2Layer1BlockAddressContract = new Contract(
    config.layer2Source.l1BlockAddress,
    IL1Block__factory.abi,
    layer2SourceProvider,
  )
  export const layer2SourceIntentSourceContract = new Contract(
    config.layer2Source.intentSourceAddress,
    IntentSource__factory.abi,
    layer2SourceIntentCreator,
  )
  export const layer2SourceProverContract = new Contract(
    config.layer2Source.proverContractAddress,
    Prover__factory.abi,
    layer2SourceIntentProver,
  )
  export const layer2SourceUSDCContract = new Contract(
    config.layer2Source.usdcAddress,
    ERC20__factory.abi,
    layer2SourceIntentCreator,
  )

  // Layer 2 Destination Sepolia Base
  export const layer2DestinationInboxContract = new Contract(
    config.layer2Destination.inboxAddress,
    Inbox__factory.abi,
    layer2DestinationSolver,
  )
  // export const Layer2DestinationMessagePasserContract = new Contract(
  //   config.layer2Destination.l2l1MessageParserAddress,
  //   L2ToL1MessagePasser.abi,
  //   Constants.layer2DestinationProvider,
  // )
  export const layer2DestinationUSDCContract = new Contract(
    config.layer2Destination.usdcAddress,
    ERC20__factory.abi,
    layer2DestinationSolver,
  )

  // const rewardToken: ERC20 = ERC20__factory.connect(rewardTokens[0], creator)

  // Intent Parameters
  export const intentCreator = config.intent.creator
  export const intentSourceAddress = config.layer2Source.intentSourceAddress
  export const intentRewardAmounts = config.intent.rewardAmounts
  export const intentRewardTokens = config.intent.rewardTokens
  export const intentDestinationChainId: BigNumberish =
    config.intent.destinationChainId
  export const intentTargetTokens = config.intent.targetTokens
  export const intentTargetAmounts = config.intent.targetAmounts
  export const intentRecipient = config.intent.recipient
  export const intentDuration = config.intent.duration
}
