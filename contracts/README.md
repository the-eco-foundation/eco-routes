# API Documentation

Within the following sections, the terms 'source chain' and 'destination chain' will be relative to any given intent. Each supported chain will have its own `IntentSource`, `Inbox` and `Prover`.

This repo makes heavy use of the Intent struct (found at `types/Intent.sol`). 

Attributes:
- `creator` (address): creator of the intent
- `destinationChainID` (uint256): ID of chain where we want instructions executed
- `targets` (address[]): addresses on destinationChain where we want instructions executed
- `data` (bytes[]): instructions we want executed on the destinationChain
- `rewardTokens` (address[]): addresses of reward tokens
- `rewardAmounts` (uint256[]): corresponding amounts of reward tokens
- `expiryTime` (uint256): intent expiry timestamp
- `hasBeenWithdrawn` (bool): true if this intent's associated rewards have already been withdrawn
- `nonce` (bytes32): hash of the IntentSource's counter and the chainID
- `prover` (address): address of the prover this intent will be checked against



## Intent Creation / Settlement

Intent creation and filler settlement processes both exist on `IntentSource.sol` on the source chain, and is where the full intent lifecycle will start and end. Both `Users` and `Fillers` interact with this contract, Users to create intents and `Fillers` to claim their reward after fulfillment has been proven.

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
- `_rewardTokens` (address[]) the addresses of source chain reward tokens
- `_rewardAmounts` (uint256[]) the amounts of source chain reward tokens
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the filler to redeem rewards.
- `_prover` (address) the address of the prover against which the intent's status will be checked

<ins>Security:</ins> This method has no permissioning, it can be called by anyone. Notably, it asks the user for raw calldata to be executed by the filler, and transfers tokens from the user into the IntentSource contract. It is very important, therefore, that a user know exactly what commands they are executing and what their consequences are, as well as what tokens in what quantity they intend to lock up. Also, the user must give this contract permission to move their tokens via a method like permit or approve, otherwise it will revert.

<h4><ins>withdrawRewards</ins></h4>
<h5>Allows withdawal of reward funds locked up for a given intent.</h5>

Attributes:

- `_hash` (bytes32) the hash of the intent on which withdraw is being attempted

<ins>Security:</ins> This method can be called by anyone, but the caller has no specific rights. Whether or not this method succeeds and who receives the funds if it does depend solely on the intent's proven status and expiry time.

## Intent Fulfillment / Execution

Intent fulfillment lives on `Inbox.sol`, which lives on the destination chain. `Fillers` interact with this contract to `fulfill` Users' intents. At time of launch, solving will be private, restricted only to a whitelisted set of filler addresses while we live test the system, but it will soon become possible for anyone to fill orders.

### Events

<h4><ins>Fulfillment</ins></h4>
<h5>Emitted when an intent is successfully fulfilled</h5>

Attributes:

- `_hash` (bytes32) the hash of the intent, also the key to the intents mapping
- `_sourceChainID` (uint256) the ID of the chain where the fulfilled intent originated
- `_claimant` (address) the address (on the source chain) that will receive the fulfilled intent's reward

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

Intent proving lives on `Prover.sol`, which is on the source chain. `Prover`s are the parties that should be interacting with the `Prover` contract, but the `IntentSource` reads state from it. The methods in this contract are complex and require inputs that can be difficult to generate. In the future we will be building out services to assist with proving, as well as publishing an SDK for input generation and/or spinning up independent proving services. Please see the scripts directory for usage examples.

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

<ins>Security:</ins> This method can be called by anyone. Inputting the correct block's data encoded as expected will result in its hash matching the blockhash found on the L1 oracle contract. This means that the world state root found in that block corresponds to the block on the oracle contract, and that it represents a valid state. Notably, only one block's data is present on the oracle contract at a time, so the input data must match that block specifically, or the method will revert.

<h4><ins>proveWorldStateBedrock</ins></h4>
<h5> Validates World state by ensuring that the passed in world state root corresponds to value in the L2 output oracle on the Settlement Layer.  We submit a `StorageProof` proving that the L2 Block is included in a batch that has been settled to L1 and an `AccountProof` proving that the `StorageProof` submitted is linked to a `WorldState` for the contract that the `StorageProof` is for.</h5>

For Optimisms BedRock release we submit an `outputRoot` storage proof created by concatenating

```solidity
output_root = kecakk256( version_byte || state_root || withdrawal_storage_root || latest_block_hash)
```

