# Eco Association

Copyright (c) 2023 Eco Association

## IL1Block

### number

The latest L1 block number known by the L2 system.

```solidity
function number() external view returns (uint64)
```

### timestamp

The latest L1 timestamp known by the L2 system.

```solidity
function timestamp() external view returns (uint64)
```

### basefee

The latest L1 base fee.

```solidity
function basefee() external view returns (uint256)
```

### hash

The latest L1 blockhash.

```solidity
function hash() external view returns (bytes32)
```

### sequenceNumber

The number of L2 blocks in the same epoch.

```solidity
function sequenceNumber() external view returns (uint64)
```

### blobBaseFeeScalar

The scalar value applied to the L1 blob base fee portion of the blob-capable L1 cost func.

```solidity
function blobBaseFeeScalar() external view returns (uint32)
```

### baseFeeScalar

The scalar value applied to the L1 base fee portion of the blob-capable L1 cost func.

```solidity
function baseFeeScalar() external view returns (uint32)
```

### batcherHash

The versioned hash to authenticate the batcher by.

```solidity
function batcherHash() external view returns (bytes32)
```

### l1FeeOverhead

The overhead value applied to the L1 portion of the transaction fee.
@custom:legacy

```solidity
function l1FeeOverhead() external view returns (uint256)
```

### l1FeeScalar

The scalar value applied to the L1 portion of the transaction fee.
@custom:legacy

```solidity
function l1FeeScalar() external view returns (uint256)
```

### blobBaseFee

The latest L1 blob base fee.

```solidity
function blobBaseFee() external view returns (uint256)
```

### setL1BlockValues

@custom:legacy
Updates the L1 block values.

```solidity
function setL1BlockValues(uint64 _number, uint64 _timestamp, uint256 _basefee, bytes32 _hash, uint64 _sequenceNumber, bytes32 _batcherHash, uint256 _l1FeeOverhead, uint256 _l1FeeScalar) external
```
#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _number | uint64 | L1 blocknumber. |
| _timestamp | uint64 | L1 timestamp. |
| _basefee | uint256 | L1 basefee. |
| _hash | bytes32 | L1 blockhash. |
| _sequenceNumber | uint64 | Number of L2 blocks since epoch start. |
| _batcherHash | bytes32 | Versioned hash to authenticate batcher by. |
| _l1FeeOverhead | uint256 | L1 fee overhead. |
| _l1FeeScalar | uint256 | L1 fee scalar. |

