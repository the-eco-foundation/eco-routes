// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";
import {IL1Block} from "./interfaces/IL1Block.sol";

contract Prover {
    uint16 public constant NONCE_PACKING = 1;

    uint256 public constant L2_OUTPUT_SLOT_NUMBER = 3;

    uint256 public constant L2_OUTPUT_ROOT_VERSION_NUMBER = 0;

    address public constant L1_OUTPUT_ORACLE_ADDRESS = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;

    IL1Block public immutable l1BlockhashOracle;

    /**
     * mapping from l1 world state root hashes to block numbers they correspond to
     */
    mapping(bytes32 => uint256) public provenL1States;

    /**
     * mapping from l2 world state root hashes to batch numbers they correspond to
     */
    mapping(bytes32 => uint256) public provenL2States;

    /**
     * mapping from proven intents to the address that's authorized to claim them
     */
    mapping(bytes32 => address) public provenIntents;

    /**
     * @notice The contructor for the prover contract
     * @param _l1BlockhashOracle The address of the l1BlockHashOracle
     */
    constructor(address _l1BlockhashOracle) {
        l1BlockhashOracle = IL1Block(_l1BlockhashOracle);
    }

    /**
     * @notice proveStorage checks that a specific storage value has a valid proof
     * @param _key the key of the storage
     * @param _val the value of the storage
     * @param _proof the proof of the storage
     * @param _root the root of the proof
     */
    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) public pure {
        require(SecureMerkleTrie.verifyInclusionProof(_key, _val, _proof, _root), "failed to prove storage");
    }

    /**
     * @notice proveAccount checks that an account has a valid proof
     * @param _address the address of the account
     * @param _data the data for the account
     * @param _proof the proof of the account data
     * @param _root the root of the proof
     */
    function proveAccount(bytes memory _address, bytes memory _data, bytes[] memory _proof, bytes32 _root)
        public
        pure
    {
        require(SecureMerkleTrie.verifyInclusionProof(_address, _data, _proof, _root), "failed to prove account");
    }

    /**
     * @notice generateOutputRoot returns a keccak256 hash of an abi.encoded set of information
     * @param version version of
     * @param worldStateRoot the world state root
     * @param messagePasserStateRoot the message passer state root
     * @param latestBlockHash the latest block hash
     * @return outputRootHash returns a keccak256 hash of an abi.encoded set of information
     */
    function generateOutputRoot(
        uint256 version,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) public pure returns (bytes32 outputRootHash) {
        return keccak256(abi.encode(version, worldStateRoot, messagePasserStateRoot, latestBlockHash));
    }

    /**
     * @notice rlpEncodeDataLibList is a helper function for getting all recursive length prefix data encoded
     * @param dataList an array of bites that we are RLP encoding
     * @return rlpData the RLP encoded data
     */
    function rlpEncodeDataLibList(bytes[] memory dataList) public pure returns (bytes memory rlpData) {
        for (uint256 i = 0; i < dataList.length; ++i) {
            dataList[i] = RLPWriter.writeBytes(dataList[i]);
        }

        return RLPWriter.writeList(dataList);
    }

    /**
     * @notice proveL1WorldState proves the Block has been proven on L1
     * and adds the l1BlockhashOracle block number to the provenL1States
     * @param rlpEncodedL1BlockData the RLP encoded L1 Block Data
     */
    function proveL1WorldState(bytes calldata rlpEncodedL1BlockData) public {
        require(keccak256(rlpEncodedL1BlockData) == l1BlockhashOracle.hash(), "hash does not match block data");

        bytes32 l1WorldStateRoot = bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));

        // not necessary because we already confirm that the data is correct by ensuring that it hashes to the block hash
        // require(l1WorldStateRoot.length <= 32); // ensure lossless casting to bytes32

        provenL1States[l1WorldStateRoot] = l1BlockhashOracle.number();
    }

    /**
     * @notice proveOutputRoot proves the ouput root
     * it does this by generating an OutputRoot, getting the output roots storage slot,
     * checking the contract state root is correctly coded and then proves the Storage and
     * proves the Account Data
     * it all this is correct it updates the provenL2STATES l2WorldStateRoot with the l2OutputIndex
     * For more information on the timing of the data availability for optimism chains
     * see https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/L1/L2OutputOracle.sol#L244
     * @param l2WorldStateRoot this is the value that is cached and used for checking against intent confirmation storage proofs
     * @param l2MessagePasserStateRoot used to construct L2 output, OP chain specific
     * @param l2LatestBlockHash used to construct L2 output, OP chain specific
     * @param l2OutputIndex  used to find the storage slot in the OutputOracle contract, used to look up on the output oracle address to check times and block number safeguards.
     * @param l1StorageProof this proves the l2WorldStateRoot within the OutputOracle storage tied to the l2OutputIndex value that timestamps it
     * @param rlpEncodedOutputOracleData the rlp encoded Output Oracle data
     * @param l1AccountProof the L1 Account Proof
     * @param l1WorldStateRoot this proves that the outputOracleStorageRoot is within the merkle tree of the l1StorageRoot
     */
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
        require(provenL1States[l1WorldStateRoot] > 0, "l1 state root not yet proved");

        bytes32 outputRoot = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash
        );

        bytes32 outputRootStorageSlot =
            bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));

        bytes memory outputOracleStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedOutputOracleData)[2]);

        require(outputOracleStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(outputRootStorageSlot),
            bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
            l1StorageProof,
            bytes32(outputOracleStateRoot)
        );

        proveAccount(
            abi.encodePacked(L1_OUTPUT_ORACLE_ADDRESS), rlpEncodedOutputOracleData, l1AccountProof, l1WorldStateRoot
        );

        provenL2States[l2WorldStateRoot] = l2OutputIndex;
    }

    /**
     * @notice proveIntent proves an Intent has been executed and proven, it does this by
     * checking that the l2 state root has not yet been proven, chcking the inbox state root is correctly RLP encoded
     * proving the storage, proving the account data and then updating the provenIntes for this intenthash
     * with the claimaint address
     * @param claimant the address of the claimant for the intent i.e. who receives the funds
     * @param inboxContract the address of the intent inbox contract
     * @param intentHash the hash of the intent
     * @param intentOutputIndex the intent output index
     * @param l2StorageProof the L2 storage proof
     * @param rlpEncodedInboxData the RLP encoded inbox data
     * @param l2AccountProof the L2 account proff
     * @param l2WorldStateRoot this is the value that is cached and used for checking against intent confirmation storage proofs
     */
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
        require(provenL2States[l2WorldStateRoot] > intentOutputIndex, "l2 state root not yet proven"); // intentOutputIndex can never be less than zero, so this always ensures the root was proven

        bytes32 messageMappingSlot = keccak256(
            abi.encode(
                intentHash,
                0 // storage position of the intents mapping is the first slot
            )
        );

        bytes memory inboxStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedInboxData)[2]);

        require(inboxStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(messageMappingSlot),
            bytes.concat(hex"94", bytes20(claimant)),
            l2StorageProof,
            bytes32(inboxStateRoot)
        );

        proveAccount(abi.encodePacked(inboxContract), rlpEncodedInboxData, l2AccountProof, l2WorldStateRoot);

        provenIntents[intentHash] = claimant;
    }
}
