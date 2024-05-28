# Solidity API

## Inbox

_The Inbox contract is the main entry point for fulfilling an intent.
It validates that the hash is the hash of the other parameters, and then executes the calldata.
A prover can then claim the reward on the src chain by looking at the fulfilled mapping._

### IntentFulfillment

Struct that stores the hash and address for a fulfilled intent.
Both of these fields are needed for a prover to claim the reward on t
the src chain

```solidity
struct IntentFulfillment {
  bytes32 hash;
  address claimer;
}
```

### fulfilled

```solidity
mapping(bytes32 => struct Inbox.IntentFulfillment) fulfilled
```

### validTimestamp

```solidity
modifier validTimestamp(uint256 _expireTimestamp)
```

### unfulfilled

```solidity
modifier unfulfilled(bytes32 _nonce)
```

### fulfill

```solidity
function fulfill(bytes32 _nonce, address[] _targets, bytes[] _datas, uint256 _expireTimestamp, address _claimer) external returns (bytes[])
```

This function is the main entry point for fulfilling an intent. It validates that the hash is the hash of the other parameters.
It then calls the addresses with the calldata, and if successful marks the intent as fulfilled and emits an event.

#### Parameters

| Name              | Type      | Description                                                                                  |
| ----------------- | --------- | -------------------------------------------------------------------------------------------- |
| \_nonce           | bytes32   | The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID |
| \_targets         | address[] | The addresses to call                                                                        |
| \_datas           | bytes[]   | The calldata to call                                                                         |
| \_expireTimestamp | uint256   | The timestamp at which the intent expires                                                    |
| \_claimer         | address   | The address who can claim the reward on the src chain. Not part of the hash                  |

#### Return Values

| Name | Type    | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| [0]  | bytes[] | results The results of the calls as an array of bytes |

### encodeHash

```solidity
function encodeHash(bytes32 _nonce, address[] _callAddresses, bytes[] _callData, uint256 _expireTimestamp) internal pure returns (bytes32)
```

This function encodes the hash of the intent parameters

#### Parameters

| Name              | Type      | Description                                                                                  |
| ----------------- | --------- | -------------------------------------------------------------------------------------------- |
| \_nonce           | bytes32   | The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID |
| \_callAddresses   | address[] | The addresses to call                                                                        |
| \_callData        | bytes[]   | The calldata to call                                                                         |
| \_expireTimestamp | uint256   | The timestamp at which the intent expires                                                    |

#### Return Values

| Name | Type    | Description                            |
| ---- | ------- | -------------------------------------- |
| [0]  | bytes32 | hash The hash of the intent parameters |

## InboxInterface

### fulfill

```solidity
function fulfill(bytes32 _nonce, address[] _targets, bytes[] _datas, uint256 _expireTimestamp, address _claimer) external returns (bytes[])
```

This function is the main entry point for fulfilling an intent. It validates that the hash is the hash of the other parameters.
It then calls the addresses with the calldata, and if successful marks the intent as fulfilled and emits an event.

#### Parameters

| Name              | Type      | Description                                                                                  |
| ----------------- | --------- | -------------------------------------------------------------------------------------------- |
| \_nonce           | bytes32   | The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID |
| \_targets         | address[] | The addresses to call                                                                        |
| \_datas           | bytes[]   | The calldata to call                                                                         |
| \_expireTimestamp | uint256   | The timestamp at which the intent expires                                                    |
| \_claimer         | address   | The address who can claim the reward on the src chain. Not part of the hash                  |

#### Return Values

| Name | Type    | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| [0]  | bytes[] | results The results of the calls as an array of bytes |

### Fulfillment

```solidity
event Fulfillment(bytes32 _nonce)
```

### IntentExpired

```solidity
error IntentExpired()
```

### IntentAlreadyFulfilled

```solidity
error IntentAlreadyFulfilled(bytes32 _nonce)
```

### IntentCallFailed

```solidity
error IntentCallFailed(address _addr, bytes _data, bytes _returnData)
```

## IntentSource

This contract is the source chain portion of the Eco Protocol's intent system.

It can be used to create intents as well as withdraw the associated rewards.
Its counterpart is the inbox contract that lives on the destination chain.
This contract makes a call to the prover contract (on the sourcez chain) in order to verify intent fulfillment.

### CHAIN_ID

```solidity
uint256 CHAIN_ID
```

### PROVER

```solidity
contract IProver PROVER
```

### counter

```solidity
uint256 counter
```

### MINIMUM_DURATION

```solidity
uint256 MINIMUM_DURATION
```

