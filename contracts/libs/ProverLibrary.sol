// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";

library ProverLibrary {
    uint256 internal constant L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT =
        0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1;

    // Output slot for the game status (aaaaa)
    uint256 internal constant L2_FAULT_DISPUTE_GAME_STATUS_SLOT = 0;

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

    struct DisputeGameFactoryProofData {
        bytes32 messagePasserStateRoot;
        bytes32 latestBlockHash;
        uint256 gameIndex;
        bytes32 gameId;
        bytes[] disputeFaultGameStorageProof;
        bytes rlpEncodedDisputeGameFactoryData;
        bytes[] disputeGameFactoryAccountProof;
    }

    struct ChainConfigurationKey {
        uint256 chainId;
        ProvingMechanism provingMechanism;
    }

    struct ChainConfiguration {
        bool exists;
        uint256 settlementChainId;
        address settlementContract;
        address blockhashOracle;
        uint256 outputRootVersionNumber;
        uint256 provingTimeSeconds;
        uint256 finalityDelaySeconds;
    }

    struct ChainConfigurationConstructor {
        ChainConfigurationKey chainConfigurationKey;
        ChainConfiguration chainConfiguration;
    }

    // map the chain id to ProvingMechanism to chain configuration
    // mapping(uint256 => mapping(ProvingMechanism => ChainConfiguration)) public chainConfigurations;

    struct BlockProofKey {
        uint256 chainId;
        SettlementType settlementType;
    }

    struct BlockProof {
        uint256 blockNumber;
        bytes32 blockHash;
        bytes32 stateRoot;
    }

    // Store the last BlockProof for each ChainId
    // mapping(uint256 => mapping(SettlementType => BlockProof)) public provenStates;

    // The settlement type for the chain
    enum SettlementType {
        Finalized, // Finalized Block information has been posted and resolved on the settlement chain
        Posted, // Settlement Block information has been posted on the settlement chain
        Confirmed // Block is confirmed on the local chain

    }
    // The proving mechanism for the chain
    enum ProvingMechanism {
        Self, // Destination is Self
        Settlement, // Source Chain is an L2, Destination is A L1 Settlement Chain
        SettlementL3, // Source Chain is an L3, Destination is a L2 Settlement Chain
        Bedrock, // Source Chain is an L2, Destination Chain is an L2 using Bedrock
        Cannon, // Source Chain is an L2, Destination Chain is an L2 using Cannon
        HyperProver //HyperProver

    }

    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) internal pure {
        require(SecureMerkleTrie.verifyInclusionProof(_key, _val, _proof, _root), "failed to prove storage");
    }

    function proveAccount(bytes memory _address, bytes memory _data, bytes[] memory _proof, bytes32 _root)
        internal
        pure
    {
        require(SecureMerkleTrie.verifyInclusionProof(_address, _data, _proof, _root), "failed to prove account");
    }

    function generateOutputRoot(
        uint256 provingVersion,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(provingVersion, worldStateRoot, messagePasserStateRoot, latestBlockHash));
    }

    // helper function for getting all rlp data encoded
    function rlpEncodeDataLibList(bytes[] memory dataList) internal pure returns (bytes memory) {
        for (uint256 i = 0; i < dataList.length; ++i) {
            dataList[i] = RLPWriter.writeBytes(dataList[i]);
        }

        return RLPWriter.writeList(dataList);
    }
    /// @notice Packs values into a 32 byte GameId type.
    /// @param _gameType The game type.
    /// @param _timestamp The timestamp of the game's creation.
    /// @param _gameProxy The game proxy address.
    /// @return gameId_ The packed GameId.

    function pack(uint32 _gameType, uint64 _timestamp, address _gameProxy) internal pure returns (bytes32 gameId_) {
        assembly {
            gameId_ := or(or(shl(224, _gameType), shl(160, _timestamp)), _gameProxy)
        }
    }

    /// @notice Unpacks values from a 32 byte GameId type.
    /// @param _gameId The packed GameId.
    /// @return gameType_ The game type.
    /// @return timestamp_ The timestamp of the game's creation.
    /// @return gameProxy_ The game proxy address.
    function unpack(bytes32 _gameId) internal pure returns (uint32 gameType_, uint64 timestamp_, address gameProxy_) {
        assembly {
            gameType_ := shr(224, _gameId)
            timestamp_ := and(shr(160, _gameId), 0xFFFFFFFFFFFFFFFF)
            gameProxy_ := and(_gameId, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        }
    }

    function bytesToUint(bytes memory b) internal pure returns (uint256) {
        uint256 number;
        for (uint256 i = 0; i < b.length; i++) {
            number = number + uint256(uint8(b[i])) * (2 ** (8 * (b.length - (i + 1))));
        }
        return number;
    }

    function assembleGameStatusStorage(
        uint64 createdAt,
        uint64 resolvedAt,
        uint8 gameStatus,
        bool initialized,
        bool l2BlockNumberChallenged
    ) internal pure returns (bytes memory gameStatusStorageSlotRLP) {
        // The if test is to remove leaing zeroes from the bytes
        // Assumption is that initialized is always true
        if (l2BlockNumberChallenged) {
            gameStatusStorageSlotRLP = bytes.concat(
                RLPWriter.writeBytes(
                    abi.encodePacked(
                        abi.encodePacked(l2BlockNumberChallenged),
                        abi.encodePacked(initialized),
                        abi.encodePacked(gameStatus),
                        abi.encodePacked(resolvedAt),
                        abi.encodePacked(createdAt)
                    )
                )
            );
        } else {
            gameStatusStorageSlotRLP = bytes.concat(
                RLPWriter.writeBytes(
                    abi.encodePacked(
                        // abi.encodePacked(l2BlockNumberChallenged),
                        abi.encodePacked(initialized),
                        abi.encodePacked(gameStatus),
                        abi.encodePacked(resolvedAt),
                        abi.encodePacked(createdAt)
                    )
                )
            );
        }
    }

    function faultDisputeGameIsResolved(
        bytes32 rootClaim,
        address faultDisputeGameProxyAddress,
        FaultDisputeGameProofData memory faultDisputeGameProofData,
        bytes32 l1WorldStateRoot
    ) internal pure {
        require(
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.gameStatus == 2, "faultDisputeGame not resolved"
        ); // ensure faultDisputeGame is resolved
        // Prove that the FaultDispute game has been settled
        // storage proof for FaultDisputeGame rootClaim (means block is valid)
        proveStorage(
            abi.encodePacked(uint256(L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT)),
            bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(rootClaim)),
            faultDisputeGameProofData.faultDisputeGameRootClaimStorageProof,
            bytes32(faultDisputeGameProofData.faultDisputeGameStateRoot)
        );

        bytes memory faultDisputeGameStatusStorage = assembleGameStatusStorage(
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.createdAt,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.resolvedAt,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.gameStatus,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.initialized,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.l2BlockNumberChallenged
        );
        // faultDisputeGameProofData.faultDisputeGameStatusSlotData.filler
        // storage proof for FaultDisputeGame status (showing defender won)
        proveStorage(
            abi.encodePacked(uint256(L2_FAULT_DISPUTE_GAME_STATUS_SLOT)),
            faultDisputeGameStatusStorage,
            faultDisputeGameProofData.faultDisputeGameStatusStorageProof,
            bytes32(faultDisputeGameProofData.faultDisputeGameStateRoot)
        );

        // The Account Proof for FaultDisputeGameFactory
        proveAccount(
            abi.encodePacked(faultDisputeGameProxyAddress),
            faultDisputeGameProofData.rlpEncodedFaultDisputeGameData,
            faultDisputeGameProofData.faultDisputeGameAccountProof,
            l1WorldStateRoot
        );
    }

    function getProvenState(
        uint256 chainId,
        ProvingMechanism provingMechanism,
        mapping(uint256 => mapping(ProvingMechanism => ChainConfiguration)) storage chainConfigurations,
        mapping(uint256 => mapping(SettlementType => BlockProof)) storage provenStates
    )
        internal
        view
        returns (
            ChainConfiguration memory chainConfiguration,
            BlockProofKey memory blockProofKey,
            BlockProof memory blockProof
        )
    {
        if (provingMechanism == ProvingMechanism.Bedrock) {
            chainConfiguration = chainConfigurations[chainId][ProvingMechanism.Bedrock];
            {
                if (chainConfiguration.settlementChainId != block.chainid) {
                    blockProof = provenStates[chainConfiguration.settlementChainId][SettlementType.Finalized];
                    blockProofKey = BlockProofKey({chainId: chainId, settlementType: SettlementType.Finalized});
                } else {
                    blockProof = provenStates[chainConfiguration.settlementChainId][SettlementType.Confirmed];
                    blockProofKey = BlockProofKey({chainId: chainId, settlementType: SettlementType.Confirmed});
                }
            }
        }
        return (chainConfiguration, blockProofKey, blockProof);
    }
}
