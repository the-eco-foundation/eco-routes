// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";
import {IL1Block} from "./interfaces/IL1Block.sol";
import "hardhat/console.sol";

contract Prover {
    uint16 public constant NONCE_PACKING = 1;

    uint256 public constant L2_OUTPUT_SLOT_NUMBER = 3;

    uint256 public constant L2_OUTPUT_ROOT_VERSION_NUMBER = 0;

    // L2OutputOracle on Sepolia Eth
    address public immutable l1OutputOracleAddress;

    // This contract lives on an L2 and contains the data for the 'current' L1 block.
    // there is a delay between this contract and L1 state - the block information found here is usually a few blocks behind the most recent block on L1.
    // But optimism maintains a service that posts L1 block data on L2.
    IL1Block public immutable l1BlockhashOracle;

    // mapping from l1 world state root hashes to block numbers they correspond to
    mapping(bytes32 => uint256) public provenL1States;

    // mapping from l2 world state root hashes to batch numbers they correspond to
    mapping(bytes32 => uint256) public provenL2States;

    // mapping from proven intents to the address that's authorized to claim them
    mapping(bytes32 => address) public provenIntents;

    constructor(address _l1BlockhashOracle, address _l1OutputOracleAddress) {
        l1BlockhashOracle = IL1Block(_l1BlockhashOracle);
        l1OutputOracleAddress = _l1OutputOracleAddress;
    }

    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) public pure {
        console.log("In proveStorage _key, _val, _proof, _root");
        console.logBytes(_key);
        console.logBytes(_val);
        for (uint256 i = 0; i < _proof.length; i++) {
            console.logBytes(_proof[i]);
        }
        console.logBytes32(_root);
        console.log("=================================");
        require(SecureMerkleTrie.verifyInclusionProof(_key, _val, _proof, _root), "failed to prove storage");
    }

    function proveAccount(bytes memory _address, bytes memory _data, bytes[] memory _proof, bytes32 _root)
        public
        pure
    {
        require(SecureMerkleTrie.verifyInclusionProof(_address, _data, _proof, _root), "failed to prove account");
    }

    // logic is documented at https://specs.optimism.io/protocol/proposals.html#l2-output-commitment-construction
    function generateOutputRoot(
        uint256 version,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(version, worldStateRoot, messagePasserStateRoot, latestBlockHash));
    }

    // helper function for getting all rlp data encoded
    function rlpEncodeDataLibList(bytes[] memory dataList) public pure returns (bytes memory) {
        for (uint256 i = 0; i < dataList.length; ++i) {
            dataList[i] = RLPWriter.writeBytes(dataList[i]);
        }

        return RLPWriter.writeList(dataList);
    }

    /**
     * @notice validates input L1 block state against the L1 oracle contract.
     * @param rlpEncodedL1BlockData properly encoded L1 block data
     * @dev inputting the correct block's data encoded as expected will result in its hash matching
     * the blockhash found on the L1 oracle contract. This means that the world state root found
     * in that block corresponds to the block on the oracle contract, and that it represents a valid
     * state.
     */
    function proveL1WorldState(bytes calldata rlpEncodedL1BlockData) public {
        // console.logBytes32(keccak256(rlpEncodedL1BlockData));
        // console.logBytes32(keccak256(rlpEncodedL1BlockData));
        require(keccak256(rlpEncodedL1BlockData) == l1BlockhashOracle.hash(), "hash does not match block data");

        bytes32 l1WorldStateRoot = bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));

        // not necessary because we already confirm that the data is correct by ensuring that it hashes to the block hash
        // require(l1WorldStateRoot.length <= 32); // ensure lossless casting to bytes32

        provenL1States[l1WorldStateRoot] = l1BlockhashOracle.number();
    }
    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param l2WorldStateRoot the state root of the last block in the batch which contains the block in which the fulfill tx happened
     * @param l2MessagePasserStateRoot // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
     * @param l2LatestBlockHash the hash of the last block in the batch
     * @param l2OutputIndex the batch number
     * @param l1StorageProof todo
     * @param rlpEncodedOutputOracleData rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
     * @param l1AccountProof accountProof from eth_getProof(L2OutputOracle, [], )
     * @param l1WorldStateRoot the l1 world state root that was proven in proveL1WorldState
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

        console.log("l2OutputIndex: ", l2OutputIndex);
        console.log("L2 WORLD STATE about to generateOutputRoot");
        console.logUint(L2_OUTPUT_ROOT_VERSION_NUMBER);
        console.logBytes32(l2WorldStateRoot);
        console.logBytes32(l2MessagePasserStateRoot);
        console.logBytes32(l2LatestBlockHash);
        console.log("++++++++++++++++++++++");

        bytes32 outputRoot = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash
        );
        console.log("Generated Output Root");
        console.logBytes32(outputRoot);

        bytes32 outputRootStorageSlot =
            bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));
        console.log("outputRootStorageSlot");
        console.logBytes32(outputRootStorageSlot);

        // Testnet then Mainnet bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
        // 0xa0874cbb13b40d0bca44814a32cf725f118070942463f1e396fd1943affce6ddbb
        // 0xa0a7f5660bdc1efe3f61dbe345a0b24cbfdcf293f4b0d33c6a852c6e5134306770

        bytes memory outputOracleStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedOutputOracleData)[2]);

        require(outputOracleStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(outputRootStorageSlot),
            // bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
            // bytes.concat(
            //     bytes1(uint8(0xa0)),
            //     abi.encodePacked("0xdd6bb4535a7f07c5098c3c3b36969ec63632891673c80f2f76d994bb5bf63683")
            // ),
            // abi.encodePacked(hex"a0874cbb13b40d0bca44814a32cf725f118070942463f1e396fd1943affce6ddbb"),
            abi.encodePacked(hex"a0dd6bb4535a7f07c5098c3c3b36969ec63632891673c80f2f76d994bb5bf63683"),
            l1StorageProof,
            bytes32(outputOracleStateRoot)
        );

        proveAccount(
            abi.encodePacked(l1OutputOracleAddress), rlpEncodedOutputOracleData, l1AccountProof, l1WorldStateRoot
        );

        provenL2States[l2WorldStateRoot] = l2OutputIndex;
    }
    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param claimant the address that can claim the reward
     * @param inboxContract the address of the inbox contract
     * @param intentHash the intent hash
     * @param intentOutputIndex todo
     * @param l2StorageProof todo
     * @param rlpEncodedInboxData todo
     * @param l2AccountProof todo
     * @param l2WorldStateRoot todo
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

        // proves that the claimaint address corresponds to the intentHash on the contract
        proveStorage(
            abi.encodePacked(messageMappingSlot),
            bytes.concat(hex"94", bytes20(claimant)),
            l2StorageProof,
            bytes32(inboxStateRoot)
        );

        // proves that the inbox data corresponds to the l2worldstate
        proveAccount(abi.encodePacked(inboxContract), rlpEncodedInboxData, l2AccountProof, l2WorldStateRoot);

        provenIntents[intentHash] = claimant;
    }
}