minimum duration of an intent, in seconds.
Intents cannot expire less than MINIMUM_DURATION seconds after they are created.

### intents

```solidity
mapping(bytes32 => struct Intent) intents
```

### constructor

```solidity
constructor(address _prover, uint256 _minimumDuration) public
```

#### Parameters

| Name              | Type    | Description                                                 |
| ----------------- | ------- | ----------------------------------------------------------- |
| \_prover          | address | the prover address                                          |
| \_minimumDuration | uint256 | the minimum duration of an intent originating on this chain |

### createIntent

```solidity
function createIntent(uint256 _destinationChain, address[] _targets, bytes[] _data, address[] _rewardTokens, uint256[] _rewardAmounts, uint256 _expiryTime) external
```

Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.

_If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
The inbox contract on the destination chain will be the msg.sender for the instructions that are executed._

#### Parameters

| Name               | Type      | Description                                                                       |
| ------------------ | --------- | --------------------------------------------------------------------------------- |
| \_destinationChain | uint256   | the destination chain                                                             |
| \_targets          | address[] | the addresses on \_destinationChain at which the instructions need to be executed |
| \_data             | bytes[]   | the instruction sets to be executed on \_targets                                  |
| \_rewardTokens     | address[] | the addresses of reward tokens                                                    |
| \_rewardAmounts    | uint256[] | the amounts of reward tokens                                                      |
| \_expiryTime       | uint256   | the timestamp at which the intent expires                                         |

### emitIntentCreated

```solidity
function emitIntentCreated(bytes32 _identifier, struct Intent _intent) internal
```

### withdrawRewards

```solidity
function withdrawRewards(bytes32 _identifier) external
```

allows withdrawal of reward funds locked up for a given intent

#### Parameters

| Name         | Type    | Description                                                 |
| ------------ | ------- | ----------------------------------------------------------- |
| \_identifier | bytes32 | the key corresponding to this intent in the intents mapping |

### getTargets

```solidity
function getTargets(bytes32 identifier) public view returns (address[])
```

### getData

```solidity
function getData(bytes32 identifier) public view returns (bytes[])
```

### getRewardTokens

```solidity
function getRewardTokens(bytes32 identifier) public view returns (address[])
```

### getRewardAmounts

```solidity
function getRewardAmounts(bytes32 identifier) public view returns (uint256[])
```

## Prover

### NONCE_PACKING

```solidity
uint16 NONCE_PACKING
```

### L2_OUTPUT_SLOT_NUMBER

```solidity
uint256 L2_OUTPUT_SLOT_NUMBER
```

### L2_OUTPUT_ROOT_VERSION_NUMBER

```solidity
uint256 L2_OUTPUT_ROOT_VERSION_NUMBER
```

### L1_OUTPUT_ORACLE_ADDRESS

```solidity
address L1_OUTPUT_ORACLE_ADDRESS
```

### l1BlockhashOracle

```solidity
contract IL1Block l1BlockhashOracle
```

### provenL1States

```solidity
mapping(bytes32 => uint256) provenL1States
```

### provenL2States

```solidity
mapping(bytes32 => uint256) provenL2States
```

### provenIntents

```solidity
mapping(bytes32 => address) provenIntents
```

### constructor

```solidity
constructor(address _l1BlockhashOracle) public
```

### proveStorage

```solidity
function proveStorage(bytes _key, bytes _val, bytes[] _proof, bytes32 _root) public pure
```

### proveAccount

```solidity
function proveAccount(bytes _address, bytes _data, bytes[] _proof, bytes32 _root) public pure
```

### generateOutputRoot

```solidity
function generateOutputRoot(uint256 version, bytes32 worldStateRoot, bytes32 messagePasserStateRoot, bytes32 latestBlockHash) public pure returns (bytes32)
```

### rlpEncodeDataLibList

```solidity
function rlpEncodeDataLibList(bytes[] dataList) public pure returns (bytes)
```

### proveL1WorldState

```solidity
function proveL1WorldState(bytes rlpEncodedL1BlockData) public
```

### proveOutputRoot

```solidity
function proveOutputRoot(bytes32 l2WorldStateRoot, bytes32 l2MessagePasserStateRoot, bytes32 l2LatestBlockHash, uint256 l2OutputIndex, bytes[] l1StorageProof, bytes rlpEncodedOutputOracleData, bytes[] l1AccountProof, bytes32 l1WorldStateRoot) public
```

### proveIntent

