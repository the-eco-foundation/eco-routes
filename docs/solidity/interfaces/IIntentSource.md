# Eco Association

Copyright (c) 2023 Eco Association

## IIntentSource

This contract is the source chain portion of the Eco Protocol's intent system.

It can be used to create intents as well as withdraw the associated rewards.
Its counterpart is the inbox contract that lives on the destination chain.
This contract makes a call to the prover contract (on the source chain) in order to verify intent fulfillment.

### UnauthorizedWithdrawal

emitted on a call to withdraw() by someone who is not entitled to the rewards for a
given intent.

```solidity
error UnauthorizedWithdrawal(bytes32 _identifier)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier of the intent on which withdraw was attempted |

### NothingToWithdraw

emitted on a call to withdraw() for an intent whose rewards have already been withdrawn.

```solidity
error NothingToWithdraw(bytes32 _identifier)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier of the intent on which withdraw was attempted |

### ExpiryTooSoon

emitted on a call to createIntent where _expiry is less than MINIMUM_DURATION
seconds later than the block timestamp at time of call

```solidity
error ExpiryTooSoon()
```

### CalldataMismatch

emitted on a call to createIntent where _targets and _data have different lengths, or when one of their lengths is zero.

```solidity
error CalldataMismatch()
```

### RewardsMismatch

emitted on a call to createIntent where _rewardTokens and _rewardAmounts have different lengths, or when one of their lengths is zero.

```solidity
error RewardsMismatch()
```

### IntentCreated

emitted on a successful call to createIntent

```solidity
event IntentCreated(bytes32 _identifier, address _creator, uint256 _destinationChain, address[] _targets, bytes[] _data, address[] _rewardTokens, uint256[] _rewardAmounts, uint256 _expiryTime)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the key of the intents mapping that can be used to fetch the intent |
| _creator | address | the address that created the intent |
| _destinationChain | uint256 | the destination chain |
| _targets | address[] | the address on _destinationChain at which the instruction sets need to be executed |
| _data | bytes[] | the instructions to be executed on _targets |
| _rewardTokens | address[] | the addresses of reward tokens |
| _rewardAmounts | uint256[] | the amounts of reward tokens |
| _expiryTime | uint256 | the time by which the storage proof must have been created in order for the solver to redeem rewards. |

### Withdrawal

emitted on successful call to withdraw

```solidity
event Withdrawal(bytes32 _identifier, address _recipient)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier of the intent on which withdraw was attempted |
| _recipient | address | the address that received the rewards for this intent |

### createIntent

Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.

_If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
The inbox contract on the destination chain will be the msg.sender for the instructions that are executed._

```solidity
function createIntent(uint256 _destinationChain, address[] _targets, bytes[] _data, address[] _rewardTokens, uint256[] _rewardAmounts, uint256 _expiryTime) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _destinationChain | uint256 | the destination chain |
| _targets | address[] | the addresses on _destinationChain at which the instruction sets need to be executed |
| _data | bytes[] | the instructions to be executed on _targets |
| _rewardTokens | address[] | the addresses of reward tokens |
| _rewardAmounts | uint256[] | the amounts of reward tokens |
| _expiryTime | uint256 | the time by which the storage proof must have been created in order for the solver to redeem rewards. |

### withdrawRewards

allows withdrawal of reward funds locked up for a given intent

```solidity
function withdrawRewards(bytes32 _identifier) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the key corresponding to this intent in the intents mapping |

### getTargets

fetches targets array from intent

```solidity
function getTargets(bytes32 _identifier) external view returns (address[])
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier for the intent |

### getData

fetches data array from intent

```solidity
function getData(bytes32 _identifier) external view returns (bytes[])
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier for the intent |

### getRewardTokens

fetches reward tokens array from intent

```solidity
function getRewardTokens(bytes32 _identifier) external view returns (address[])
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier for the intent |

### getRewardAmounts

fetches reward amounts array from intent

```solidity
function getRewardAmounts(bytes32 _identifier) external view returns (uint256[])
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _identifier | bytes32 | the identifier for the intent |

