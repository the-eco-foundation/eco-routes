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

## Existing Contracts

### Sepolia - L1

| Contract                | Address                                                                                                                       | Description                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| L2_OUTPUT_ORACLE (BASE) | [0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254](https://sepolia.etherscan.io/address/0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254) | Settles a batch of blocks (120) from L2 Base to L1 Sepolia - Every 3 minutes |

### Sepolia Optimism - L2 Source Chain

| Contract      | Address                                                                                                                                  | Description                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1BLOCK       | [0x4200000000000000000000000000000000000015](https://sepolia-optimism.etherscan.io/address/0x4200000000000000000000000000000000000015)   | Updates L2 Sepolia Optimism with the latest block information from L1 Sepolia every time a new block is generated on L2 Sepolia Optimsm (every 3 seconds). Only stores the last blocks information                                     |
| INTENT_SOURCE | [0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46](https://optimism-sepolia.blockscout.com/address/0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46) | Intent Management Contract on the source chain. Includes creation, query, clawback and withdrawal function for intents keyed by inent_hash. Sample intent_hash is `0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8` |
| PROVER        | [0x653f38527B6271F8624316B92b4BaA2B06D1aa57](https://optimism-sepolia.blockscout.com/address/0x653f38527B6271F8624316B92b4BaA2B06D1aa57) | Proving Contract includes functionality to prove L1 and L2 states and intents. Also has helper functions. This contract is checked by INTENT_SOURCE when withdrawing funds or doing a clawback.                                        |
| USDC          | [0x5fd84259d66Cd46123540766Be93DFE6D43130D7](https://sepolia-optimism.etherscan.io/address/0x5fd84259d66Cd46123540766Be93DFE6D43130D7)   | StableCoin used in intents, The faucet is [here](https://faucet.circle.com/)                                                                                                                                                           |

### Sepolia Base - L2 Destination Chain

| Contract             | Address                                                                                                                              | Description                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L2_L1_MESSAGE_PARSER | [0x4200000000000000000000000000000000000016](https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000016)        | a dedicated contract where messages that are being sent from L2 to L1 can be stored.                                                                                                                       |
| INBOX                | [0x84b9b3521b20E4dCF10e743548362df09840D202](https://sepolia.basescan.org/address/0x84b9b3521b20e4dcf10e743548362df09840d202)        | Inbox contract manages the fulfillment of Intents by Solvers it allows querying of whether intents are fullfilled by intent_hash e.g. `0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8` |
| USDC                 | [0x036CbD53842c5426634e7929541eC2318f3dCF7e](https://base-sepolia.blockscout.com/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | StableCoin used in intents, The faucet is [here](https://faucet.circle.com/)                                                                                                                               |

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

## Sample End To End Flow

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

## End to End Testing

### Positive Walkthrough - Claimant

1. Intent Creation - createIntent.ts
2. Intent Solving - fulfill-intent.ts
3. Prove L1 WorldState - proveL1WorldState.ts (checks the fullillment transaction (Inbox transaction on Sepolia Base) is in L1Batch which has been settled to L1 (Sepolia) and the L1 (Sepolia) Block this was settled in has been propogated to the source chain (Optimism Sepolia). It does this by checking the L1BLOCK_ADDRESS contract on the sourch chain (Optmism Sepolia) against the L1 (Sepolia) Batch Settlement Block data queried from L1 (Sepolia).
4. Prove OutputRoot.ts - proveOutput Root This calls two functions
   1. generateOutput - checks the state of the L1L2MessageParser (the contract that stores the L1(Sepolia) Blocks on L2 Destination(Sepolia Base) to make sure that the last block in the L1Batch for the fullfillment transaction (Sepolia Base) been settled on L1 and replicated back to L2 Destination (Sepolia Base).
   2. proveIntent - checks that the intent has been proved on the Destination Chain (Base Sepolia) and the L1 (Sepolia) World State for that Batch has been updated as settled. If so it then marks the intent as proved on the Source Chain (Optimism Sepolia). So the funds can be claimed.
5. Claim Rewards - withdrawReward.ts

```bash
# Intent creation
yarn createIntent

```

### Positive Walkthrough Clawback

1. Intent Creation
2. Claw Back Funds

## Appendix A - proveL1WorldState

The following gives an overview of proving an intent has been solved and settled on L1 using 'proveL1WorldState' on `Prover.sol`.
Note: The block we must prove is the L1 Block which contains the transaction hash for the `L1 State Root Submission Tx Hash` this is submitted for the last block of the BATCH. An example is

- in sepolia the fulfillment transaction was submittted in block 10978073
- which had an `L1 State Batch` of 91483
- The last block in batch 10978080 was 10978080
- The batch got submitted to Seplia in transaction 0xbc0d0b35f144aeb2239b3d97c36b56b7e0d933618e3d9bf6c6ab16882a464f8a
- Which was in Sepolia Block 6007763 (This is the block we need to prove on Optimism)
- We proved this using 0x653f38527B6271F8624316B92b4BaA2B06D1aa57
- With a world state root of 0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135

The logic overview for proving the current block is as follows

- Initialization
  - Connect to L2 Source Chain
  - Get the Prover Contract
  - Get the Last L1 Block from the L1 Block Oracle
- ProveL1WorldState

  - get the L1 Block using `eth_getBlockByNumber`
  - assemble the blockData
  - clean the BlockData
  - Prove the L1WorldState by calling `proverL1WorldState` using the encoded BlockData `prover.rlpEncodeDataLibList(blockData),`
    - This checks `keccak256(rlpEncodedL1BlockData) == l1BlockhashOracle.hash()`
    - Gets the block we are proving using `bytes32 l1WorldStateRoot = bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));`
    - Updates Proven states using `provenL1States[l1WorldStateRoot] = l1BlockhashOracle.number();`

- Example data on Sepolia Optimism
  - L1BLOCK_ADDRESS=0x4200000000000000000000000000000000000015
  - INTENT_SOURCE_ADDRESS=0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46
  - PROVER_CONTRACT_ADDRESS=0x653f38527B6271F8624316B92b4BaA2B06D1aa57
  - FULFILLMENT_L1BLOCK=6054921
  - FULFILLMENT_L1_WORLD_STATE_ROOT=0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135
  - FULFILLMENT_L1_STATE_ROOT_SUBMISSION_TX=0xbc0d0b35f144aeb2239b3d97c36b56b7e0d933618e3d9bf6c6ab16882a464f8a

## Appendix B - L2StateProof

The following gives a walkthrough of proving an L2 State Root from Base Sepolia using
the function `proveOutputRoot` on `Prover.sol`

Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1 It uses the following input parameters (and sample data)

- `l2WorldStateRoot` the state root of the last block in the batch which contains the block in which the fulfill tx happened
- `l2MessagePasserStateRoot` // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
- `l2LatestBlockHash` the hash of the last block in the batch
- `l2OutputIndex` the batch number
- `l1StorageProof` is the storageProof of the
  - `L2DestinationOutputOracleAddress`
  - `storageSlotOutputOracle`
  - `l1ContractData`
- `rlpEncodedOutputOracleData` rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
- `l1AccountProof` accountProof from eth_getProof(L2OutputOracle, [], )
- `l1WorldStateRoot` the l1 world state root that was proven in proveL1WorldState

<details>
  <summary>Sample Call Data</summary>
  <ol>

```TEXT
p1: 0xb14d9f17dc0617917016f2618c0dfd6eb7b76d7932950a86d23b7d036c6259e7
p2: 0xe3995a759462384a16b1b38de860f59452d8fbebbfc1917fa81085bc3902593f
p3: 0xe41b89c14bc987d9c557742e790dfaee50ddb1bf981c5e9854fe5c50a96646fb
p4: 91483
p5: [
  '0xf90211a086084e258578a92df6f6a43ab3aca6c2cc9dae4b5293d5f754ccd1a66ad3ffc8a0bc67eaa53ff57584f21dda79a7e847881261c3e20224caeb778d4423e9e007c9a0a57362d00b9cb6538434aec50114daafd4ff90b5cd72637b98b94d0b30d5748ca036520d8bfcfa3415c82d78a3977e81dba3220a3dd01b41eddeffd7bb145d561ea0c6de467ee1e50a8340eb906d7ca68c15e53df4ad17b4afdd2a9a236cd778d305a04b0ec7e1e72ec6fcc699da50a897cdc404e0f21e70bc1b0e0cc95f6571a200d4a054e386b51f56a10a7d9b0f4ae3baadbe3620954a54c91e08b51f8bf86371dbdda078c5807d9128665b412a12cf82e88e56c8ca0de2a9860c45daa626d529a6fc52a0895aa8bb056f2cdd1628e36f3a46747b9908041476339255cdc15a204ee14873a052a79e7432d20e5b3dd3cabf8cebc00d1bb110570922e3bb0c1a9906ed74d155a0c3a0c1eee9b914dfc061bc672901c8e147af0a076810f2915caf3bc18d5ca0f0a04014cacc5e3346468e6e07c6269b9f76d6b1e51919508f661152fb1e97a2df52a0e1ea45d671c10df5db5ed3c7268318b3f453a9a1e09a9592ed3410334c60d84fa024bed7f919f4eb75e34f09f68162151240c2106cde08e6625be270b82ef67a80a0292543bcd13718e833b9c8aef276fab22dc0d72e2056472836063bef4b60d160a0ca20be621d71ff39e29db7906525e9f728dab0f416dc7f9685bfa7dbd3097ad980',
  '0xf90211a06b94b90f9ccbb94ccfcb4debcb0fd7ea07187b6030934ecb5f70d7aa0e106e74a0f63bfe9cdd898e170d5660389eddb60a03aee987cef69113fb97894e62910b8ba0e15882df275919f3c87acfbd7cfab57349f985940fce2bfaa70924ca43596424a0c4e52bc887032bf7688b573af6a73c8cd5dabd7f9df346cfc78244f6ebf34a54a0bdc85870a91a48224cdee3d5a147992cf8ad21e6c3f46694abc8f2239b6dbf6aa000708254fea667f2c61e2bf20faa8a76183721c79de8565fd2db8a47d72fea34a026dea6a593f6b0e946dc610697ed5fc8c574bb76033a034b6d5d8d90811a76eaa04040526a614d72faa782c8f035e0674fc8ac2da6e71a7799b5b5bbe1cb4defd5a0ec5d34e3e734ec23e3c2642c852fdecda3415b56f18d8632b0252f2c25f76e2ba031b0ee047d08505b388c3228070b58d87fd91e94ac17f69f674497a940f6a33da04b504c0bacc59c8fdb252f4c958b30aa3d67eeb5513a090878221daa1b6edff5a05fbac1d4fb39c755a4c5360468aa4dcb9baa21436972d66ff7cdd0cb7e5fb7a7a0d33521ecef9681513bebb912dd2a6c0142cb6006cee2add7210aa25a89d4de7da05a50d6b22e83755b3cca6e9814551135590db4f7032a875c582e694b996d7148a0317b5ed38c35a1220edb3c0e53f5869bfb561928436a4f48e18c4f1acccb3487a0a35b67a2806b331ca1293777ac2b018a9c663fbd030d75802d103f990873dd9d80',
  '0xf90211a07e997acdc2df4690433c176495beb1dd15388bf2cd03d7d60ff22f074ae31838a049606d1c5ae25a9d15e7e356f4d5956c10733f51e938ac218646a2de3e8db696a0eeac4ba05df2a3084e2ebcc5d2641980da966da0607325dfd0bfd50d867eaf83a0fadfdebbfc25d9a616840515728120ca478f0060b6d458499fe821454dbadb02a06bb6cd55d59a4d2fabe577e127d05f133a7a3cebcc95717a7be8d0045fb38423a08ef9ab0b84518925cd55dd53cb8cdeaf3148c2ac0d814f8e120af4e290186954a068d6ad6ed200216e271a67ee4a983d70be95eff0d27394ddb8b8a7c8f4208858a08c31684c153d6f5faf6389b5cf8da519570d0efaa28ec31964ca49986726963aa091aa2957fb0f2374587926534f6f8ab91ad7289c422d0cf3094c844a9735b8e6a08db4d85babf0f58f899fbd74fe8445adadfc1be0fd4e371d72543c82efc830e6a099eec23e201ab4116ffb6052b4730ef88f9d7fdfdb2e2b8854b663c49dceabfba05a65910e4fe1896e554b717b582a8350a111bfeedeaaa6ba1b1bb07acc979d71a0dc13788ee3fe39fdccf71a5f7aa54850d4d6a1b12b4e63d30167d4a7227d9c72a089638cdeeca0a7533f3c138a2e7e411f629756b4ccc26c77f86ace591921fc60a07f22a083e539dc406e084ad3ca4d1e58f8e1aa15963b047ba6f4c0f852644218a0a89f57b9325b9cf9818e1a7de3b273a431c1537f8eb1b5b09a0ca394fb07e07380',
  '0xf901f1a0a6ae7a2befa5b59f6cbeae4bef152e329b917da7e7e0675fe6b118156daef279a060cd3c9e53a55d82268a28b26d7d0b8fccb825c2a7baaa1faf11243c893ff4d6a05b08c2da49b7c6f3946e41aecb0a1d3a0431454f5bf2d1312c53b63b82b8dc81a089a1af381731c6eaa76240a9a4bc7feeddf941e85d222759ac7298d0c8b65a18a0e41e0da5f7f7c08559fb77b07bdffa9b1abd9335b84c6cd97bf9d409e25a8c6a80a03899500ef6deeb8102205475f3210a7d6048066cbe83f405cadaed11ac61a30ea0b3ad4eaea9c4f1e4b9313bd3a83389a6da27db72d9d160adccc07127a5bc1532a08061e4a9cd39350c385d19642682dce8ccc6aa8e1e46084b2765b454ad331ffaa063786b1ecd85582720146cb8e1f27cb26d7aa18aa4a7a7207015661f6a2e5112a0bd6fea9deee5dbba5010d97b9cb1fabcd1b7b9d0cdb61fdf78313b1b700679a4a0508922c4e6d507ac6235a823e72a313366eb6641f26dc9eaa953da56948ab788a0182578b2722a15c482d4ab55271d6847cea593192c61d7816bdb76c4f77035f0a0b44f3f626d1e3d7d0a59b7cc5974222ffbbdd66572d7143eb905d5de25c4ac9da049bef34e98b8110edb1255d1934f89fde2db046aecf29a8ce99a5861b8098798a0888274847ceb1c28d9225462f03c0fab0d651fd2c984aa0e2a868b419633b64980',
  '0xf8918080a02c5f245298e2b6939e8557db660c27f712b5af8adb09a02e61e8eb04f70af722a0d33d4d08e558c0a822a4fbf5ac27bc6691c523906d3872d87d15b5296fc912508080808080a064f99e2ceb24c035132313d57599abb76f49827f81d4a3af5c6f8190ba9848778080808080a06784b7898c6bffa79848b630021e1861c0c95eb933f868847461206a5b1a3b6980'
]
p6: 0xf8440180a0fc218f68cff9d5a1656b27f23eb4c79244fcd0dbe28afcae1b75819de461cecca0fa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998
p7: [
  '0xf90211a0a71301811d862638d442293bc9b371f3fef61f2df0684eb81764a442c017fb5ea0981441ab22690cde5ae7e744f2ed541b34de356192930b1b365a32b4338eb3dba0d6c934ecc46e5876683103ebcc8857904f64078a6a633378d12c026dcfe6ce87a0a5c17369ea68a9ef1374d2086a717dfdd5a4b20ead99d2c2d34613408288f2bda06012b51e51c352c2ef58ab5a015dc9535584a1649ac3256053e4f9b3f03ba128a063cde000dd7f304ea01d9e0a2bb7db6a4df20637897aa38f98282a11f8c2a137a06a6223bf465fe50e8fd51559124ffb057da6794d230680e19a86dcd9dba82326a0679cbccfae24a301b6d47ab86dad76c8aef17abb5d429c9b299df9e716cd1df8a0cc6546f73d9f5c65242ce77fc26e83a6d29f43e61ae759af6731b72a1d3bca59a0fa51236d3953718a216412ecc513f6ce72fa70c4a49b6b3b166fe113dea18944a0d28cee31de2a04fc78435f891e3cef97dde25cf06f328249db606319c3837b46a05ba5ecda8c81b7643744a22b5e85baec4cda4561eff5dc2778ada4782cc6d4c9a0767f9acd20bcc148b6f01f641034f214940378dde71e7f0d26dca06e0b17cc9ba090a52b9693a98ef81b35eccc85eef5bd2a2e7265153d31e4b96c0490861b6d64a0f700233d843766194c5b1bcd78c30c15b95bb870d36ec200f68f28b89a84d3e3a0e7acee828956254bec7abf641203419040d7ce710dedbb479cfb96d7a268b94e80',
  '0xf90211a029ee5a76a34df30355bf7358378c4fe004c107714d55d91f7ecb8f1547c8a85da0d73729da8290a32c81504ae4abea1e5bd183ff2415418c7275803e5daef76be2a0226bb6b4654ed21975d07ac551c74a97817a4ac7558f543da6f3cfd403309921a0afc55d11848435a0dd8be330f261996b9c30d88119b3dc614055476d765838e9a0ac2d9fffc05e54bfa8effe625f03d33dc421e719859ed8f3e4bcfc6a6073d875a0597bae630a7155f708476ee640acc322fd2d68c202527991633d95c37c4a7b8aa07b11cb0ac9ef9516829e04208d04eab32844c4c0f664a3f0224376d06c062983a0496021bdece925cedcebbfada17ed35526e37eb82205a60b7b8d0d274d127c30a02e8b2c4e016668cfe894fb2726db54d92a94b355088c08ae4ac19322ef9ee1f8a075f693bbf798ef11c986a64f71bfa43050914e15ae6c577da087aeb73a6f3e0da09b0e93832035f44f3bcbd01f591aec5645353f67659e0374b54143e394458f33a06de2265aa899728d81b63b875bd1a6a4d1963f39802f0b79a818864e0456fa55a05124240ae550fa00ed184e08298276bd337361b7d81acf012e40b1633548a4e0a0b6f902da22625694be0ed092f9092418efba07e24a2009167ed2c116bae2d9cca0881bb2e45446b36bbe6058f0479bf0ed9a30cda1ab9f0ceca4e53bbd7819a694a005a174f9c447ccaec1a7cb5a3e61107f0767da9d52cea3b4fa716dbe3d86e9a180',
  '0xf90211a0e08a59d24e01f7de0154432f9de4d81fe29adfacaaabf88a18267d5a21c60559a033aa911f09c7f11063af033a1a7b006007d83d37543fed04da8eb272f80f6661a001638b061d3acd8c98082983fd4499af88ca7ad93de339ae9afe70d85b1b52cfa04aa021a39761b01c40100d32ea5345adb021f5cc398339396dd15564444433c3a0e11d78b2eba5d96d3df7b118203bd86c3b6c361b0f1a0879a2e9223258518a86a06e29a962148c289a2d07c4d427cf277b34eea60a46da4c5b6fda8209d80c7077a083086569f952eed3db219a500ae4228da293b78e56af2896928ea3caf854c497a03b1b79f39fc165465a01a7ee1593287e2de04a0bfaf8df160f2088f03f8b3f1ea07d80474a6afbb32eb791799705010e0bb12e94af67ed5558889f20ca2e9401c2a00ac55987185c222f191a6aa598c92428c9cafacf4b5ffb1016eb471b60782dfda0f35177a11e696722b88cb64c5258d76cc952374c521d39151799c3eb5cf9a9eaa0eed6337cbceb70aa59f9d9d79b0c61065703d2ac82ca549d1569780580b0297fa0bd5443ddd5e5e587ae0ceb25acf4b6c86678b53eb2e83315852e822e9b3e8e0ea0332c4f69662f87290a118d5e376682efb7013b8d140a6b6087db988c3dd25d95a00c1b1d9c9c1e1e70bd36fe0b6e8c579d3968a391d852b9057cd3b5e0db25e429a0382af9d9f86b1fc1951d3e152aa35c3491d201000bc89a514bf9a0e1469c7a1880',
  '0xf90211a0b539a69a392fa4eb9fa788d8b9832299dc5954dedaade75ad73a749173654cc3a0b5730d986588e0d8980cf01c0dadb2ab0cfbba2b403c394ab8db41299c2d62e1a07fd5630fc51801e215b839ef0700f31ff6ecaff2fb80ede124b2782bc94fab0ca09e2c942d01c18eec5851d8d271f868a21ee763658c9494a3b67fff096e5b0222a058d6e77382face21412ad0ee2362d582ce12de1dfabb6b35d63ddf2ab5083845a092709a82ff1bbd310213663f2974af13cccf6920de6b0460c017fd3e295407b7a0d664c8bc628e72d5cb143dc50d1e055d76b8e3abf9d948aa1681f8b1bee8ce29a09eacc08e95da789e164aa1ee09dad3220b01279fa0a6933f9ff67325d98715e6a05b2f87be78d5dc6c35b86c6516a7efee8271336985bce772c212b5944d4a82efa0a2171d361d14e3b5c0c90fc7b142b0e6b3c0ea7be7d08a932d9b40472404faf7a099f104c6f24697bba724a5ae82d7eb7e54a73885eaac69064cab471c0b651abfa0876d324f1262650f99b9c22bf91fa67b32d8eecb1ba9dcf4dbc22d5e9336b82ca0429e3dca4bceaba3af12bb8cbbe0fa55d55d5d47aacd4c3955bc811d84a7d17ca00cec8abd81f195dcdf8024b2c11c4e95c275ab0712d55c538dd56cb5700ced29a0c0f06e7e1c37a64beda59423133bb75350b46051de868789a914fcf351b5edb9a0de991638cad3aebd7130f842459651db080188fa5668e302aa5f42f7d4b697ab80',
  '0xf90211a0f4d1bfed6692a12c812486fe7c7f3e2c49c4a8a6ba4e29f054fda2bfac4692fda0a16e84f57144c3d520318d685583ebc920075be792ab24ac69788f56a0611306a0b7709aaf6621fe95772b3dcfdae5eeabfc71455089e133fd33fd9710c77fe9f2a07665adcde6fc30b17b107041ec18bd24e2b73e8e0eea784abbf27ce89ed0074ca0c4a40f29ed239fb1c6c86e66309abcabf16db5b69cf4591c5d458274762c619ba0d6cd57925af83fc522cf20af75dfcda53d33da1bf9401fd3a5bdff7f7e1fd4c6a07b61270f9770df2380f7c5a2298222b2cb77d512fb15d28d283db9acf99552c5a0701564dc23932b8061a5ceca23ac12d31c04b81485f9f98dbca8642f9aacb6d6a050b50b812b817430c28b8a0d40a34e2f13ed0bae87fe303b3fad733b57842c6da0c30559acd6d1f3ffdd02bc71c5b73eb398360ce5b590792ca0605ee46c1574cda0f3d0ebda7ef8ee3a1902142f6ca236b324961631818747dfe36d35f6d5fe5bb7a0ea0d48c1ac07a4ddff3d187195b806ed119a12f66923d89564669a59bb576781a0f3f5a33d35fbc5bcdd2c92c7cdf0c10a8275d473545e0cdd01ffb06c2cd2eb0fa054cf92af65f10771a6b4f2432d880e11342395f859972552dd70916de9fc31f9a0d59040cdfb8bfea177ee406385d5b0cddfeaeb871d7e368abdbe646a66c65057a077c4449d3215af6f6443b05ae808b05eae5d9b686afc57ad760cc3ac797e84d780',
  '0xf901d1a0cdaac1f24386b8ad05fe9002facc552f1a3fe4e154b6ac598a4fc9ced29cf66fa08cb184202418d04566f5ad0bc650a9d20e51e69b4a30a967e0b92e1f131f585ca0bfe116147405f46bf711e907c0b5e60b0fe49d8a1cd7477424e6bd6f946f04aea0b63965ccf299291026921963fdeb5885e496f2f82992d14ce1b29111b12a5184a076ded8f891b0b8ba180e6c8323b34d8d8cd7a6866cbd8408d0321be5362a63eea0981bef44af9c36d6ef1a1a172e2ae1a171aedbedfa2ce0f433f608f5ffc4f61aa0be4455c572b7911c08e489bdd2cea611cafdc3628c61d719f9752dba4fd707d9a0fbd7e7a1d0bf6253e9f418c6bad89de5bf1053ba086d090f6da2ce077e3ec0d9a054b30b0c32a2357452545b748b451f9a2884cdd31780f03179bce3eefa012c9ea0e5dcc4976a340477579dccce881880685604878cb51f5bcfd3252c31ab1ccff8a0464958fa77f044f300fe9a6440a9a72c68095ce1f8b5126048b1d5c9d6b5814e80a0cf2ceecd1796bae4009504aac67be9e699da06bdb424cd2739e3359e0d0970b6a0596f248603536ec155c870556a729ced3fb2ce42aec1fbd160f63c9d3c8b389280a03b823829ce85929ac319074d5c19a9870f3593e29540a1b1c710564c4c78104080',
  '0xf87180808080a0ada44de5fe93d29db67ffa1abc7848a8f8c742bd7c8471a8ec162c7ab082cbf3a04dc01907d1b0288cfeb0426191feb4396c77b42fb072247de2df2469c3e83b88808080808080808080a08ad8dd6f3ea18e8c98aa9aeaf2d29b3832099685e09bef788529b42b79ead6db80',
  '0xf851808080808080808080a0ce47b9cd492eb7d74e261dbbca7faa1659ebac65078aaf5a508b095e13f6165d8080808080a0ebc73a4539e12c7e5ec6d112a7b794bcc09d084ce738c6ed6eaff234f2f361a480',
  '0xf8669d2025175e22c85b35ea2185b26c96801b0821bf198a3bb114ace81b3d51b846f8440180a0fc218f68cff9d5a1656b27f23eb4c79244fcd0dbe28afcae1b75819de461cecca0fa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998'
]
p8: 0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135
```

  </ol>
</details>
Logic Overview

- Check that the L1 State has been proved
- generate the Output root for L2 using

  ```solidity
   bytes32 outputRoot = generateOutputRoot(
          L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash
      );
  ```

- gets the `outputRootStorageSlot`

  - Input Parameters
    - `L2_OUTPUT_ROOT_VERSION_NUMBER` = 0
    - `l2WorldStateRoot` = the state root of the last block in the batch which contains the block in which the fulfill tx happened
    - `l2MessagePasserStateRoot` = storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
    - `l2LatestBlockHash` = the hash of the last block in the batch

- gets the `outputOracleStateRoot` from the `rlpEncodedOutputOracleData` from `eth_getProof(L2OutputOracle, [], L1_BLOCK_NUMBER)` where the `L1_BLOCK_NUMBER` is greater than the block where the batch was submitted from L2 (original test used 649 greater, submission block 5897036 L1_BLOCK_NUMBER 5903085)

  - `L2OutputOracle` = The L2 Output Oracle from Base deployed on Sepolia at `0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254`
  - `L1_BLOCK_NUMBER` =

- proves the Storage
- proves the Account

l2OutputStorageRoot: 0xb14d9f17dc0617917016f2618c0dfd6eb7b76d7932950a86d23b7d036c6259e7

This proves the state root for an intent which was solved with the following data

Base Sepolia - Destination (L2)

- Solver Transaction: [0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee](https://sepolia.basescan.org/tx/0x60a200bc0d29f1fe6e7c64a51f48d417a1a8d76c5ed7740e03207d46ecf193ee)
- Block: [10660512](https://sepolia.basescan.org/block/10660512)
- L1 State Batch Index: [88837](https://sepolia.basescan.org/statebatch/88837?isbedrock=true&stateBatchId=88838)
- L2 Inbox.sol: [0xa506283526A6948619Ac101f0ee7d21a86FcBEDA](https://sepolia.basescan.org/address/0xa506283526a6948619ac101f0ee7d21a86fcbeda)

Sepolia (L1)

- L2 Batch Transaction: [0x33ad4b997d5568b645e555f1189b7001e5d4c2cde9edfb7cd25b9083f69a342d](https://sepolia.etherscan.io/tx/0x33ad4b997d5568b645e555f1189b7001e5d4c2cde9edfb7cd25b9083f69a342d)
- l2 Batch Transaction Block: [6007763](https://sepolia.etherscan.io/block/6007763)
- L2OutputOracle: [0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254](https://sepolia.etherscan.io/address/0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254#readProxyContract)

## Input Parameters

- `bytes32 l2WorldStateRoot,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `bytes32 l2MessagePasserStateRoot,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `bytes32 l2LatestBlockHash,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `uint256 l2OutputIndex,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `bytes[] calldata l1StorageProof,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `bytes calldata rlpEncodedOutputOracleData,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `bytes[] calldata l1AccountProof,`
  - Description:
  - Retrieval Mechanism
  - Sample Data
- `bytes32 l1WorldStateRoot`
  - Description:
  - Retrieval Mechanism
  - Sample Data

## Additional Proving example with sample data

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
