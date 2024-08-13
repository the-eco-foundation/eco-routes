# Optimism Bedrock

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

- [Overview](#overview)
- [Existing Contracts](#existing-contracts)
  - [Mainnet](#mainnet)
    - [Ethereum - L1](#ethereum---l1)
    - [Optimism - L2 Source Chain](#optimism---l2-source-chain)
    - [Base - L2 Destination Chain](#base---l2-destination-chain)
    - [Sample Transaction Walkthrough](#sample-transaction-walkthrough)
  - [Testnet](#testnet)
    - [Sepolia - L1](#sepolia---l1)
    - [Sepolia Optimism - L2 Source Chain](#sepolia-optimism---l2-source-chain)
    - [Sepolia Base - L2 Destination Chain](#sepolia-base---l2-destination-chain)
    - [Sepolia Sample Transaction Walkthrough](#sepolia-sample-transaction-walkthrough)
- [Existing Actors](#existing-actors)
- [Pre-requisites](#pre-requisites)
  - [Funding](#funding)
- [Deployment](#deployment)
- [Sample End To End Flow (WIP)](#sample-end-to-end-flow-wip)
  - [Positive Walkthrough Clawback](#positive-walkthrough-clawback)
- [Additional References](#additional-references)
- [ToDo List](#todo-list)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

This document outlines how to test the intent protocol in the Sepolia testnet environment.

For the purposes of the inital walkthrough we use the following chains

1. Optimism Sepolia - Source chain where intents are created and funds are claimed by the solver.
2. Base Sepolia - destination chain where intents are solved by solvers transferring funds to the recipients via the Inbox.sol
3. Sepolia - Layer 1 used in proof generation to ensure that solver transactions on the destination chain (Base, an optimistic rollup) have been "settled" on the Layer 1 chain. _Note: Both Optimism Sepolia and Base Sepolia settle to the Sepolia Chain._

It runs through two use cases

1. Positive Walkthrough: An intent is created, solved and funds claimed.

- An intent is created on the source chain interacting with `IntentSource.sol` on Optimism Sepolia
- A solver solves the destination chain by fullfilling the intent via `IntentSource.sol`
- A proof is generated for the solved intent and the intent is marked as proven on the source chain via `Prover.sol`
- Funds are claimed by the solver on the source chain via `IntentSource.sol` which checks if the intent has been proven via `Prover.sol`

2. Clawback - Intent creator claws back funds after intent goes unsolved.

- An intent is created on the source chain interacting with `IntentSource.sol` on Optimism Sepolia
- Funds are claimed by the intent creator on the source chain via `IntentSource.sol` which ensures that the intent execution period has expired and that the intent has not been proven via `Prover.sol`

## Existing Contracts

### Mainnet

#### Ethereum - L1

| Contract                | Address                                                                                                               | Description                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L2_OUTPUT_ORACLE (BASE) | [0x56315b90c40730925ec5485cf004d835058518A0](https://etherscan.io/address/0x56315b90c40730925ec5485cf004d835058518A0) | Settles a batch of blocks (1800) from L2 Base to L1 Ethereum - Every 1 hour _Note: The batch being settled may have had it's last block created 20 or 30 minutes before it's settled_ |

#### Optimism - L2 Source Chain

| Contract      | Address                                                                                                                          | Description                                                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1BLOCK       | [0x4200000000000000000000000000000000000015](https://optimistic.etherscan.io/address/0x4200000000000000000000000000000000000015) | Updates L2 Optimism with the latest block information from L1 Ethreum every time a new block is generated on L2 Optimsm (every 2 seconds). Only stores the last blocks information                                                     |
| PROVER        | [0x3812325c34CFb3144b15B6E69cB5Bb7357624c26](https://optimistic.etherscan.io/address/0x3812325c34CFb3144b15B6E69cB5Bb7357624c26) | Proving Contract includes functionality to prove L1 and L2 states and intents. Also has helper functions. This contract is checked by INTENT_SOURCE when withdrawing funds or doing a clawback.                                        |
| INTENT_SOURCE | [0x5F8c665a76c65E34A7Ff88c4EbF68D64596f84B7](https://optimistic.etherscan.io/address/0x5F8c665a76c65E34A7Ff88c4EbF68D64596f84B7) | Intent Management Contract on the source chain. Includes creation, query, clawback and withdrawal function for intents keyed by inent_hash. Sample intent_hash is `0xf09d47657185c335e6875b60bd5791fe35589762667b32fb4b90d38d6e46a8b0` |
| USDC          | [0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85](https://optimistic.etherscan.io/address/0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85) | StableCoin used in intents.                                                                                                                                                                                                            |

#### Base - L2 Destination Chain

| Contract             | Address                                                                                                               | Description                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L2_L1_MESSAGE_PARSER | [0x4200000000000000000000000000000000000016](https://basescan.org/address/0x4200000000000000000000000000000000000016) | a dedicated contract where messages that are being sent from L2 to L1 are stored.                                                                                                                          |
| INBOX                | [0xAca455CCfbE4F02b2091413ECe0EF2424eb8D6fb](https://basescan.org/address/0xAca455CCfbE4F02b2091413ECe0EF2424eb8D6fb) | Inbox contract manages the fulfillment of Intents by Solvers it allows querying of whether intents are fullfilled by intent_hash e.g. `0x1d528d2dddf799f19ab967bda28276cb6024bf9afbe5fe2aa76664bc42679496` |
| USDC                 | [0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | StableCoin used in intents.                                                                                                                                                                                |

#### Sample Transaction Walkthrough

| Event                | Transaction                                                                                                                                                                 | Key                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intent Created       | [0xa13aa246bcc451926eddef55d52dfd878e2daaff54b3a549db7c29f602f9e9da](https://optimistic.etherscan.io/tx/0xa13aa246bcc451926eddef55d52dfd878e2daaff54b3a549db7c29f602f9e9da) | Intent Hash: `0xf09d47657185c335e6875b60bd5791fe35589762667b32fb4b90d38d6e46a8b0`                                                                                                                                          |
| Intent Fulfillment   | [0xe3af9e0562d411947ca5c20cb5c9491cd9186cc74a0cbf4a063583ccd1738a3f](https://basescan.org/tx/0xe3af9e0562d411947ca5c20cb5c9491cd9186cc74a0cbf4a063583ccd1738a3f)            | L1 Batch: `9329`, L1 Settlement Tx (Ethereum): `0x9abd36b0ed743dbb7c95ee2c153915197976572732bad41b757cbbb0812a95b5` L1 Settlement Block (Ethereum): `20256551` (`0x1351727`) L2 last block in batch 16794000 (`0x1004190`) |
| Prove L1 World State | [0xc779b86f1d11bc11ac230e59546b5dccbcc23b6bfd28be24b6ae390c30fba54f](https://optimistic.etherscan.io/tx/0xc779b86f1d11bc11ac230e59546b5dccbcc23b6bfd28be24b6ae390c30fba54f) | Block: `20256604` (`0x135175c`) , L1 World State Root: `0x94b1eb2dd2a7fdc40aa29fb901320e45de020095947a7210741c15c471a19532`                                                                                                |
| Prove L2 World State | [0x8504d3a986bb69a0eaed698ba15d3f571d24dc36595aa91bfb0b47a1df7baef8](https://optimistic.etherscan.io/tx/0x8504d3a986bb69a0eaed698ba15d3f571d24dc36595aa91bfb0b47a1df7baef8) | L1 Batch: `9329`                                                                                                                                                                                                           |
| Prove Intent         | [0x4a5d7b9a900de6bc85d9940980e5f8251eeadc85d5fd99c008c7f39fa9847d6e](https://optimistic.etherscan.io/tx/0x4a5d7b9a900de6bc85d9940980e5f8251eeadc85d5fd99c008c7f39fa9847d6e) | Intent Hash: `0xf09d47657185c335e6875b60bd5791fe35589762667b32fb4b90d38d6e46a8b0`                                                                                                                                          |
| Withdrawal           | [0xa87184a979460c41ffc02ed4da857e38c76f2722b9113331e053a7f6f3bf7bec](https://optimistic.etherscan.io/tx/0xa87184a979460c41ffc02ed4da857e38c76f2722b9113331e053a7f6f3bf7bec) | Intent Hash: `0xf09d47657185c335e6875b60bd5791fe35589762667b32fb4b90d38d6e46a8b0`                                                                                                                                          |

### Testnet

#### Sepolia - L1

| Contract                | Address                                                                                                                       | Description                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| L2_OUTPUT_ORACLE (BASE) | [0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254](https://sepolia.etherscan.io/address/0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254) | Settles a batch of blocks (120) from L2 Base to L1 Sepolia - Every 3 minutes |

#### Sepolia Optimism - L2 Source Chain

| Contract      | Address                                                                                                                                  | Description                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1BLOCK       | [0x4200000000000000000000000000000000000015](https://sepolia-optimism.etherscan.io/address/0x4200000000000000000000000000000000000015)   | Updates L2 Sepolia Optimism with the latest block information from L1 Sepolia every time a new block is generated on L2 Sepolia Optimsm (every 3 seconds). Only stores the last blocks information                                     |
| PROVER        | [0x6798EbAf16b2E23EfcaD15Fe3493f25D6ed1C892](https://optimism-sepolia.blockscout.com/address/0x6798EbAf16b2E23EfcaD15Fe3493f25D6ed1C892) | Proving Contract includes functionality to prove L1 and L2 states and intents. Also has helper functions. This contract is checked by INTENT_SOURCE when withdrawing funds or doing a clawback.                                        |
| INTENT_SOURCE | [0xc61Ac926D7efE2251CdFeae384F75222FDAe7a3F](https://optimism-sepolia.blockscout.com/address/0xc61Ac926D7efE2251CdFeae384F75222FDAe7a3F) | Intent Management Contract on the source chain. Includes creation, query, clawback and withdrawal function for intents keyed by inent_hash. Sample intent_hash is `0xbf9af46bbf718cc390386e4e033b97c5def219860453ea75f72be357fc9e209e` |
| USDC          | [0x5fd84259d66Cd46123540766Be93DFE6D43130D7](https://sepolia-optimism.etherscan.io/address/0x5fd84259d66Cd46123540766Be93DFE6D43130D7)   | StableCoin used in intents, The faucet is [here](https://faucet.circle.com/)                                                                                                                                                           |

#### Sepolia Base - L2 Destination Chain

| Contract             | Address                                                                                                                              | Description                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L2_L1_MESSAGE_PARSER | [0x4200000000000000000000000000000000000016](https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000016)        | a dedicated contract where messages that are being sent from L2 to L1 can be stored.                                                                                                                       |
| INBOX                | [0xf820639A8508cbA7E9F2C26FC43e61b2342A25B3](https://sepolia.basescan.org/address/0xf820639A8508cbA7E9F2C26FC43e61b2342A25B3)        | Inbox contract manages the fulfillment of Intents by Solvers it allows querying of whether intents are fullfilled by intent_hash e.g. `0xbf9af46bbf718cc390386e4e033b97c5def219860453ea75f72be357fc9e209e` |
| USDC                 | [0x036CbD53842c5426634e7929541eC2318f3dCF7e](https://base-sepolia.blockscout.com/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | StableCoin used in intents, The faucet is [here](https://faucet.circle.com/)                                                                                                                               |

#### Sepolia Sample Transaction Walkthrough

| Event                | Transaction                                                                                                                                                                         | Key                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intent Created       | [0x3f4260595272698fe5768788b6a8d9b3468719b3debb2dc83a05013c07a9c89b](https://optimism-sepolia.blockscout.com/tx/0x3f4260595272698fe5768788b6a8d9b3468719b3debb2dc83a05013c07a9c89b) | Intent Hash: `0xbf9af46bbf718cc390386e4e033b97c5def219860453ea75f72be357fc9e209e`                                                                                                                                       |
| Intent Fulfillment   | [0xd18aa8558f21f91e15bfb1dc8c9ce11b79e87b47405c060d6b5db838e140117d](https://sepolia.basescan.org/tx/0xd18aa8558f21f91e15bfb1dc8c9ce11b79e87b47405c060d6b5db838e140117d)            | L1 Batch: `102535`, L1 Settlement Tx (Sepolia): `0x5e54688a77610541203b431d241b50ebd2a19661890b1f743b0faf61430c2586` L1 Settlement Block (Sepolia): `6265249` (`0x5f99a1`) L2 last block in batch 12304320 (`0xbbbfc0`) |
| Prove L1 World State | [0x6cb668c2a7743e7a1f0ccefb86bc901cab729bdf3130231192ab5dd060f3da91](https://optimism-sepolia.blockscout.com/tx/0x6cb668c2a7743e7a1f0ccefb86bc901cab729bdf3130231192ab5dd060f3da91) | Block: `14287628` (`0xda030c`) , L1 World State Root: `0x4f536f797767a4c5855503f0db213f50c276cae72a98dec404cddf5bd5bce85d`                                                                                              |
| Prove L2 World State | [0x01faabd444db69f54eaa9f7650627a46cbbae52612e5e0b56ab4c18bca597b1c](https://optimism-sepolia.blockscout.com/tx/0x01faabd444db69f54eaa9f7650627a46cbbae52612e5e0b56ab4c18bca597b1c) | L1 Batch: `102535`                                                                                                                                                                                                      |
| Prove Intent         | [0x2bd8cfa9fa6742060d2b56610b4750673c43d9b43c77a91baf2463f4125aad89](https://optimism-sepolia.blockscout.com/tx/0x2bd8cfa9fa6742060d2b56610b4750673c43d9b43c77a91baf2463f4125aad89) | Intent Hash: `0xbf9af46bbf718cc390386e4e033b97c5def219860453ea75f72be357fc9e209e`                                                                                                                                       |
| Withdrawal           | [0x7bd39db55a7045412968f0aabd5965af6826bb04cd4b4cd14f938f007e29639e](https://optimism-sepolia.blockscout.com/tx/0x7bd39db55a7045412968f0aabd5965af6826bb04cd4b4cd14f938f007e29639e) | Intent Hash: `0xbf9af46bbf718cc390386e4e033b97c5def219860453ea75f72be357fc9e209e`                                                                                                                                       |

Additional Links

- [Optimsim System Contracts](https://docs.optimism.io/chain/addresses)
- [Base System Contracts](https://docs.base.org/docs/base-contracts)

## Existing Actors

We use the following accounts for testing in the Sepolia environment.

- Deployer : 0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4
- Intent Creator: 0x448729e46C442B55C43218c6DB91c4633D36dFC0
- Solver: 0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E
- Prover: 0x923d4fDfD0Fb231FDA7A71545953Acca41123652
- Claimaint: 0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58

## Pre-requisites

### Funding

For Testing wallets will need ETH and USDC. USDC Testned Addresses can be found [here](https://developers.circle.com/stablecoins/docs/usdc-on-test-networks) and the faucet is [here](https://faucet.circle.com/). Note for Testnet ETH most faucets require a mainnet balance of ETH, so reach out internally and colleagues may be able to transfer ETH to you.

The following wallets should be funded for end to end testing.

- Deployment Wallet - 0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4
  - Base Sepoli - ETH
  - Optimism Sepolia - ETH
- Intent Creator - 0x448729e46C442B55C43218c6DB91c4633D36dFC0
  - Optimism Sepolia - ETH, USDC
- Solver - 0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E
  - Base Sepolia - ETH, USDC
- Prover - 0x923d4fDfD0Fb231FDA7A71545953Acca41123652
  - Optimism Sepolia - ETH

## Deployment

The following scripts are setup for Deployment

Source Chain (Optimism Sepolia)

- [deploySourceAndProver.ts](https://github.com/eco/ecoism/blob/main/scripts/deploySourceAndProver.ts): Deploys [Prover.sol](https://github.com/eco/ecoism/blob/main/contracts/Prover.sol) and [IntentSource.sol](https://github.com/eco/ecoism/blob/main/contracts/IntentSource.sol)

```bash
ecoism (ECO-1885-JW-TEST)$ yarn deploySourceAndProver
yarn run v1.22.22
$ hardhat run --network sepoliaOptimismBlockscout scripts/deploySourceAndProver.ts
Deploying contracts with the account: 0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4
prover deployed to: 0x653f38527B6271F8624316B92b4BaA2B06D1aa57
Successfully submitted source code for contract
contracts/Prover.sol:Prover at 0x653f38527B6271F8624316B92b4BaA2B06D1aa57
for verification on the block explorer. Waiting for verification result...

Successfully verified contract Prover on the block explorer.
https://optimism-sepolia.blockscout.com/address/0x653f38527B6271F8624316B92b4BaA2B06D1aa57#code

intentSource deployed to: 0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46
Successfully submitted source code for contract
contracts/IntentSource.sol:IntentSource at 0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46
for verification on the block explorer. Waiting for verification result...

Successfully verified contract IntentSource on the block explorer.
https://optimism-sepolia.blockscout.com/address/0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46#code

✨  Done in 30.85s.
```

Destination Chain (Base Sepolia)

- [deploy-inbox.ts](https://github.com/eco/ecoism/blob/main/scripts/deploy-inbox.ts): Deploys [Inbox.sol](https://github.com/eco/ecoism/blob/main/contracts/Inbox.sol)

```bash
ecoism (ECO-1885-JW-TEST)$ yarn deployInbox
yarn run v1.22.22
$ hardhat run --network baseSepolia scripts/deployInbox.ts
Deploying contracts with the account: 0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4
Inbox deployed to: 0x84b9b3521b20E4dCF10e743548362df09840D202
The contract 0x84b9b3521b20E4dCF10e743548362df09840D202 has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.basescan.org/address/0x84b9b3521b20E4dCF10e743548362df09840D202#code

✨  Done in 8.41s.
```

## Sample End To End Flow (WIP)

Following is a sample transaction flow with links to transactions in the Testnet (Sepolia) Environments.
It also includes input and outputs

Transaction Flow (with links to transactions)

- [Sepolia Optimism Intent Created](https://optimism-sepolia.blockscout.com/tx/0xdcec879122df8469101d4d18dabb382312acee435ff8fc138b2dbc1c7d058595)
  - Input Values
    - Destination Chain Id: `84532` (Sepolia Base)
    - Targets : [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`] (Target Token Address USDC Sepolia Base)
    - data : `[await encodeTransfer(destAddress, amt)]` (Intent Amount = 1235)
    - rewardTokens: `[0x00D2d1162c689179e8bA7a3b936f80A010A0b5CF]` Reward Token Address USDC Sepolia Optimism
    - rewardAmounts - `1235` Reward token amount the solver or claimant will receive
    - expiryTime - `(await ethers.provider.getBlock('latest'))!.timestamp + duration` duration is 3600 which means that we have an hour from the intent creation to solve and prove the intent so the solver (or claimant) can claim the funds.
  - Output Values - query the IntentSource contract [here](https://optimism-sepolia.blockscout.com/address/0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46?tab=read_contract) with the Intent Hash
    - INTENT_TRANSACTION 0xdcec879122df8469101d4d18dabb382312acee435ff8fc138b2dbc1c7d058595
    - INTENT_HASH 0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8
    - INTENT_NONCE 0xbdf8aa3e891eaf55796069c59400592f18ace63bccfc836dab094d09c3ed6ce3
    - IntentCreated Event:
      - `intentHash`: `` need to writ
      - `intents[intentHash]`: `0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8` this is the value to be queried to get the intent nonce
      - **intentNonce** - TBD we may want to add this as intent nonce is used by the solver
- [Sepolia Base Intent Solved](https://sepolia.basescan.org/tx/0x73a239917783af3d1b9bbaf6152ed19de757096b34636d168a42ef3450d5906f)
  - Input Values
    - nonce: `0xbdf8aa3e891eaf55796069c59400592f18ace63bccfc836dab094d09c3ed6ce3` The nonce of the intent we are tsolving
    - targets: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` The target token USDC Sepolia Base
    - calldata: `[await encodeTransfer(destAddress, amt)]` The recepients address and the amount they should have received
    - timeStamp: `17177241503600` the intent expiry time
    - claimerAddress: `0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58` the address of the solver (or the claimer) who can claim the funds once it is proven that the intent has been solved.
  - Output Values
    - Transaction Hash : `0x73a239917783af3d1b9bbaf6152ed19de757096b34636d168a42ef3450d5906f` the transaction hash of the solve on the L2 Destination Chain [Sepolia Base]
    - Fulfillment Event
      - `intentHash` : `0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8` the hash of the intent we just solved
- [Sepolia Base L1 World State Proven](https://optimism-sepolia.blockscout.com/tx/0x5ec51e387ccc39ec7dd3f21b5bfc1bd7f12f71c7a3ab1f283969c1f4deedc591)
  - i.e. L2 Batch of Blocks have been Settled from Sepolia Base to Sepolia and published to Sepolia Optimism (we need to prove the L1 Block that the L2 Batch was submitted on) and this needs to be proved within a block time due to the fact that we are checking the L1BlockOracle contract on the L2 Source Chain which holds the Latest Ethereum block `require(keccak256(rlpEncodedL1BlockData) == l1BlockhashOracle.hash(), "hash does not match block data");`
  - Input
    - `rlpEncodedL1BlockData`: `prover.rlpEncodeDataLibList(blockData)` Cleaned block data retrieved from L1 (Sepolia) for our test we had
      - FULFILLMENT_TRANSACTION=0x73a239917783af3d1b9bbaf6152ed19de757096b34636d168a42ef3450d5906f
      - FULFILLMENT_BLOCK_NUMBER=10978073
      - FULFILLMENT_BLOCK_HASH=0xcc682ef8fc55061db71007cc76662d1a109ca2a94168e5aa7d3f9aebd38364fa
      - FULFILLMENT_BLOCK_BATCH=91483
      - FULFILLMENT_BLOCK_BATCH_LAST_BLOCK=10978080
      - FULFILLMENT_BLOCK_BATCH_LAST_BLOCK_HASH=0xe41b89c14bc987d9c557742e790dfaee50ddb1bf981c5e9854fe5c50a96646fb
      - FULFILLMENT_L1BLOCK=6054921
      - FULFILLMENT_L1BLOCK_HASH=0x43399d539577a23a93d713934c6b490210c69915aba2f1c4c9203618cc141c64
      - FULFILLMENT_L1_WORLD_STATE_ROOT=0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135
      - FULFILLMENT_L1_STATE_ROOT_SUBMISSION_TX=0xbc0d0b35f144aeb2239b3d97c36b56b7e0d933618e3d9bf6c6ab16882a464f8a
  - Output
    - Transaction Hash
    - **TBD** May also want to add an event with the L1WorldState and some helper function which we use for proving the L2World State
- [Sepolia Base L2 World State Proven](https://optimism-sepolia.blockscout.com/tx/0xb8d84173ca20eb1c2eb3a5f41734a5705963c11ac4460b0133d526d790f4e677)
  - Proves the world state of the L2 transaction on Sepolia Base
  - Input
    - `l2WorldStateRoot`: `0xb14d9f17dc0617917016f2618c0dfd6eb7b76d7932950a86d23b7d036c6259e7` this is the stateRoot from the last block in the L1Batch on the L2 Destination chain (Sepolia Base) for the intent we are trying to prove
    - `l2MessagePasserStateRoot` this is the State root from the message parser contract (i.e. the storageHash) Note it is retrieved from the block the intent was executed in (not the last block of the batch)
    - `l2LatestBlockHash`: The hash of the latest L2 Destination (Sepolia Base) block in the L1 Batch
    - `l2OutputIndex`: The L1 State Batch Index retrieved from the L2 Destination Chain (Base Sepolia) for the L1 Batch of the transaction the intent was solved in.
    - `l1StorageProof`
    - `rlpEncodedOutputOracleData`
    - `l1AccountProof`
    - `l1WorldStateRoot`
  - Output
    - Transaction Hash
    - **TBD** may want to add an event here with information about what we have just proven
- [Sepolia Base Prove Intent](https://optimism-sepolia.blockscout.com/tx/0x0b75140daab00193cc5c9b00ba612ad1dbb0ef4c2d69dd5669eb540536671150)
  - i.e. This intent has been proven to have been solved on Sepolia Base and the prover contract on Optimism Base has this intent marked as proven **Note: it requires L1 and L2 State Proven**
  - Input
    - `address claimant,`
    - `address inboxContract,`
    - `bytes32 intentHash,`
    - `uint256 intentOutputIndex,`
    - `bytes[] calldata l2StorageProof,`
    - `bytes calldata rlpEncodedInboxData,`
    - `bytes[] calldata l2AccountProof,`
    - `bytes32 l2WorldStateRoot`
  - Output
    - Transaction Hash
    - **TBD** May need to add an event her with additional info
- [Sepolia Base Claimant Withdraws Funds](https://optimism-sepolia.blockscout.com/tx/0xf67b2f771b5fa978ae99c349d2230091e8ef3453c22750f5da9429f60f53d228)
  - Input
    - `intentHash`
  - Output
    - `emit Withdrawal(_hash, msg.sender);`

### Positive Walkthrough Clawback

1. Intent Creation
2. Claw Back Funds

## Additional References

Proving

- [EIP-1186: RPC-Method to get Merkle Proofs - eth_getProof](https://eips.ethereum.org/EIPS/eip-1186)
- [Ethereum Merkle Patricia Trie Explained](https://medium.com/@chiqing/merkle-patricia-trie-explained-ae3ac6a7e123)
- [Verify Ethereum Account Balance with State Proof](https://medium.com/@chiqing/verify-ethereum-account-balance-with-state-proof-83b51ceb15cf): used for proveAccount
- [Verify Ethereum Smart Contract State with Proof](https://medium.com/@chiqing/verify-ethereum-smart-contract-state-with-proof-1a8a0b4c8008) : Used for proveStorage
- [How to use Ethereum Proofs](https://www.infura.io/blog/post/how-to-use-ethereum-proofs-2)
- [Deep dive into Merkle proofs and eth_getProof (Chainstack)](https://docs.chainstack.com/docs/deep-dive-into-merkle-proofs-and-eth-getproof-ethereum-rpc-method)
- [SecureMerkleTrie.sol (Optimism)](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol)

Storage Layout

- [Alchemy - Smart Contract Storage Layout](https://docs.alchemy.com/docs/smart-contract-storage-layout): good explanation of storage and storage slots
- [Alchmey eth_createAccessList](https://docs.alchemy.com/reference/eth-createaccesslist)
- [Storage in Solidity](https://leanmind.es/en/blog/storage-in-solidity/): explains how to calculate the storage slot using kecakk256 and adding the array element to it.

Proving Protocols

- [Blockchain Interoperability Part III: Storage Proofs, Powering new cross-chain use cases](https://mirror.xyz/0xsuperscrypt.eth/-H1mV7irQ79Sy2KqtGQ050vUh8ENayRNjTx0YWbfRf4)
- [The current state of storage proofs (Dec 2023)](https://defi.sucks/insights/current-state-of-storage-proofs)

Solvers

- [Illuminating Ethereum's Order Flow Landscape](https://writings.flashbots.net/illuminate-the-order-flow)

## ToDo List

- [ ] Query Capabilities for Open Intents
  - [ ] see [Iterable Mappings](https://docs.soliditylang.org/en/v0.8.13/types.html#iterable-mappings)
  - [ ] [Iterable Mappings by example](https://solidity-by-example.org/app/iterable-mapping/)
- [ ] Refactor Chain Monitoring to use preferred tool
  - [ ] [Substream](https://substreams.streamingfast.io/)
  - [ ] [Ponder vs. subgraphs, incl. hosting options](https://x.com/LukeYoungblood/status/1784244530071605612)
    - [ ] [Moonwell subgraph](https://github.com/moonwell-fi/moonwell-subgraph)
  - [ ] [Ponder Documentation](https://ponder.sh/docs/getting-started/new-project)
  - [ ] [Goldsky](https://goldsky.com/products/subgraphs)
- [ ] Review and update Specification
  - [ ] [Ecoism Component Overview](https://docs.google.com/document/d/1uRRl4LKN1Ob24dUs0A0l4tzY1rEwHG44iC5OAs0agmQ/edit)
  - [ ] [Ecoism Research](https://www.notion.so/eco-corp/ECOism-Research-5afa3c34c9f343c1ac8c697af019a679)
  - [ ] [Ecoism Protocol Hub](https://www.notion.so/eco-corp/Ecoism-Protocol-Hub-434388a819e84238979281f408c02db4)
