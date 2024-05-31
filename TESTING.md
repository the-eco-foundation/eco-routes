# Testing Overview - Sepolia Testnet

## Overview

This document outlines how to test the intent protocol in the Sepolia testnet environment.

For the purposes of the inital walkthrough we use the following chains

1. Optimism Sepolia - Source chain where intents are created and funds are claimed by the solver.
2. Base Sepolia - destination chain where intents are solved by solvers transferring funds to the recipients via the Inbox.sol
3. Sepolia - Layer 1 used in proof generation to ensure that solver transactions on the destination chain (Base, an optimistic rollup) have been "settled" on the Layer 1 chain.

It runs through two use cases

1. Positive Walkthrough: An intent is created, solved and funds claimed.

- An intent is created on the source chain interacting with `IntentSource.sol` on Optimism Sepolia
- A solver solves the destination chain by fullfilling the intent via `IntentSource.sol`
- A proof is generated for the solved intent and the intent is marked as proven on the source chain via `Prover.sol`
- Funds are claimed by the solver on the source chain via `IntentSource.sol` which checks if the intent has been proven via `Prover.sol`

2. Clawback - Intent creator claws back funds after intent goes unsolved.

- An intent is created on the source chain interacting with `IntentSource.sol` on Optimism Sepolia
- Funds are claimed by the intent creator on the source chain via `IntentSource.sol` which ensures that the intent execution period has expired and that the intent has not been proven via `Prover.sol`

## Pre-requisites

### Funding

The following wallets should be funded for end to end testing.

- Deployment Wallet
- Intent Creator
- Solver
- Prover

### Existing Contracts

The following existing contracts should be identified

- USDC on both Optimism and Sepolia
- L2OutputOracle on Sepolia
  - [0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254](https://sepolia.etherscan.io/address/0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254#readProxyContract)

## Deployment

T

## End to End Testing

### Positive Walkthrough - Claimant

1. Intent Creation
2. Intent Solving
3. Proof Generation
4. Prover Update
5. Claim Rewards

### Positive Walkthrough Clawback

1. Intent Creation
2. Claw Back Funds

## Appendix A - L2StateProof

The following gives a walkthrough of proving an L2 State Root from Base Sepolia using
the function `proveOutputRoot` on `Prover.sol`

This proves the state root for an intent which was solved with transaction
[0xd204719a950d76039da2ce6e91f12085afc66541a3c37626d187a98e592a4f48](https://sepolia-optimism.etherscan.io/tx/0xd204719a950d76039da2ce6e91f12085afc66541a3c37626d187a98e592a4f48)

## Input Parameters

- `bytes32 l2WorldStateRoot,`
- bytes32 l2MessagePasserStateRoot,
- bytes32 l2LatestBlockHash,
- uint256 l2OutputIndex,
- bytes[] calldata l1StorageProof,
- bytes calldata rlpEncodedOutputOracleData,
- bytes[] calldata l1AccountProof,
- bytes32 l1WorldStateRoot