as documented in [Optimism L2 Commitment Construction](https://specs.optimism.io/protocol/proposals.html#l2-output-commitment-construction).

**Note: The current Bedrock proving approach considers a block finalized when the batch has been "posted" to the settlement chain. It does not include a Finalization Period (e.g. a week) as implemented in [OptimismPortal.sol](https://github.com/ethereum-optimism/optimism/blob/62c7f3b05a70027b30054d4c8974f44000606fb7/packages/contracts-bedrock/contracts/L1/OptimismPortal.sol#L362).**

Attributes:

- `chainId` (uint256) the chain id of the chain we are proving (destination chain)
- `rlpEncodedBlockData` (bytes) properly encoded L1 block data
- `l2WorldStateRoot` (bytes32) the state root of the last block in the batch which contains the block in which the fulfill tx happened
- `l2MessagePasserStateRoot` (bytes32) storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
- `l2OutputIndex` (uint256) the batch number
- `l1StorageProof` (bytes[]) storage proof of the l2OuputOracle showing the batch has been submitted
- `rlpEncodedOutputOracleData` (bytes) rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
- `l1AccountProof` (bytes[]) accountProof from eth_getProof(L2OutputOracle, [], )
- `l1WorldStateRoot` (bytes32) the l1 world state root that was proven in proveSettlementLayerState

<ins>Security:</ins> This method can be called by anyone. Proving the batch has been settled ensures that the L2OutputBlock has been settled and allows us to prove any intents up to that block.

<h4><ins>proveWorldStateCannon</ins></h4>
<h5> Validates world state for Cannon by validating the following Storage proofs for the faultDisputeGame.

see [Optimisms Cannon Release](https://specs.optimism.io/fault-proof/cannon-fault-proof-vm.html).</h5>

We Prove L2 World State by

- Creating a Storage Proof that the `FaultDisputeGame` was created by the `DisputeGameFactory`
- Creating a Account Proof showing that the state root for the `l2BlockNumber` is for a valid L1 World State this is tied to the above Storage proof by `storageHash` (stateRoot) used in both and passed in `rlpEncodedDiputeFactoryData`
  - This will be done by checking the `FaultDisputeGame` contract address is for a game deployed by the `DisputeGameFactory` see [games function](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/DisputeGameFactory.sol#L59) and [unpack](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/lib/LibUDT.sol#L107)
- Creating a Storage Proof that the `FaultDisputeGame` is for the correct `rootClaim` this can use the same `generateOutputRoot` function that is used in bedrock documented in [Optimism L2 Commitment Construction](https://specs.optimism.io/protocol/proposals.html#l2-output-commitment-construction)
- Creating a Storage Proof that the `FaultDisputeGame` has been settled
- Creating a Account Proof showing that the state root for the `l2BlockNumber` is for a valid L1 World State this is tied to the above Storage proof by `storageHash` (stateRoot) used in both and passed in `rlpEncodedFaultDisputeGameData`

```solidity
output_root = kecakk256( version_byte || state_root || withdrawal_storage_root || latest_block_hash)
```

Attributes:

- `chainId` (uint256) the chain id of the chain we are proving
- `rlpEncodedBlockData` (bytes) properly encoded L1 block data
- `l2WorldStateRoot` (bytes32) the state root of the destination chains last block in the batch
- `disputeGameFactoryProofData` (DisputeGameFactoryProofData) all information need to prove disputeGameFactory created the FaultDisputeGame
- `faultDisputeGameProofData` (FaultDisputeGameProofData) all information needed to prove the FaultDisputeGame is for the correct destination batch and has a status of resolved
- `l1WorldStateRoot` (bytes32) a proven l1 world state root from a block on or after the L1 settlement block for this batch

<ins>Security:</ins> This method can be called by anyone. Proving the FaultDisputeGame was creaed by the DisputeGameFactory and the FaultDisputeGame has a valid rootClaim (which contains the destination chains block number being settled) and that the FaultDisputeGame has been resolved ensures that the L2OutputBlock has been settled and allows us to prove any intents up to that block.

<h4><ins>proveIntent</ins></h4>
<h5> Validates the intentHash and claimant address on the destination chain's inbox contract using the L2 state root</h5>

Attributes:

- `claimant` (address) the address that can claim the reward
- `inboxContract` (address) the address of the inbox contract
- `intermediateHash` (bytes32) the hash which, when hashed with the correct inbox contract, will result in the correct intentHash
- `l2StorageProof` (bytes[]) storageProof showing that the intentHash has been fulfilled by checking against the claimant
- `rlpEncodedInboxData` (bytes) RLPEncoded data for the inbox contract on the destination chain used in the AccountProof
- `l2AccountProof` (bytes[]) The storageHash from the IntentInbox storageProof used in the AccountProof
- `l2WorldStateRoot` (bytes32) the stateRoot of the destination chain used in the AccountProof

<ins>Security:</ins> Proving that the intent has been fulfilled by ensuring that the Inbox contract has stored a claimant against that intentHash (updated at time of fulfillment) and that the block that the intent was fulfilled has already been settled from the destination chain to the settlement chain by checking the stateRoot for the destination chain ensures that the intent has been fulfilled and the claimant can now claim their funds on the source chain.
