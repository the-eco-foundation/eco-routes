# Eco Association

Copyright (c) 2023 Eco Association

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

minimum duration of an intent, in seconds.
Intents cannot expire less than MINIMUM_DURATION seconds after they are created.

```solidity
uint256 MINIMUM_DURATION
```

### intents

```solidity
mapping(bytes32 => struct Intent) intents
```

### constructor

```solidity
constructor(address _prover, uint256 _minimumDuration) public
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _prover | address | the prover address |
| _minimumDuration | uint256 | the minimum duration of an intent originating on this chain |

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
| _targets | address[] | the addresses on _destinationChain at which the instructions need to be executed |
| _data | bytes[] | the instruction sets to be executed on _targets |
| _rewardTokens | address[] | the addresses of reward tokens |
| _rewardAmounts | uint256[] | the amounts of reward tokens |
| _expiryTime | uint256 | the timestamp at which the intent expires |

### emitIntentCreated

```solidity
function emitIntentCreated(bytes32 _identifier, struct Intent _intent) internal
```

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

