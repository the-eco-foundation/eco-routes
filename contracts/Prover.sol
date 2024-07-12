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

    // L2OutputOracle on Ethereum used for Bedrock (Base) Proving
    address public immutable l1OutputOracleAddress;

    // FaultGameFactory on Ethereum used for Cannon (Optimism) Proving
    address public immutable faultGameFactory;

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

    constructor(address _l1BlockhashOracle, address _l1OutputOracleAddress, address _faultGameFactory) {
        l1BlockhashOracle = IL1Block(_l1BlockhashOracle);
        l1OutputOracleAddress = _l1OutputOracleAddress;
        faultGameFactory = _faultGameFactory;
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

    function proveL2WorldStateBedrock(
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
            abi.encodePacked(l1OutputOracleAddress), rlpEncodedOutputOracleData, l1AccountProof, l1WorldStateRoot
        );

        provenL2States[l2WorldStateRoot] = l2OutputIndex;
    }

    /**
     * @notice Validates L2 world state for Cannon by validating the following Storage proofs for the faultDisputeGame.
     * @notice 1) the rootClaim is correct
     * @notice 2) the l2BlockNumber is correct
     * @notice 3) the status is complete (2)
     * @notice this gives a total of 3 StorageProofs and 1 AccountProof which must be validated.
     * @param l2WorldStateRoot the state root of the last block in the batch which contains the block in which the fulfill tx happened
     * @param l2MessagePasserStateRoot // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
     * @param l2LatestBlockHash the hash of the last block in the batch
     * @param l2OutputIndex the batch number
     * @param l1StorageProof todo
     * @param rlpEncodedDisputeGameData rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
     * @param l1AccountProof accountProof from eth_getProof(L2OutputOracle, [], )
     * @param l1WorldStateRoot the l1 world state root that was proven in proveL1WorldState
     */
    function proveL2WorldStateCannon(
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        bytes32 l2LatestBlockHash,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedDisputeGameData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) public {
        // could set a more strict requirement here to make the L1 block number greater than something corresponding to the intent creation
        // can also use timestamp instead of block when this is proven for better crosschain knowledge
        // failing the need for all that, change the mapping to map to bool
        require(provenL1States[l1WorldStateRoot] > 0, "l1 state root not yet proved");

        // Old logic to be replaced
        // bytes32 outputRoot = generateOutputRoot(
        //     L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash
        // );

        // bytes32 outputRootStorageSlot =
        //     bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));

        bytes memory DFGStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedDisputeGameData)[2]);

        // require(outputOracleStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        // end of old logic

        // Prove FaultDisputeGame was created by DisputeGameFactory
        // bytes[] memory disputeGameFactoryl1StorageProof = [
        //     "0xf90211a0eaadfac675c84818c5d82c78b0066b22744c2e3ab4b1f1a89d97e41da310bcc6a00a42869c5f5df6263bf61a44490918f753b7c9b81ae3c4b8f2f6e4b93b5ea146a0c5123eed147bc847c65f8add63beff91d8203e641008ce65b875fb3d1fa48de5a04af1e92942c0c0aeb8726380ea16c14c4ee85b3062260465733f6e63c5547336a0f47162f28d76a89586ac0d3582d4b98dc844d54dcb92d12f4bfec56e24f63572a07c2d6128af8f0c42e0b3d2acb419a2a0b0905c1533d2aac79e304f37fc49c500a024aaaf06fc9dbb5804e42b1c2355684b6df39892fb9a8a714bf8f640c496518da00fc763e61b9b88a28ae2818be5773ce2c00932dc6f824f8c7d539b3bf077cbe7a017418458f312e31d9a0088b59717484200c30b5df2dea6aee6d9c87ab33f8476a0967beced057b9d8b4070dd386c4a3b592279c62223b2dbf1f51867199de2eaaea0c53f20f936b6a269683b54a40fb6cc12a4f17e84a8b7904f322eaea960efcfe3a07ec3ce02986f9fe7d009c6ea792af9fb4fab4e583881873d0da79ed12d424681a03441603d2bfcda3b6ae0a30394bd0cdad5b4b228bedcc5735ed39f00d6a0a86da0ef55f72967b760c8bb8b6a65375e9f0f6726c6fb0578fe3bfe5f5789d3412ebea06803d021712d4f327a42766992cc45f94ff7cc8a97401ec7332968806645f7c1a0af0265627b87d2fbcd5c97d0d6d9fa766526904a993ccde1cd08a57b327e53f780",
        //     "0xf90211a0f10c3674f31558bfbd5176237a33e32682a42a4139e6a76927d381d7ea2c4fdba0992d57dbb1180645802c4aecc5f95bd1a74aed6b232c664b6bd7041f4251a50aa0046e244620437134a1112fab0fc85d3ebb27130c00fd7f2f16190778bd35f988a0758ba7e7b6a047151ed139b9bd302e8d8a4ef235f0ba1e114431ff0e395013d4a0ab1263bbd56422056cde99515da10796bd8c2a306fecf769a92cb1fec7e4e63ea06a1bc97132054d80e7d4eae1483ffa91dcab543e53bcc5ff89d915a8f9048b02a09d3ef2b4c0c2ecd712b1e08c5086c42182278728e7f9a7011dceea2c5c91c4d8a0e68793b3786f2e613b670d7a25cc65a7f617566e32ecabe8a3c0738ad83470baa00aad0fbb72eb040607dc1265b0497da9923401c58b69f6fc9d02c75ba1bf862da098ecb3129377a8475aa5f727311579f1b51e8c17600fadd03a56d3aff2c0a0a5a040825bc055f18922c53bce17a16d30437d21504880010e93f542c77066ef4381a0715f91b042fcd10a94ddd2ded4a91e0ae63add37e73f6ed0a17899bbe9c41219a09b7e921ac060d1ee6c7b7f67e7fdf1e949f17f45209686b57ea17a4c116d246fa0db7eaf598081faa4cab45069c004e6290d1535811e274e79108c921025c25d9fa052b8fe8f2b93380685204a8447f9164563ba0b960790c60894d98f3cb20c06f6a0dd557c2574989db834808c908b11305531e423c687ca9e53116d6a095b53209880",
        //     "0xf90211a0fafd2e456178d6d428b0e859888a5ea41d785c6793eca40096ab560265f41829a0b6ef07243821a2ff5f4f8c83c71091749ec22d76fca3a4077054fc30b0990162a0b4f43ebce5e7a8a7713d4e2c0043c872980039e618e78551fbcee6471071ccd6a0e94f34fa741653a01defb502e90dc636b80bccbf33ecf54b2a77735d9ae7a187a0a5b43da71de47df3c3063c4272cbbb0f5fb0c08904a59b88f54565aaba182b8ea089702b7003e18d9b8b8675d7d0711d86100290d2992624d985c567ece13db16ca0d42140ed22922bee96648a67427933722c17ea78656bf07f639c0fdf91a53a0ca07857644ccc11d275c1dad05d6aa9e05637209c28342f962ff7fb1ac9578a2656a029db726fc4571ad4006973e7894f079d05afd8bf8fef8c70bdb8aec55812b498a06dc39e062669762ea4439fcda0961493a873f26dddb2d9f9a8b5d381afea9f6ea03fc54e69edb0ac17be555a3d7613e5c0fb53ce64ab2a132c599fccaaea3d0370a041795cf325006014c828ffea8a019311ae0cce48eb6cc53edd39badc8761ea19a0af29c51514349d3f052d07935729b6680a89c973c10a3804d0c084aba002a34ca02b34a4c3abffebf980743217590d0d6fe939f0ed70e6bc60a29eb9f7f88a90dea00bd998c9646afac0f15efc63676e3d3d5fdd640bd40353aabd15f4645d8f3436a0acb719c5baa60d5a1782fe471c3556f852a6d4fcf730b1dea8726e3a09c678bf80",
        //     "0xf8d180a0dd14cdd0bceaa93c848b77d1a5b7226c6cc6ec8580cd3de7bafa2e5968b3bb79808080a0145212c535948f2dd0745424a2038bdacdfd8130477df188c6112de93311851780808080a0bd1ec497f29d252e05078b58fd1c733261e8415ab936428c64e64572bf1d30b6a02a94bcad93b550d85f2a93b31f30ada8671ea9e6a120b3bab93829ed36261251a04a6a097139d97315346ee18bbff44b9d12d5f024f0e9fb2b9784e850ba561c5280a0deefc9def74111e330a189e4415bdd099b1dec2515dbaffc0912ba0e3e8f251e8080",
        //     "0xf83a9f20715c76c7e0dd4a6aad5af5b6e8a3cf4758a6c750dfd03d44e8138a77779499986689aa0827f77e1f136204d18a100c30f634704067251d09"
        // ];
        // Fault
        proveStorage(
            abi.encodePacked("0xdc1a0dba53f837978d5bafb52ebb7cd67f5cfb418c5ec060ebdc4bca53327769"), //gameIDStorageSlot
            bytes.concat(
                bytes1(uint8(0xa0)),
                abi.encodePacked("0x00000000000000006689aa0827f77e1f136204d18a100c30f634704067251d09")
            ), //gameID
            l1StorageProof, //disputeGameFactoryl1StorageProof
            bytes32(DFGStateRoot) //DisputeGameFactoryStateRoot
        );

        // proveAccount(abi.encodePacked(faultGameFactory), rlpEncodedDisputeGameData, l1AccountProof, l1WorldStateRoot);

        // Prove FaultDisputeGame is for the correct rootClaim
        // proveStorage(
        //     abi.encodePacked(outputRootStorageSlot),
        //     bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
        //     l1StorageProof,
        //     bytes32(outputOracleStateRoot)
        // );

        // Prove FaultDisputeGame has been resolved
        // proveStorage(
        //     abi.encodePacked(outputRootStorageSlot),
        //     bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
        //     l1StorageProof,
        //     bytes32(outputOracleStateRoot)
        // );

        // proveAccount(abi.encodePacked(faultGameFactory), rlpEncodedDisputeGameData, l1AccountProof, l1WorldStateRoot);

        // provenL2States[l2WorldStateRoot] = l2OutputIndex;

        // rest to be removed once above is complete

        // proveStorage(
        //     abi.encodePacked(outputRootStorageSlot),
        //     bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
        //     l1StorageProof,
        //     bytes32(outputOracleStateRoot)
        // );

        // proveAccount(abi.encodePacked(faultGameFactory), rlpEncodedOutputOracleData, l1AccountProof, l1WorldStateRoot);

        // provenL2States[l2WorldStateRoot] = l2OutputIndex;
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
