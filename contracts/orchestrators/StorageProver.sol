// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
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
 */

import {IProver} from "../interfaces/IProver.sol";

contract StorageProver is IProver {
    IProver public prover;

    ProofType public constant PROOF_TYPE = ProofType.Storage;

    constructor(address _proverAddress) {
        // Prover prover = new Prover();
        prover = IProver(_proverAddress);
    }

    function getProofType() external pure override returns (ProofType) {
        return PROOF_TYPE;
    }

    function proveSettlementLayerState(bytes calldata rlpEncodedBlockData) public {
        prover.proveSettlementLayerState(rlpEncodedBlockData);
    }

    function proveL1L3SettlementLayerState(
        bytes calldata l1RlpEncodedBlockData,
        bytes calldata l2RlpEncodedBlockData,
        // bytes32 l2MessagePasserStateRoot,
        bytes[] calldata l2l1StorageProof,
        bytes calldata rlpEncodedL2L1BlockData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public {
        prover.proveL1L3SettlementLayerState(
            l1RlpEncodedBlockData,
            l2RlpEncodedBlockData,
            l2l1StorageProof,
            rlpEncodedL2L1BlockData,
            l2AccountProof,
            l2WorldStateRoot
        );
    }

    function proveSelfState(bytes calldata rlpEncodedBlockData) public {
        prover.proveSelfState(rlpEncodedBlockData);
    }

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
    ) public {
        prover.proveWorldStateBedrock(
            chainId,
            rlpEncodedBlockData,
            l2WorldStateRoot,
            l2MessagePasserStateRoot,
            l2OutputIndex,
            l1StorageProof,
            rlpEncodedOutputOracleData,
            l1AccountProof,
            l1WorldStateRoot
        );
    }

    function proveWorldStateCannon(
        uint256 chainId, //the destination chain id of the intent we are proving
        bytes calldata rlpEncodedBlockData,
        bytes32 l2WorldStateRoot,
        DisputeGameFactoryProofData calldata disputeGameFactoryProofData,
        FaultDisputeGameProofData memory faultDisputeGameProofData,
        bytes32 l1WorldStateRoot
    ) public {
        prover.proveWorldStateCannon(
            chainId,
            rlpEncodedBlockData,
            l2WorldStateRoot,
            disputeGameFactoryProofData,
            faultDisputeGameProofData,
            l1WorldStateRoot
        );
    }

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
        prover.proveIntent(
            chainId,
            claimant,
            inboxContract,
            intermediateHash,
            l2StorageProof,
            rlpEncodedInboxData,
            l2AccountProof,
            l2WorldStateRoot
        );
    }
}
