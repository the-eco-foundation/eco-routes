# Eco Association

Copyright (c) 2023 Eco Association

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

