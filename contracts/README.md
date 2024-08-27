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

## Intent Creation / Settlement

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
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the filler to redeem rewards.

<h4><ins>Withdrawal</ins></h4>
<h5>Emitted on a successful call to withdrawReward</h5>

Attributes:

- `_hash` (bytes32) the hash of the intent on which withdraw was attempted
- `_recipient` (address) the address that received the rewards for this intent

### Methods

<h4><ins>createIntent</ins></h4>
<h5> Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets. If a proof on the source chain is not completed by the expiry time, the reward funds will not be redeemable by the filler, <ins>regardless of whether the instructions were executed</ins>. The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent filler. <ins>The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.</ins></h5>

Attributes:

- `_destinationChain` (uint256) the chain on which the user wishes to transact
- `_targets` (address[]) the address on \_destinationChain at which the instruction sets need to be executed
- `_data` (bytes[]) the instructions to be executed on \_targets
- `_rewardTokens` (address[]) the addresses of reward tokens
- `_rewardAmounts` (uint256[]) the amounts of reward tokens
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the filler to redeem rewards.
- `_prover` (address) the address of the prover against which the intent's status will be checked

<ins>Security:</ins> This method has no permissioning, it can be called by anyone. Notably, it asks the user for raw calldata to be executed by the filler, and transfers tokens from the user into the IntentSource contract. It is very important, therefore, that a user know exactly what commands they are executing and what their consequences are, as well as what tokens in what quantity they intend to lock up. Also, the user must give this contract permission to move their tokens via a method like permit or approve, otherwise it will revert.

<h4><ins>withdrawRewards</ins></h4> 
<h5>Allows withdawal of reward funds locked up for a given intent.</h5>

Attributes:

- `_hash` (bytes32) the hash of the intent on which withdraw is being attempted

<ins>Security:</ins> This method can be called by anyone, but the caller has no specific rights. Whether or not this method succeeds and who receives the funds if it does depend solely on the intent's proven status and expiry time.

## Intent Fulfillment / Execution

Intent fulfillment lives on the `Inbox`, which lives on the destination chain. `Fillers` interact with this contract to `fulfill` Users' intents. At time of launch, solving will be private, restricted only to a whitelisted set of filler addresses while we live test the system, but it will soon become possible for anyone to fill orders.

### Events

<h4><ins>Fulfillment</ins></h4>
<h5>Emitted when an intent is successfully fulfilled</h5>

Attributes:

- `_hash` (bytes32) the hash of the intent, also the key to the intents mapping
- `_sourceChainID` (uint256) the ID of the chain where the fulfilled intent originated
- `_claimant` (address) the address that can claim the fulfilled intent's fee on the source chain

### Methods

<h4><ins>fulfill</ins></h4>
<h5> Allows a filler to fulfill an intent on its destination chain. The filler also gets to predetermine the address on the destination chain that will receive the reward on the intent's fulfillment and subsequent proof</h5>

Attributes:

- `_sourceChainID` (uint256) the ID of the chain where the fulfilled intent originated
- `_targets` (address[]) the address on the destination chain at which the instruction sets need to be executed
- `_data` (bytes[]) the instructions to be executed on \_targets
- `_expiryTime` (uint256) the timestamp at which the intent expires
- `_nonce` (bytes32) the nonce of the calldata. Composed of the hash on the source chain of the global nonce and chainID
- `_claimant` (address) the address that can claim the fulfilled intent's fee on the source chain
- `_expectedHash` (bytes32) the hash of the intent. Used to verify that the correct data is being input

<ins>Security:</ins> This method can be called by anyone, but cannot be called again for the same intent, thus preventing a double fulfillment. This method executes arbitrary calls written by the intent creator on behalf of the Inbox contract - it is important that the caller be aware of what they are executing. The Inbox will be the msg.sender for these calls. \_sourceChainID, the destination's chainID, the inbox address, \_targets, \_data, \_expiryTime, and \_nonce are hashed together to form the intent's hash on the IntentSource - any incorrect inputs will result in a hash that differs from the original, and will prevent the intent's reward from being withdrawn (as this means the intent fulfilled differed from the one created). The \_expectedHash input exists only to help prevent this before fulfillment.

## Intent Proving