```solidity
function proveIntent(address claimant, address inboxContract, bytes32 intentHash, uint256 intentOutputIndex, bytes[] l2StorageProof, bytes rlpEncodedInboxData, bytes[] l2AccountProof, bytes32 l2WorldStateRoot) public
```

## IIntentSource

This contract is the source chain portion of the Eco Protocol's intent system.

It can be used to create intents as well as withdraw the associated rewards.
Its counterpart is the inbox contract that lives on the destination chain.
This contract makes a call to the prover contract (on the source chain) in order to verify intent fulfillment.

### UnauthorizedWithdrawal

```solidity
error UnauthorizedWithdrawal(bytes32 _identifier)
```

emitted on a call to withdraw() by someone who is not entitled to the rewards for a
given intent.

#### Parameters

| Name         | Type    | Description                                                  |
| ------------ | ------- | ------------------------------------------------------------ |
| \_identifier | bytes32 | the identifier of the intent on which withdraw was attempted |

### NothingToWithdraw

```solidity
error NothingToWithdraw(bytes32 _identifier)
```

emitted on a call to withdraw() for an intent whose rewards have already been withdrawn.

#### Parameters

| Name         | Type    | Description                                                  |
| ------------ | ------- | ------------------------------------------------------------ |
| \_identifier | bytes32 | the identifier of the intent on which withdraw was attempted |

### ExpiryTooSoon

```solidity
error ExpiryTooSoon()
```

emitted on a call to createIntent where \_expiry is less than MINIMUM_DURATION
seconds later than the block timestamp at time of call

### CalldataMismatch

```solidity
error CalldataMismatch()
```

emitted on a call to createIntent where \_targets and \_data have different lengths, or when one of their lengths is zero.

### RewardsMismatch

```solidity
error RewardsMismatch()
```

emitted on a call to createIntent where \_rewardTokens and \_rewardAmounts have different lengths, or when one of their lengths is zero.

### IntentCreated

```solidity
event IntentCreated(bytes32 _identifier, address _creator, uint256 _destinationChain, address[] _targets, bytes[] _data, address[] _rewardTokens, uint256[] _rewardAmounts, uint256 _expiryTime)
```

emitted on a successful call to createIntent

#### Parameters

| Name               | Type      | Description                                                                                           |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| \_identifier       | bytes32   | the key of the intents mapping that can be used to fetch the intent                                   |
| \_creator          | address   | the address that created the intent                                                                   |
| \_destinationChain | uint256   | the destination chain                                                                                 |
| \_targets          | address[] | the address on \_destinationChain at which the instruction sets need to be executed                   |
| \_data             | bytes[]   | the instructions to be executed on \_targets                                                          |
| \_rewardTokens     | address[] | the addresses of reward tokens                                                                        |
| \_rewardAmounts    | uint256[] | the amounts of reward tokens                                                                          |
| \_expiryTime       | uint256   | the time by which the storage proof must have been created in order for the solver to redeem rewards. |

### Withdrawal

```solidity
event Withdrawal(bytes32 _identifier, address _recipient)
```

emitted on successful call to withdraw

#### Parameters

| Name         | Type    | Description                                                  |
| ------------ | ------- | ------------------------------------------------------------ |
| \_identifier | bytes32 | the identifier of the intent on which withdraw was attempted |
| \_recipient  | address | the address that received the rewards for this intent        |

### createIntent

```solidity
function createIntent(uint256 _destinationChain, address[] _targets, bytes[] _data, address[] _rewardTokens, uint256[] _rewardAmounts, uint256 _expiryTime) external
```

Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.

_If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
The inbox contract on the destination chain will be the msg.sender for the instructions that are executed._

#### Parameters

| Name               | Type      | Description                                                                                           |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| \_destinationChain | uint256   | the destination chain                                                                                 |
| \_targets          | address[] | the addresses on \_destinationChain at which the instruction sets need to be executed                 |
| \_data             | bytes[]   | the instructions to be executed on \_targets                                                          |
| \_rewardTokens     | address[] | the addresses of reward tokens                                                                        |
| \_rewardAmounts    | uint256[] | the amounts of reward tokens                                                                          |
| \_expiryTime       | uint256   | the time by which the storage proof must have been created in order for the solver to redeem rewards. |

### withdrawRewards

```solidity
function withdrawRewards(bytes32 _identifier) external
```

allows withdrawal of reward funds locked up for a given intent

#### Parameters

| Name         | Type    | Description                                                 |
| ------------ | ------- | ----------------------------------------------------------- |
| \_identifier | bytes32 | the key corresponding to this intent in the intents mapping |

### getTargets

```solidity
function getTargets(bytes32 _identifier) external view returns (address[])
```

