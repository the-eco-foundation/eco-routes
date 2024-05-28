# Eco Association

Copyright (c) 2023 Eco Association

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

