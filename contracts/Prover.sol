// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Lib_SecureMerkleTrie } from "@eth-optimism/contracts/libraries/trie/Lib_SecureMerkleTrie.sol";
import { Lib_RLPReader } from "@eth-optimism/contracts/libraries/rlp/Lib_RLPReader.sol";
import { Lib_RLPWriter } from "@eth-optimism/contracts/libraries/rlp/Lib_RLPWriter.sol";
import { IL1Block } from "./interfaces/IL1Block.sol";


contract Prover {
    uint16 constant public NONCE_PACKING = 1;

    uint256 constant public L2_OUTPUT_SLOT_NUMBER = 3;

    uint256 constant public L2_OUTPUT_ROOT_VERSION_NUMBER = 0;

    address constant public L1_OUTPUT_ORACLE_ADDRESS = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;

    IL1Block public immutable l1BlockhashOracle;

    // mapping from l1 world state root hashes to block numbers they correspond to
    mapping(bytes32 => uint256) public provenL1States;

    // mapping from l2 world state root hashes to batch numbers they correspond to
    mapping(bytes32 => uint256) public provenL2States;
    
    // mapping from proven intents to the address that's authorized to claim them
    mapping(bytes32 => address) public provenIntents;

    constructor(address _l1BlockhashOracle) {
        l1BlockhashOracle = IL1Block(_l1BlockhashOracle);
    }
    
    function proveStorage(
        bytes memory _key,
        bytes memory _val,
        bytes[] memory _proof,
        bytes32 _root
    ) public pure {
        require(Lib_SecureMerkleTrie.verifyInclusionProof(
            _key,
            _val,
            Lib_RLPWriter.writeList(_proof),
            _root
        ), "failed to prove");
    }

    function proveAccount(
        bytes memory _address,
        bytes memory _data,
        bytes[] memory _proof,
        bytes32 _root
    ) public pure {
        require(Lib_SecureMerkleTrie.verifyInclusionProof(
            _address,
            _data,
            Lib_RLPWriter.writeList(_proof),
            _root
        ), "failed to prove");
    }

    function generateOutputRoot(
        uint256 version,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) public pure returns (bytes32){
        return keccak256(
            abi.encode(
                version,
                worldStateRoot,
                messagePasserStateRoot,
                latestBlockHash
            )
        );
    }

    // helper function for getting all rlp data encoded
    function rlpEncodeDataLibList(
        bytes[] memory dataList
    ) public pure returns (bytes memory) {
        for(uint256 i = 0; i < dataList.length; ++i) {
            dataList[i] = Lib_RLPWriter.writeBytes(dataList[i]);
        }

        return Lib_RLPWriter.writeList(dataList);
    }

    function proveL1WorldState(
        bytes calldata rlpEncodedL1BlockData
    ) public {
        require(keccak256(rlpEncodedL1BlockData) == l1BlockhashOracle.hash()); // the function here depends on the chain hosting the prover

        bytes32 l1WorldStateRoot = bytes32(Lib_RLPReader.readBytes(Lib_RLPReader.readList(rlpEncodedL1BlockData)[3]));

        // not necessary because we already confirm that the data is correct by ensuring that it hashes to the block hash
        // require(l1WorldStateRoot.length <= 32); // ensure lossless casting to bytes32

        provenL1States[l1WorldStateRoot] = l1BlockhashOracle.number();
    }

    function proveOutputRoot(
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        bytes32 l2LatestBlockHash,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedOutputOracleData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) public {
        // could set a more strict requirement here to make the L1 block number greater than something corresponding to the intent creation
        // can also use timestamp instead of block when this is proven for better crosschain knowledge
        // failing the need for all that, change the mapping to map to bool
        require(provenL1States[l1WorldStateRoot] > 0);

        bytes32 outputRoot = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER,
            l2WorldStateRoot,
            l2MessagePasserStateRoot,
            l2LatestBlockHash
        );

        bytes32 outputRootStorageSlot = bytes32(abi.encode((uint256(keccak256(
            abi.encode(
                L2_OUTPUT_SLOT_NUMBER
            )
        )) + l2OutputIndex*2)));

        bytes memory outputOracleStateRoot = Lib_RLPReader.readBytes(Lib_RLPReader.readList(rlpEncodedOutputOracleData)[2]);

        require(outputOracleStateRoot.length <= 32); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(outputRootStorageSlot),
            bytes.concat(bytes1(uint8(0xa0)),abi.encodePacked(outputRoot)),
            l1StorageProof,
            bytes32(outputOracleStateRoot)
        );

        proveAccount(
            abi.encodePacked(L1_OUTPUT_ORACLE_ADDRESS),
            rlpEncodedOutputOracleData,
            l1AccountProof,
            l1WorldStateRoot
        );

        provenL2States[l2WorldStateRoot] = l2OutputIndex;
    }

    function proveIntent(
        address claimant,
        address inboxContract,
        bytes32 intentHash,
        uint256 intentOutputIndex,
        bytes[] calldata l2StorageProof,
        bytes calldata rlpEncodedInboxData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public {
        require(provenL2States[l2WorldStateRoot] > intentOutputIndex); // intentOutputIndex can never be less than zero, so this always ensures the root was proven

        bytes32 messageMappingSlot = keccak256(
            abi.encode(
                intentHash,
                0 // storage position of the intents mapping is the first slot
            )
        );

        bytes memory inboxStateRoot = Lib_RLPReader.readBytes(Lib_RLPReader.readList(rlpEncodedInboxData)[2]);

        require(inboxStateRoot.length <= 32); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(messageMappingSlot),
            bytes.concat(hex"94",bytes20(claimant)),
            l2StorageProof,
            bytes32(inboxStateRoot)
        );

        proveAccount(
            abi.encodePacked(inboxContract),
            rlpEncodedInboxData,
            l2AccountProof,
            l2WorldStateRoot
        );

        provenIntents[intentHash] = claimant;
    }
}
