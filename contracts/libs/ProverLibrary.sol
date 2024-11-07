// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";

library ProverLibrary {
    uint256 public constant L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT =
        0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1;

    // Output slot for the game status (aaaaa)
    uint256 public constant L2_FAULT_DISPUTE_GAME_STATUS_SLOT = 0;

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

    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) public pure {
        require(SecureMerkleTrie.verifyInclusionProof(_key, _val, _proof, _root), "failed to prove storage");
    }

    function proveAccount(bytes memory _address, bytes memory _data, bytes[] memory _proof, bytes32 _root)
        public
        pure
    {
        require(SecureMerkleTrie.verifyInclusionProof(_address, _data, _proof, _root), "failed to prove account");
    }

    function generateOutputRoot(
        uint256 provingVersion,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(provingVersion, worldStateRoot, messagePasserStateRoot, latestBlockHash));
    }

    // helper function for getting all rlp data encoded
    function rlpEncodeDataLibList(bytes[] memory dataList) public pure returns (bytes memory) {
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

    function pack(uint32 _gameType, uint64 _timestamp, address _gameProxy) public pure returns (bytes32 gameId_) {
        assembly {
            gameId_ := or(or(shl(224, _gameType), shl(160, _timestamp)), _gameProxy)
        }
    }

    /// @notice Unpacks values from a 32 byte GameId type.
    /// @param _gameId The packed GameId.
    /// @return gameType_ The game type.
    /// @return timestamp_ The timestamp of the game's creation.
    /// @return gameProxy_ The game proxy address.
    function unpack(bytes32 _gameId) public pure returns (uint32 gameType_, uint64 timestamp_, address gameProxy_) {
        assembly {
            gameType_ := shr(224, _gameId)
            timestamp_ := and(shr(160, _gameId), 0xFFFFFFFFFFFFFFFF)
            gameProxy_ := and(_gameId, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        }
    }

    function bytesToUint(bytes memory b) public pure returns (uint256) {
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
    ) public pure returns (bytes memory gameStatusStorageSlotRLP) {
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
    ) public pure {
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
}
