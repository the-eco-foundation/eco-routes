// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IProver {
    function NONCE_PACKING() external view returns (uint16);

    function L2_OUTPUT_SLOT_NUMBER() external view returns (uint256);

    function L2_OUTPUT_ROOT_VERSION_NUMBER() external view returns (uint256);

    function L1_OUTPUT_ORACLE_ADDRESS() external view returns (address);

    function l1BlockhashOracle() external view returns (address);

    // mapping from l1 world state root hashes to block numbers they correspond to
    function provenL1States(bytes32) external view returns (uint256);

    function provenL2States(bytes32) external view returns (uint256);

    function provenIntents(bytes32) external view returns (address);

    // useful helper function but should probably be removed
    function rlpEncodeDataLibList(bytes[] memory dataList) external pure returns (bytes memory);

    function proveL1WorldState(bytes calldata rlpEncodedL1BlockData) external;

    function proveL2WorldStateBedrock(
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        bytes32 l2LatestBlockHash,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedOutputOracleData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) external;

    function proveIntent(
        address claimant,
        address inboxContract,
        bytes32 intentHash,
        uint256 intentOutputIndex,
        bytes[] calldata l2StorageProof,
        bytes calldata rlpEncodedInboxData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) external;
}
