// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";

contract SimpleStorage {
    /* 
        // Calculation Logic
        bytes32 _rootClaim = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER,
            l2WorldStateRoot,
            disputeGameFactoryProofData.messagePasserStateRoot,
            disputeGameFactoryProofData.latestBlockHash
        );
    */
    bytes32 public slot0OutputRoot = 0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95;
    bytes32 public slot1OutputRoot = 0x0000000051ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95;

    /*
        // Calculation Logic
        bytes32 gameId = disputeGameFactoryProofData.gameId;
        bytes24 gameId24;
        bytes29 gameId29;
        bytes memory _value;
        assembly {
            gameId24 := shl(64, gameId)
        }
        assembly {
            gameId29 := shl(24, gameId)
        }
        if (bytes1(uint8(gameId29[0])) == bytes1(uint8(0x00))) {
            _value = RLPWriter.writeBytes(abi.encodePacked(gameId24));
        } else {
            _value = RLPWriter.writeBytes(abi.encodePacked(gameId29));
        }
    */
    bytes32 public slot2gameId = 0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95;
    bytes32 public slot3gameId = 0x000000000000000000000000000000000000000407ef388ae4cde1f592306c95;

    bytes24 public slot4gameId24 = 0xf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95;
    bytes24 public slot5gameId24 = 0x00000000b3e9d5835b6d61c407ef388ae4cde1f592306c95;

    bytes29 public slot6gameId29 = 0x3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95;
    bytes29 public slot7gameId29 = 0x00000000bdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95;

    /* 
        // Calculation Logic
        bytes memory faultDisputeGameStatusStorage = assembleGameStatusStorage(
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.createdAt,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.resolvedAt,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.gameStatus,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.initialized,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.l2BlockNumberChallenged
        );
    */

    bytes public slot8faultDisputeGameStatusStorage =
        "0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95";
    bytes public slot9faultDisputeGameStatusStorage =
        "0x825d2d3c51ea0ebdf25199ebb3e9d5835b6d61c407ef388ae4cde1f592306c95";

    address public slot10claimant = 0x5FB30336A8d0841cf15d452afA297cB6D10877D7;
    address public slot11claimant = 0x00000000A8d0841Cf15D452aFA297cb6D10877d7;

    /**
     * @notice emitted when proveStorage fails
     * we validate a storage proof  using SecureMerkleTrie.verifyInclusionProof
     * @param _key the key for the storage proof
     * @param _val the _value for the storage proof
     * @param _proof the storage proof
     * @param _root the root
     */
    error InvalidStorageProof(bytes _key, bytes _val, bytes[] _proof, bytes32 _root);

    /**
     * @notice validates a storage proof against using SecureMerkleTrie.verifyInclusionProof
     * @param _key key
     * @param _val value
     * @param _proof proof
     * @param _root root
     */
    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) public pure {
        if (!SecureMerkleTrie.verifyInclusionProof(_key, _val, _proof, _root)) {
            revert InvalidStorageProof(_key, _val, _proof, _root);
        }
    }

    function proveStorageRootClaim(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root)
        public
        pure
    {
        proveStorage(abi.encodePacked(_key), RLPWriter.writeBytes(abi.encodePacked(_val)), _proof, _root);
    }

    function proveStorageGameId(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root)
        public
        pure
    {
        proveStorage(abi.encodePacked(_key), RLPWriter.writeBytes(abi.encodePacked(_val)), _proof, _root);
    }

    /**
     * @notice generates the output root used for Bedrock and Cannon proving
     * @param outputRootVersion the output root version number usually 0
     * @param worldStateRoot world state root
     * @param messagePasserStateRoot message passer state root
     * @param latestBlockHash latest block hash
     */
    function generateOutputRoot(
        uint256 outputRootVersion,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(outputRootVersion, worldStateRoot, messagePasserStateRoot, latestBlockHash));
    }
}
