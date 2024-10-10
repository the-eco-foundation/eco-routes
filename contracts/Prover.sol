// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;
/**
 * _____                    _____                   _______
 *          /\    \                  /\    \                 /::\    \
 *         /::\    \                /::\    \               /::::\    \
 *        /::::\    \              /::::\    \             /::::::\    \
 *       /::::::\    \            /::::::\    \           /::::::::\    \
 *      /:::/\:::\    \          /:::/\:::\    \         /:::/~~\:::\    \
 *     /:::/__\:::\    \        /:::/  \:::\    \       /:::/    \:::\    \
 *    /::::\   \:::\    \      /:::/    \:::\    \     /:::/    / \:::\    \
 *   /::::::\   \:::\    \    /:::/    / \:::\    \   /:::/____/   \:::\____\
 *  /:::/\:::\   \:::\    \  /:::/    /   \:::\    \ |:::|    |     |:::|    |
 * /:::/__\:::\   \:::\____\/:::/____/     \:::\____\|:::|____|     |:::|    |
 * \:::\   \:::\   \::/    /\:::\    \      \::/    / \:::\    \   /:::/    /
 *  \:::\   \:::\   \/____/  \:::\    \      \/____/   \:::\    \ /:::/    /
 *   \:::\   \:::\    \       \:::\    \                \:::\    /:::/    /
 *    \:::\   \:::\____\       \:::\    \                \:::\__/:::/    /
 *     \:::\   \::/    /        \:::\    \                \::::::::/    /
 *      \:::\   \/____/          \:::\    \                \::::::/    /
 *       \:::\    \               \:::\    \                \::::/    /
 *        \:::\____\               \:::\____\                \::/____/
 *         \::/    /                \::/    /                 ~~
 *          \/____/                  \/____/
 *
 *
 * ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄
 * ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
 * ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌
 * ▐░▌          ▐░▌          ▐░▌       ▐░▌
 * ▐░█▄▄▄▄▄▄▄▄▄ ▐░▌          ▐░▌       ▐░▌
 * ▐░░░░░░░░░░░▌▐░▌          ▐░▌       ▐░▌
 * ▐░█▀▀▀▀▀▀▀▀▀ ▐░▌          ▐░▌       ▐░▌
 * ▐░▌          ▐░▌          ▐░▌       ▐░▌
 * ▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌
 * ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
 *  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀
 *
 *
 *  $$$$$$\   $$$$$$$\  $$$$$$\
 * $$  __$$\ $$  _____|$$  __$$\
 * $$$$$$$$ |$$ /      $$ /  $$ |
 * $$   ____|$$ |      $$ |  $$ |
 * \$$$$$$$\ \$$$$$$$\ \$$$$$$  |
 *  \_______| \_______| \______/
 *
 *  ░▒▓████████▓▒░▒▓██████▓▒░ ░▒▓██████▓▒░
 * ░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
 * ░▒▓█▓▒░     ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░
 * ░▒▓██████▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░
 * ░▒▓█▓▒░     ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░
 * ░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
 * ░▒▓████████▓▒░▒▓██████▓▒░ ░▒▓██████▓▒░
 */

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";
import {IL1Block} from "./interfaces/IL1Block.sol";
import {SimpleProver} from "./interfaces/SimpleProver.sol";
import {ISemver} from "./interfaces/ISemVer.sol";
import {AbstractProver} from "./libs/AbstractProver.sol";

