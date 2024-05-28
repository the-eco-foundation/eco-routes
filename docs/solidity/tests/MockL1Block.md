# Eco Association

Copyright (c) 2023 Eco Association

## MockL1Block

**L1Block**

@custom:proxied
The L1Block predeploy gives users access to information about the last known L1 block.
        Values within this contract are updated once per epoch (every L1 block) and can only be
        set by the "depositor" account, a special system address. Depositor account transactions
        are created by the protocol whenever we move to a new epoch.

### number

The latest L1 block number known by the L2 system.

```solidity
uint64 number
```

### timestamp

The latest L1 timestamp known by the L2 system.

```solidity
uint64 timestamp
```

### basefee

The latest L1 base fee.

```solidity
uint256 basefee
```

### hash

The latest L1 blockhash.

```solidity
bytes32 hash
```

### sequenceNumber

The number of L2 blocks in the same epoch.

```solidity
uint64 sequenceNumber
```

### blobBaseFeeScalar

The scalar value applied to the L1 blob base fee portion of the blob-capable L1 cost func.

```solidity
uint32 blobBaseFeeScalar
```

### baseFeeScalar

The scalar value applied to the L1 base fee portion of the blob-capable L1 cost func.

```solidity
uint32 baseFeeScalar
```

### batcherHash

The versioned hash to authenticate the batcher by.

```solidity
bytes32 batcherHash
```

### l1FeeOverhead

The overhead value applied to the L1 portion of the transaction fee.
@custom:legacy

```solidity
uint256 l1FeeOverhead
```

### l1FeeScalar

The scalar value applied to the L1 portion of the transaction fee.
@custom:legacy

```solidity
uint256 l1FeeScalar
```

### blobBaseFee

The latest L1 blob base fee.

```solidity
uint256 blobBaseFee
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