Intent proving lives on the `Prover`, which is on the source chain. `Prover`s are the parties that should be interacting with the `Prover` contract, but the `IntentSource` does read state from it. The methods in this contract are complex and require inputs that can be difficult to generate. As a result, Eco will in the future be running services to assist with proving, as well as publishing an SDK for input generation and/or spinning up independent proving services. Please see the scripts directory for usage examples. 

### Events

<h4><ins>L1WorldStateProven</ins></h4> 
<h5> emitted when L1 world state is proven</h5>

Attributes:

- `_blocknumber` (uint256) the block number corresponding to this L1 world state
- `_L1WorldStateRoot` (bytes32) the world state root at \_blockNumber

<h4><ins>L2WorldStateProven</ins></h4> 
<h5> emitted when L2 world state is proven</h5>

Attributes:

- `_destinationChainID` (uint256) the chainID of the destination chain
- `_blocknumber` (uint256) the block number corresponding to this L2 world state
- `_L2WorldStateRoot` (bytes32) the world state root at \_blockNumber

<h4><ins>IntentProven</ins></h4> 
<h5> emitted when an intent has been successfully proven</h5>

Attributes:

- `_hash` (bytes32) the hash of the intent
- `_claimant` (address) the address that can claim this intent's rewards

### Methods

<h4><ins>proveSettlementLayerState</ins></h4> 
<h5> validates input L1 block state against the L1 oracle contract. This method does not need to be called per intent, but the L2 batch containing the intent must have been settled to L1 on or before this block.</h5>

Attributes:

- `rlpEncodedBlockData` (bytes) properly encoded L1 block data

<ins>Security:</ins> Inputting the correct block's data encoded as expected will result in its hash matching the blockhash found on the L1 oracle contract. This means that the world state root found in that block corresponds to the block on the oracle contract, and that it represents a valid state. Notably, only one block's data is present on the oracle contract at a time, so the input data must match that block specifically, or the method will revert.

<h4><ins>proveWorldStateBedrock</ins></h4> 
<h5> Validates World state by ensuring that the passed in world state root corresponds to value in the L2 output oracle on the Settlement Layer</h5>

Attributes:

- `chainId` (uint256) the chain id of the chain we are proving (destination chain)
- `rlpEncodedBlockData` (bytes) properly encoded L1 block data
- `l2WorldStateRoot` (bytes32) the state root of the last block in the batch which contains the block in which the fulfill tx happened
- `l2MessagePasserStateRoot` (bytes32) storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
- `l2OutputIndex` (uint256) the batch number
- `l1StorageProof` (bytes[]) TODO
- `rlpEncodedOutputOracleData` (bytes) rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
- `l1AccountProof` (bytes[]) accountProof from eth_getProof(L2OutputOracle, [], )
- `l1WorldStateRoot` (bytes32) the l1 world state root that was proven in proveSettlementLayerState

<ins>Security:</ins> TODO

<h4><ins>proveWorldStateCannon</ins></h4> 
<h5> Validates world state for Cannon by validating the following Storage proofs for the faultDisputeGame.</h5> TODO

Attributes: 
- `chainId` (uint256) the chain id of the chain we are proving
- `rlpEncodedBlockData` (bytes) properly encoded L1 block data
- `l2WorldStateRoot` (bytes32) TODO
- `disputeGameFactoryProofData` (DisputeGameFactoryProofData) TODO
- `faultDisputeGameProofData` (FaultDisputeGameProofData) TODO
- `l1WorldStateRoot` (bytes32) a proven l1 world state root from a block on or after the L1 settlement block for this batch

<ins>Security:</ins> TODO

<h4><ins>proveIntent</ins></h4> 
<h5> Validates the intentHash and claimant address on the destination chain's inbox contract using the L2 state root</h5>

Attributes:
- `claimant` (address) the address that can claim the reward
- `inboxContract` (address) the address of the inbox contract
- `intermediateHash` (bytes32) the hash which, when hashed with the correct inbox contract, will result in the correct intentHash
- `l2StorageProof` (bytes[]) TODO
- `rlpEncodedInboxData` (bytes) TODO
- `l2AccountProof` (bytes[]) TODO
- `l2WorldStateRoot` (bytes32) TODO

<ins>Security:</ins> TODO