fetches targets array from intent

#### Parameters

| Name         | Type    | Description                   |
| ------------ | ------- | ----------------------------- |
| \_identifier | bytes32 | the identifier for the intent |

### getData

```solidity
function getData(bytes32 _identifier) external view returns (bytes[])
```

fetches data array from intent

#### Parameters

| Name         | Type    | Description                   |
| ------------ | ------- | ----------------------------- |
| \_identifier | bytes32 | the identifier for the intent |

### getRewardTokens

```solidity
function getRewardTokens(bytes32 _identifier) external view returns (address[])
```

fetches reward tokens array from intent

#### Parameters

| Name         | Type    | Description                   |
| ------------ | ------- | ----------------------------- |
| \_identifier | bytes32 | the identifier for the intent |

### getRewardAmounts

```solidity
function getRewardAmounts(bytes32 _identifier) external view returns (uint256[])
```

fetches reward amounts array from intent

#### Parameters

| Name         | Type    | Description                   |
| ------------ | ------- | ----------------------------- |
| \_identifier | bytes32 | the identifier for the intent |

## IL1Block

### number

```solidity
function number() external view returns (uint64)
```

The latest L1 block number known by the L2 system.

### timestamp

```solidity
function timestamp() external view returns (uint64)
```

The latest L1 timestamp known by the L2 system.

### basefee

```solidity
function basefee() external view returns (uint256)
```

The latest L1 base fee.

### hash

```solidity
function hash() external view returns (bytes32)
```

The latest L1 blockhash.

### sequenceNumber

```solidity
function sequenceNumber() external view returns (uint64)
```

The number of L2 blocks in the same epoch.

### blobBaseFeeScalar

```solidity
function blobBaseFeeScalar() external view returns (uint32)
```

The scalar value applied to the L1 blob base fee portion of the blob-capable L1 cost func.

### baseFeeScalar

```solidity
function baseFeeScalar() external view returns (uint32)
```

The scalar value applied to the L1 base fee portion of the blob-capable L1 cost func.

### batcherHash

```solidity
function batcherHash() external view returns (bytes32)
```

The versioned hash to authenticate the batcher by.

### l1FeeOverhead

```solidity
function l1FeeOverhead() external view returns (uint256)
```

The overhead value applied to the L1 portion of the transaction fee.
@custom:legacy

### l1FeeScalar

```solidity
function l1FeeScalar() external view returns (uint256)
```

The scalar value applied to the L1 portion of the transaction fee.
@custom:legacy

### blobBaseFee

```solidity
function blobBaseFee() external view returns (uint256)
```

The latest L1 blob base fee.

### setL1BlockValues

```solidity
function setL1BlockValues(uint64 _number, uint64 _timestamp, uint256 _basefee, bytes32 _hash, uint64 _sequenceNumber, bytes32 _batcherHash, uint256 _l1FeeOverhead, uint256 _l1FeeScalar) external
```

@custom:legacy
Updates the L1 block values.

#### Parameters

| Name             | Type    | Description                                |
| ---------------- | ------- | ------------------------------------------ |
| \_number         | uint64  | L1 blocknumber.                            |
| \_timestamp      | uint64  | L1 timestamp.                              |
| \_basefee        | uint256 | L1 basefee.                                |
| \_hash           | bytes32 | L1 blockhash.                              |
| \_sequenceNumber | uint64  | Number of L2 blocks since epoch start.     |
| \_batcherHash    | bytes32 | Versioned hash to authenticate batcher by. |
| \_l1FeeOverhead  | uint256 | L1 fee overhead.                           |
| \_l1FeeScalar    | uint256 | L1 fee scalar.                             |

## IProver

### NONCE_PACKING

```solidity
function NONCE_PACKING() external view returns (uint16)
```

### L2_OUTPUT_SLOT_NUMBER

```solidity
function L2_OUTPUT_SLOT_NUMBER() external view returns (uint256)
```

### L2_OUTPUT_ROOT_VERSION_NUMBER

```solidity
function L2_OUTPUT_ROOT_VERSION_NUMBER() external view returns (uint256)
```

### L1_OUTPUT_ORACLE_ADDRESS

```solidity
function L1_OUTPUT_ORACLE_ADDRESS() external view returns (address)
```

### l1BlockhashOracle

```solidity
function l1BlockhashOracle() external view returns (address)
```

### provenL1States

```solidity
function provenL1States(bytes32) external view returns (uint256)
```

### provenL2States

```solidity
function provenL2States(bytes32) external view returns (uint256)
```

