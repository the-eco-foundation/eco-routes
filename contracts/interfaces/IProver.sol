// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IProver {
    struct ChainConfiguration {
        uint8 provingMechanism;
        uint256 settlementChainId;
        address settlementContract;
        address blockhashOracle;
        uint256 outputRootVersionNumber;
    }

    struct BlockProof {
        uint256 blockNumber;
        bytes32 blockHash;
        bytes32 stateRoot;
    }

    struct DisputeGameFactoryProofData {
        bytes32 l2MessagePasserStateRoot;
        bytes32 l2LatestBlockHash;
        uint256 gameIndex;
        bytes32 gameId;
        bytes[] l1DisputeFaultGameStorageProof;
        bytes rlpEncodedDisputeGameFactoryData;
        bytes[] disputeGameFactoryAccountProof;
    }

    struct FaultDisputeGameStatusSlotData {
        uint64 createdAt;
        uint64 resolvedAt;
        uint8 gameStatus;
        bool initialized;
        bool l2BlockNumberChallenged;
    }

    struct FaultDisputeGameProofData {
        bytes32 faultDisputeGameStateRoot;
        bytes[] faultDisputeGameRootClaimStorageProof;
        FaultDisputeGameStatusSlotData faultDisputeGameStatusSlotData;
        bytes[] faultDisputeGameStatusStorageProof;
        bytes rlpEncodedFaultDisputeGameData;
        bytes[] faultDisputeGameAccountProof;
    }

    function L2_OUTPUT_SLOT_NUMBER() external view returns (uint256);

    function L2_OUTPUT_ROOT_VERSION_NUMBER() external view returns (uint256);

    function L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER() external view returns (uint256);

    function L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT() external view returns (uint256);

    function l1BlockhashOracle() external view returns (address);

    function provenStates(uint256) external view returns (BlockProof memory);

    function provenIntents(bytes32) external view returns (address);

    // useful helper functions but should probably be removed
    function rlpEncodeDataLibList(bytes[] memory dataList) external pure returns (bytes memory);
    function unpack(bytes32 _gameId) external pure returns (uint32 gameType_, uint64 timestamp_, address gameProxy_);

    function proveSettlementLayerState(bytes calldata rlpEncodedL1BlockData) external;

    function proveWorldStateBedrock(
        uint256 chainId, //the destination chain id of the intent we are proving
        bytes calldata rlpEncodedBlockData,
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedOutputOracleData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) external;

    function proveWorldStateCannon(
        uint256 chainId, //the destination chain id of the intent we are proving
        bytes calldata rlpEncodedBlockData,
        bytes32 l2WorldStateRoot,
        DisputeGameFactoryProofData calldata disputeGameFactoryProofData,
        FaultDisputeGameProofData memory faultDisputeGameProofData,
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
