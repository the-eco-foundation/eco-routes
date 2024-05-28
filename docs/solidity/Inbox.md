# Eco Association

Copyright (c) 2023 Eco Association

## Inbox

**Inbox**

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

This function is the main entry point for fulfilling an intent. It validates that the hash is the hash of the other parameters.
It then calls the addresses with the calldata, and if successful marks the intent as fulfilled and emits an event.

```solidity
function fulfill(bytes32 _nonce, address[] _targets, bytes[] _datas, uint256 _expireTimestamp, address _claimer) external returns (bytes[])
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _nonce | bytes32 | The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID |
| _targets | address[] | The addresses to call |
| _datas | bytes[] | The calldata to call |
| _expireTimestamp | uint256 | The timestamp at which the intent expires |
| _claimer | address | The address who can claim the reward on the src chain. Not part of the hash |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes[] | results The results of the calls as an array of bytes |

### encodeHash

This function encodes the hash of the intent parameters

```solidity
function encodeHash(bytes32 _nonce, address[] _callAddresses, bytes[] _callData, uint256 _expireTimestamp) internal pure returns (bytes32)
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _nonce | bytes32 | The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID |
| _callAddresses | address[] | The addresses to call |
| _callData | bytes[] | The calldata to call |
| _expireTimestamp | uint256 | The timestamp at which the intent expires |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | hash The hash of the intent parameters |

