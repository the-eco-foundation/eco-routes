<div id="top"></div>

<br />
<div align="center">
  <a href="https://github.com/eco/eco-protocol">
    <img src="https://i.postimg.cc/ryNBfZkN/Logo-Blue.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Eco API Documentation</h3>
</div>

# API Documentation

Within the following sections, the terms 'source chain' and 'destination chain' will be relative to any given intent. Each of n supported chain will have its own `IntentSources`(1), `Inboxes`(1), and `Provers`(n-1)

<h2>Intent Creation / Settlement</h2>
Intent creation and filler settlement processes both exist on the `IntentSource` on the source chain, and is where the full intent lifecycle will start and end. Both `Users` and `Fillers` interact with this contract, Users to create intents and `Fillers` to claim their reward after fulfillment has been proven.

### Events

<h4><ins>IntentCreated</ins></h4>
<h5>Emitted on a successful call to createIntent</h5>

Attributes:
- `_hash` (bytes32) the hash of the intent, also the key to the intents mapping
- `_creator` (address) the address that created the intent
- `_destinationChain` (uint256) the destination chain
- `_targets` (address[]) the address on \_destinationChain at which the instruction sets need to be executed
- `_data` (bytes[]) the instructions to be executed on \_targets
- `_rewardTokens` (address[]) the addresses of reward tokens
- `_rewardAmounts` (uint256[]) the amounts of reward tokens
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the solver to redeem rewards.

<h4><ins>Withdrawal</ins></h4>
<h5>Emitted on a successful call to withdrawReward</h5>

Attributes:
- `_hash` (bytes32) the hash of the intent on which withdraw was attempted
- `_recipient` (address) the address that received the rewards for this intent

### Methods

<h4><ins>createIntent</ins></h4>
<h5> Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets. If a proof on the source chain is not completed by the expiry time, the reward funds will not be redeemable by the solver, <ins>regardless of whether the instructions were executed</ins>. The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent filler. <ins>The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.</ins></h5>

Attributes:
- `_destinationChain` (uint256) the chain on which the user wishes to transact
- `_targets` (address[]) the address on \_destinationChain at which the instruction sets need to be executed
- `_data` (bytes[]) the instructions to be executed on \_targets
- `_rewardTokens` (address[]) the addresses of reward tokens
- `_rewardAmounts` (uint256[]) the amounts of reward tokens
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the solver to redeem rewards.
- `_prover` (address) the address of the prover against which the intent's status will be checked

<ins>Security:</ins> This method has no permissioning, it can be called by anyone. Notably, it contains raw calldata to be executed by the solver, and transfers tokens from the user into the IntentSource contract. It is very important, therefore, that a user of this method know exactly what commands they are executing and what their consequences are, as well as what tokens in what quantity they intent to lock up. Also, the user must give this contract permission to move their tokens via a method like permit or approve.

<h4><ins>withdrawRewards</ins></h4> 
<h5>Allows withdawal of reward funds locked up for a given intent.</h5>

Attributes:
- `_hash` (bytes32) the hash of the intent on which withdraw is being attempted

## Intent Fulfillment / Execution

Intent fulfillment lives on the `Inbox`, which lives on the destination chain. `Fillers` interact with this contract to `fulfill` Users' intents. At time of launch, solving will be private, restricted only to a whitelisted set of filler addresses while we live test the system, but it will soon become possible for anyone to fill orders.

### Events

<h4><ins>Fulfillment</ins></h4>
<h5>Emitted when an intent is successfully fulfilled</h5>

Attributes:
- `_hash` (bytes32) the hash of the intent, also the key to the intents mapping
- `_sourceChainID` (uint256) the ID of the chain where the fulfilled intent originated
- `_claimant` (address) the address that can claim the fulfilled intent's fee on the source chain


### Intent Proving

Intent proving lives on the `Prover`, which is on the source chain. `Prover`s are the parties that should be interacting with the Prover contract, but the `IntentSource` does read state from it. At the outset, Eco will run a proving service that manages this step for all intents.

##### Events

**IntentCreated**: emitted on a successful call to createIntent
Attributes:

- `_hash` (bytes32) the hash of the intent, also the key to the intents mapping
- `_creator` (address) the address that created the intent
- `_destinationChain` (uint256) the destination chain
- `_targets` (address[]) the address on \_destinationChain at which the instruction sets need to be executed
- `_data` (bytes[]) the instructions to be executed on \_targets
- `_rewardTokens` (address[]) the addresses of reward tokens
- `_rewardAmounts` (uint256[]) the amounts of reward tokens
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the solver to redeem rewards.

**Withdrawal**: emitted on successful call to withdraw
Attributes:

- `_hash` (bytes32) the hash of the intent on which withdraw was attempted
- `_recipient` (address) the address that received the rewards for this intent