contract Prover is SimpleProver, AbstractProver {
    // uint16 public constant NONCE_PACKING = 1;

    // Output slot for Bedrock L2_OUTPUT_ORACLE where Settled Batches are stored
    uint256 public constant L2_OUTPUT_SLOT_NUMBER = 3;

    uint256 public constant L2_OUTPUT_ROOT_VERSION_NUMBER = 0;

    uint256 public constant L1_BLOCK_ORACLE_BLOCK_HASH_SLOT_NUMBER = 2;

    address public constant L1_BLOCK_ADDRESS = 0x4200000000000000000000000000000000000015;

    // L2OutputOracle on Ethereum used for Bedrock (Base) Proving
    // address public immutable l1OutputOracleAddress;

    // Cannon Data
    // FaultGameFactory on Ethereum used for Cannon (Optimism) Proving
    // address public immutable faultGameFactoryAddress;

    // Output slot for Cannon DisputeGameFactory where FaultDisputeGames gameId's are stored
    uint256 public constant L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER = 104;

    // Output slot for the root claim (used as the block number settled is part of the root claim)

    // This contract lives on an L2 and contains the data for the 'current' L1 block.
    // there is a delay between this contract and L1 state - the block information found here is usually a few blocks behind the most recent block on L1.
    // But optimism maintains a service that posts L1 block data on L2.
    IL1Block public l1BlockhashOracle;

    enum ProvingMechanism {
        Self, // Used for Ethereum and Sepolia (any chain that settles to itself)
        Bedrock,
        Cannon,
        Arbitrum,
        HyperProver
    }

    struct ChainConfiguration {
        uint8 provingMechanism;
        uint256 settlementChainId;
        address settlementContract;
        address blockhashOracle;
        uint256 outputRootVersionNumber;
    }

    struct ChainConfigurationConstructor {
        uint256 chainId;
        ChainConfiguration chainConfiguration;
    }

    // map the chain id to chain configuration
    mapping(uint256 => ChainConfiguration) public chainConfigurations;

    struct BlockProof {
        uint256 blockNumber;
        bytes32 blockHash;
        bytes32 stateRoot;
    }

    // Store the last BlockProof for each ChainId
    mapping(uint256 => BlockProof) public provenStates;

    /**
     * @notice emitted when Self state is proven
     * @param _blockNumber  the block number corresponding to this chains world state
     * @param _SelfStateRoot the world state root at _blockNumber
     */
    event SelfStateProven(uint256 indexed _blockNumber, bytes32 _SelfStateRoot);

    /**
     * @notice emitted when L1 world state is proven
     * @param _blockNumber  the block number corresponding to this L1 world state
     * @param _L1WorldStateRoot the world state root at _blockNumber
     */
    event L1WorldStateProven(uint256 indexed _blockNumber, bytes32 _L1WorldStateRoot);

    /**
     * @notice emitted when L2 world state is proven
     * @param _destinationChainID the chainID of the destination chain
     * @param _blockNumber the blocknumber corresponding to the world state
     * @param _L2WorldStateRoot the world state root at _blockNumber
     */
    event L2WorldStateProven(
        uint256 indexed _destinationChainID, uint256 indexed _blockNumber, bytes32 _L2WorldStateRoot
    );

    /**
     * @notice emitted on a proving state if the blockNumber is less than the current blockNumber
     * @param _inputBlockNumber the block number we are trying to prove
     * @param _latestBlockNumber the latest block number that has been proven
     */
    error OutdatedBlock(uint256 _inputBlockNumber, uint256 _latestBlockNumber);

    string public constant version = "0.3.0-beta.0";

    constructor(ChainConfigurationConstructor[] memory _chainConfigurations) {
        for (uint256 i = 0; i < _chainConfigurations.length; ++i) {
            _setChainConfiguration(_chainConfigurations[i].chainId, _chainConfigurations[i].chainConfiguration);
        }
    }

    function _setChainConfiguration(uint256 chainId, ChainConfiguration memory chainConfiguration) internal {
        chainConfigurations[chainId] = chainConfiguration;
        l1BlockhashOracle = IL1Block(chainConfiguration.blockhashOracle);
    }

    /**
     * @notice validates input L1 block state against the L1 oracle contract.
     * @param rlpEncodedBlockData properly encoded L1 block data
     * @dev inputting the correct block's data encoded as expected will result in its hash matching
     * the blockhash found on the L1 oracle contract. This means that the world state root found
     * in that block corresponds to the block on the oracle contract, and that it represents a valid
     * state.
     */
    function proveSettlementLayerState(bytes calldata rlpEncodedBlockData) public {
        require(keccak256(rlpEncodedBlockData) == l1BlockhashOracle.hash(), "hash does not match block data");

        uint256 settlementChainId = chainConfigurations[block.chainid].settlementChainId;
        // not necessary because we already confirm that the data is correct by ensuring that it hashes to the block hash
        // require(l1WorldStateRoot.length <= 32); // ensure lossless casting to bytes32

        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[3]))
        });
        BlockProof memory existingBlockProof = provenStates[settlementChainId];
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[settlementChainId] = blockProof;
            emit L1WorldStateProven(blockProof.blockNumber, blockProof.stateRoot);
        } else {
            revert OutdatedBlock(blockProof.blockNumber, existingBlockProof.blockNumber);
        }
    }

    /**
     * @notice gets valid L1 State for an L3 chain by validating rlpEncoded L2 and L1 blocks against the corresponding L1 and L2 L1Block.sol contracts
     * @param l1RlpEncodedBlockData rlp encoded L1 block data
     * @param l2RlpEncodedBlockData rlp encoded L2 block data
     * @dev inputting the correct block's data encoded as expected will result in its hash matching
     * the blockhash found on the L2 oracle contract. This means that the world state root found
     * in that block corresponds to the block on the oracle contract, and that it represents a valid
     * state. We need to prove this by doing a storage proof of the L1BlockOracle on the L3 (destination chain)
     * of the L2's L1BLlockOracle.
     * L3 L1BlockOracle (gives L2Block)-> L2 L1BlockOracle(gives L1Block) -> RlpEncodedBlockData for L1 Block
     */
    function proveL1L3SettlementLayerState(
        bytes calldata l1RlpEncodedBlockData,
        bytes calldata l2RlpEncodedBlockData,
        // bytes32 l2MessagePasserStateRoot,
        bytes[] calldata l2l1StorageProof,
        bytes calldata rlpEncodedL2L1BlockData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public {
        // Check that the L2 block data hashes to the L1 block hash on L3

        require(keccak256(l2RlpEncodedBlockData) == l1BlockhashOracle.hash(), "hash does not match block data");

        uint256 l2settlementChainId = chainConfigurations[block.chainid].settlementChainId;
        uint256 settlementChainId = chainConfigurations[l2settlementChainId].settlementChainId;
        BlockProof memory existingBlockProof = provenStates[settlementChainId];

        // BlockProof memory l2blockProof = BlockProof({
        //     blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(l2RlpEncodedBlockData)[8])),
        //     blockHash: keccak256(l2RlpEncodedBlockData),
        //     stateRoot: bytes32(RLPReader.readBytes(RLPReader.readList(l2RlpEncodedBlockData)[3]))
        // });
        BlockProof memory l1blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(l1RlpEncodedBlockData)[8])),
            blockHash: keccak256(l1RlpEncodedBlockData),
            stateRoot: bytes32(RLPReader.readBytes(RLPReader.readList(l1RlpEncodedBlockData)[3]))
        });
        // bytes memory l2l1SlotNumber = abi.encodePacked(uint256(L1_BLOCK_ORACLE_BLOCK_HASH_SLOT_NUMBER));
        bytes memory l2l1StorageStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedL2L1BlockData)[2]);
        // Have valid L2 Block Hash, now prove the L1 block data
        // Need to do a storageProof of the L1BlockOracle on the L2 chain
        // showing that the L1Block passed is a valid block according to the L2 chains L1BlockOracle
        proveStorage(
            abi.encodePacked(uint256(L1_BLOCK_ORACLE_BLOCK_HASH_SLOT_NUMBER)),
            // l2l1SlotNumber,
            bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(l1blockProof.blockHash)),
            l2l1StorageProof,
            bytes32(l2l1StorageStateRoot)
        );

        proveAccount(
            abi.encodePacked(L1_BLOCK_ADDRESS), // L1BlockOracle Address
            rlpEncodedL2L1BlockData, // RLP Encoded L1BlockData
            l2AccountProof, // Account Proof
            l2WorldStateRoot // L2WorldStateRoot
        );
        if (existingBlockProof.blockNumber < l1blockProof.blockNumber) {
            provenStates[settlementChainId] = l1blockProof;
            emit L1WorldStateProven(l1blockProof.blockNumber, l1blockProof.stateRoot);
        } else {
            revert OutdatedBlock(l1blockProof.blockNumber, existingBlockProof.blockNumber);
        }
    }

    // To see block information available on chain see
    // https://docs.soliditylang.org/en/latest/units-and-global-variables.html#block-and-transaction-properties
    /**
     * @notice validates input block state against the last 256 blocks on chain
     * @param rlpEncodedBlockData properly encoded block data
     * @dev inputting the correct block's data encoded as expected will result in its hash matching
     * the blockhash found on the last 256 blocks on chain. This means that the world state root found
     * in that block represents a valid state.
     */
    function proveSelfState(bytes calldata rlpEncodedBlockData) public {
        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[3]))
        });
        require(
            blockhash(blockProof.blockNumber) == blockProof.blockHash,
            "blockhash is not in last 256 blocks for this chain"
        );
        BlockProof memory existingBlockProof = provenStates[block.chainid];
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[block.chainid] = blockProof;
            emit SelfStateProven(blockProof.blockNumber, blockProof.stateRoot);
        } else {
            revert OutdatedBlock(blockProof.blockNumber, existingBlockProof.blockNumber);
        }
    }
    /**
     * @notice Validates World state by ensuring that the passed in world state root corresponds to value in the L2 output oracle on the Settlement Layer
     * @param chainId the chain id of the chain we are proving
     * @param rlpEncodedBlockData properly encoded L1 block data
     * @param l2WorldStateRoot the state root of the last block in the batch which contains the block in which the fulfill tx happened
     * @param l2MessagePasserStateRoot // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
     * @param l2OutputIndex the batch number
     * @param l1StorageProof todo
     * @param rlpEncodedOutputOracleData rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
     * @param l1AccountProof accountProof from eth_getProof(L2OutputOracle, [], )
     * @param l1WorldStateRoot the l1 world state root that was proven in proveSettlementLayerState
     */

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
    ) public virtual {
        // could set a more strict requirement here to make the L1 block number greater than something corresponding to the intent creation
        // can also use timestamp instead of block when this is proven for better crosschain knowledge
        // failing the need for all that, change the mapping to map to bool
        ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        BlockProof memory existingSettlementBlockProof = provenStates[chainConfiguration.settlementChainId];
        require(
            existingSettlementBlockProof.stateRoot == l1WorldStateRoot, "settlement chain state root not yet proved"
        );

        bytes32 outputRoot = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, keccak256(rlpEncodedBlockData)
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
            abi.encodePacked(chainConfiguration.settlementContract),
            rlpEncodedOutputOracleData,
            l1AccountProof,
            l1WorldStateRoot
        );

        // provenL2States[l2WorldStateRoot] = l2OutputIndex;

        BlockProof memory existingBlockProof = provenStates[chainId];
        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: l2WorldStateRoot
        });
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[chainId] = blockProof;
            emit L2WorldStateProven(chainId, blockProof.blockNumber, blockProof.stateRoot);
        } else {
            if (existingBlockProof.blockNumber > blockProof.blockNumber) {
                revert OutdatedBlock(blockProof.blockNumber, existingBlockProof.blockNumber);
            }
        }
    }

    function _faultDisputeGameFromFactory(
        address disputeGameFactoryAddress,
        bytes32 l2WorldStateRoot,
        DisputeGameFactoryProofData calldata disputeGameFactoryProofData,
        bytes32 l1WorldStateRoot
    ) internal pure returns (address faultDisputeGameProxyAddress, bytes32 rootClaim) {
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
            _value = bytes.concat(bytes1(uint8(0x98)), gameId24);
        } else {
            _value = bytes.concat(bytes1(uint8(0x9d)), gameId29);
        }

        bytes32 _rootClaim = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER,
            l2WorldStateRoot,
            disputeGameFactoryProofData.messagePasserStateRoot,
            disputeGameFactoryProofData.latestBlockHash
        );

        bytes32 disputeGameFactoryStorageSlot = bytes32(
            abi.encode(
                (
                    uint256(keccak256(abi.encode(L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER)))
                        + disputeGameFactoryProofData.gameIndex
                )
            )
        );

        bytes memory disputeGameFactoryStateRoot =
            RLPReader.readBytes(RLPReader.readList(disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData)[2]);

        require(disputeGameFactoryStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(disputeGameFactoryStorageSlot),
            _value,
            disputeGameFactoryProofData.disputeFaultGameStorageProof,
            bytes32(disputeGameFactoryStateRoot)
        );

        proveAccount(
            abi.encodePacked(disputeGameFactoryAddress),
            disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData,
            disputeGameFactoryProofData.disputeGameFactoryAccountProof,
            l1WorldStateRoot
        );

        (,, address _faultDisputeGameProxyAddress) = unpack(disputeGameFactoryProofData.gameId);

        return (_faultDisputeGameProxyAddress, _rootClaim);
    }

    /**
     * @notice Validates world state for Cannon by validating the following Storage proofs for the faultDisputeGame.
     * @notice 1) the rootClaim is correct by checking the gameId is in storage in the gamesList (will need to know the index number)
     * @notice 2) calculate the FaultDisputeGameAddress from the gameId
     * @notice 2) the l2BlockNumber is correct
     * @notice 3) the status is complete (2)
     * @notice this gives a total of 3 StorageProofs and 1 AccountProof which must be validated.
     * @param chainId the chain id of the chain we are proving
     * @param rlpEncodedBlockData properly encoded L1 block data
     */
    function proveWorldStateCannon(
        uint256 chainId, //the destination chain id of the intent we are proving
        bytes calldata rlpEncodedBlockData,
        bytes32 l2WorldStateRoot,
        DisputeGameFactoryProofData calldata disputeGameFactoryProofData,
        FaultDisputeGameProofData memory faultDisputeGameProofData,
        bytes32 l1WorldStateRoot
    ) public {
        ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        BlockProof memory existingSettlementBlockProof = provenStates[chainConfiguration.settlementChainId];
        require(
            existingSettlementBlockProof.stateRoot == l1WorldStateRoot, "settlement chain state root not yet proved"
        );
        // prove that the FaultDisputeGame was created by the Dispute Game Factory
        // require(provenL1States[l1WorldStateRoot] > 0, "l1 state root not yet proved");

        bytes32 rootClaim;
        address faultDisputeGameProxyAddress;

        (faultDisputeGameProxyAddress, rootClaim) = _faultDisputeGameFromFactory(
            chainConfiguration.settlementContract, l2WorldStateRoot, disputeGameFactoryProofData, l1WorldStateRoot
        );

        faultDisputeGameIsResolved(rootClaim, faultDisputeGameProxyAddress, faultDisputeGameProofData, l1WorldStateRoot);

        BlockProof memory existingBlockProof = provenStates[chainId];
        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: l2WorldStateRoot
        });
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[chainId] = blockProof;
            emit L2WorldStateProven(chainId, blockProof.blockNumber, blockProof.stateRoot);
        } else {
            if (existingBlockProof.blockNumber > blockProof.blockNumber) {
                revert OutdatedBlock(blockProof.blockNumber, existingBlockProof.blockNumber);
            }
        }
    }

    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param claimant the address that can claim the reward
     * @param inboxContract the address of the inbox contract
     * @param intermediateHash the hash which, when hashed with the correct inbox contract, will result in the correct intentHash
     * @param l2StorageProof todo
     * @param rlpEncodedInboxData todo
     * @param l2AccountProof todo
     * @param l2WorldStateRoot todo
     */
    function proveIntent(
        uint256 chainId, //the destination chain id of the intent we are proving
        address claimant,
        address inboxContract,
        bytes32 intermediateHash,
        bytes[] calldata l2StorageProof,
        bytes calldata rlpEncodedInboxData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public {
        // ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        BlockProof memory existingBlockProof = provenStates[chainId];
        require(existingBlockProof.stateRoot == l2WorldStateRoot, "destination chain state root not yet proved");

        bytes32 intentHash = keccak256(abi.encode(inboxContract, intermediateHash));

        bytes32 messageMappingSlot = keccak256(
            abi.encode(
                intentHash,
                1 // storage position of the intents mapping is the first slot
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
        emit IntentProven(intentHash, claimant);
    }
}