### provenIntents

```solidity
function provenIntents(bytes32) external view returns (address)
```

### rlpEncodeDataLibList

```solidity
function rlpEncodeDataLibList(bytes[] dataList) external pure returns (bytes)
```

### proveL1WorldState

```solidity
function proveL1WorldState(bytes rlpEncodedL1BlockData) external
```

### proveOutputRoot

```solidity
function proveOutputRoot(bytes32 l2WorldStateRoot, bytes32 l2MessagePasserStateRoot, bytes32 l2LatestBlockHash, uint256 l2OutputIndex, bytes[] l1StorageProof, bytes rlpEncodedOutputOracleData, bytes[] l1AccountProof, bytes32 l1WorldStateRoot) external
```

### proveIntent

```solidity
function proveIntent(address claimant, address inboxContract, bytes32 intentHash, uint256 intentOutputIndex, bytes[] l2StorageProof, bytes rlpEncodedInboxData, bytes[] l2AccountProof, bytes32 l2WorldStateRoot) external
```

## ERC20Test

### constructor

```solidity
constructor(string name_, string symbol_, uint256 amount) public
```

## IProver

### provenIntents

```solidity
function provenIntents(bytes32 _identifier) external returns (address)
```

## TestERC20

### constructor

```solidity
constructor(string name_, string symbol_) public
```

### mint

```solidity
function mint(address recipient, uint256 amount) public
```

## TestProver

### provenIntents

```solidity
mapping(bytes32 => address) provenIntents
```

### addProvenIntent

```solidity
function addProvenIntent(bytes32 identifier, address withdrawableBy) public
```

## MockL1Block

@custom:proxied
The L1Block predeploy gives users access to information about the last known L1 block.
Values within this contract are updated once per epoch (every L1 block) and can only be
set by the "depositor" account, a special system address. Depositor account transactions
are created by the protocol whenever we move to a new epoch.

### number

```solidity
uint64 number
```

The latest L1 block number known by the L2 system.

### timestamp

```solidity
uint64 timestamp
```

The latest L1 timestamp known by the L2 system.

### basefee

```solidity
uint256 basefee
```

The latest L1 base fee.

### hash

```solidity
bytes32 hash
```

The latest L1 blockhash.

### sequenceNumber

```solidity
uint64 sequenceNumber
```

The number of L2 blocks in the same epoch.

### blobBaseFeeScalar

```solidity
uint32 blobBaseFeeScalar
```

The scalar value applied to the L1 blob base fee portion of the blob-capable L1 cost func.

### baseFeeScalar

```solidity
uint32 baseFeeScalar
```

The scalar value applied to the L1 base fee portion of the blob-capable L1 cost func.

### batcherHash

```solidity
bytes32 batcherHash
```

The versioned hash to authenticate the batcher by.

### l1FeeOverhead

```solidity
uint256 l1FeeOverhead
```

The overhead value applied to the L1 portion of the transaction fee.
@custom:legacy

### l1FeeScalar

```solidity
uint256 l1FeeScalar
```

The scalar value applied to the L1 portion of the transaction fee.
@custom:legacy

### blobBaseFee

```solidity
uint256 blobBaseFee
```

The latest L1 blob base fee.

### setL1BlockValues

```solidity
function setL1BlockValues(uint64 _number, uint64 _timestamp, uint256 _basefee, bytes32 _hash, uint64 _sequenceNumber, bytes32 _batcherHash, uint256 _l1FeeOverhead, uint256 _l1FeeScalar) external
```

@custom:legacy
Updates the L1 block values.

#### Parameters

| Name             | Type    | Description                                |
| ---------------- | ------- | ------------------------------------------ |
| \_number         | uint64  | L1 blocknumber.                            |
| \_timestamp      | uint64  | L1 timestamp.                              |
| \_basefee        | uint256 | L1 basefee.                                |
| \_hash           | bytes32 | L1 blockhash.                              |
| \_sequenceNumber | uint64  | Number of L2 blocks since epoch start.     |
| \_batcherHash    | bytes32 | Versioned hash to authenticate batcher by. |
| \_l1FeeOverhead  | uint256 | L1 fee overhead.                           |
| \_l1FeeScalar    | uint256 | L1 fee scalar.                             |

## Intent

```solidity
struct Intent {
  address creator;
  uint256 destinationChain;
  address[] targets;
  bytes[] data;
  address[] rewardTokens;
  uint256[] rewardAmounts;
  uint256 expiryTime;
  bool hasBeenWithdrawn;
  bytes32 intentHash;
}
```
