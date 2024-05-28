# Eco Association

Copyright (c) 2023 Eco Association

## InboxInterface

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

