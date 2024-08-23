<div id="top"></div>

<br />
<div align="center">
  <a href="https://github.com/eco/eco-protocol">
    <img src="https://i.postimg.cc/ryNBfZkN/Logo-Blue.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Eco API Documentation</h3>
</div>

## API Documentation
Within the following sections, the terms 'source chain' and 'destination chain' will be relative to any given intent. Each of n supported chain will have its own `IntentSource`(1), `Inbox`(1), and `Prover`s(n-1)

### Intent Creation / Settlement
Intent creation and filler settlement processes both exist on the `IntentSource` on the source chain, and is where the full intent lifecycle will start and end. Both `Users` and `Fillers` interact with this contract, Users to create intents and `Fillers` to claim their reward after fulfillment has been proven.

#### Events

*__IntentCreated__: emitted on a successful call to createIntent*
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

- \_hash (bytes32) the hash of the intent on which withdraw was attempted
- \_recipient (address) the address that received the rewards for this intent

### Intent Fulfillment / Execution
Intent fulfillment lives on the `Inbox`, which lives on the destination chain. `Fillers` interact with this contract to `fulfill` Users' intents. At time of launch, solving will be private, restricted only to a whitelisted set of filler addresses while we live test the system, but it will soon become possible for anyone to fill orders.

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

- \_hash (bytes32) the hash of the intent on which withdraw was attempted
- \_recipient (address) the address that received the rewards for this intent
