# Optimism Cannon

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

- [Optimism Cannon](#optimism-cannon)
  - [Overview](#overview)
    - [Testnet Sample Data for L2 Proving](#testnet-sample-data-for-l2-proving)
  - [Contracts](#contracts)
  - [Additional Information](#additional-information)
    - [Overview of Changes for Cannon](#overview-of-changes-for-cannon)
    - [Input Parameters for Game Factory](#input-parameters-for-game-factory)
    - [Root Claim notes](#root-claim-notes)
    - [Root Claim Generation Logic](#root-claim-generation-logic)
  - [FaultDispute Game Storage](#faultdispute-game-storage)
  - [Sample Storage Proofs](#sample-storage-proofs)
    - [Fault Dispute Game Factory](#fault-dispute-game-factory)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

To support the Cannon release we are adding a new L2 Proving Module.

This module will Prove L2 World State by

- Create a Storage Proof that the `FaultDisputeGame` has been settled
- Create a Storage Proof that the `FaultDisputeGame` was created by the `DisputeGameFactory`
- Create a Account Proof showing that the state root for the `l2BlockNumber` is for a valid L1 World State

The logic used to generate the inputs is as follows

- Update the latest L1WorldState
  - Query the L1Block contract on the Source Chain
  - Get the block information and rlp Encode it
  - Call `proveSettlementLayerState`
- Update the L2WorldState for the latest solved `FaultDisputeGame`
  - Get the last solved `FaultDisputeGame` by querying the `DisputeGameFactory` and checking it's `status`
  - Get the `l2BlockNumber` using by reading the `FaultDisputeGame`
  - Retrieve the relevant L2BlockState Information
  - Create a Storage Proof that the `FaultDisputeGame` has been settled
  - Create a Storage Proof that the `FaultDisputeGame` was created by the `DisputeGameFactory`
  - Create a Account Proof showing that the state root for the `l2BlockNumber` is for a valid L1 World State

Notes

- _At time of writing Dispute Games are being resolved approximately every 3 days on Mainnet and Testnet_
- _Additional research can be done on the Challenging of [Fault Disputes](https://specs.optimism.io/fault-proof/index.html)_

### Testnet Sample Data for L2 Proving

- [DisputeGameFactory](https://sepolia.etherscan.io/address/0x05f9613adb30026ffd634f38e5c4dfd30a197fa1)
  - [FaultDisputeGame Creation Transaction](https://sepolia.etherscan.io/tx/0x061e4aaf3e0e3418f71434e0e3c3f5c2165d0fc5c804cddc2885ccf9271e37b8)
    - `0 _gameType uint32 0`
    - `1 _rootClaim bytes32 0xe056d712a70ffcd59ed6a9b46613bee28a97068c8d987625fa97a5898b009170`
    - `2 _extraData bytes 0x0000000000000000000000000000000000000000000000000000000000d966dc`
  - [FaultDispute Game Creation Transaction Tenderly](https://dashboard.tenderly.co/tx/sepolia/0x061e4aaf3e0e3418f71434e0e3c3f5c2165d0fc5c804cddc2885ccf9271e37b8)
    - Below is the update to the Storage Slot with the value for the `rootClaim`
    - `FaultDisputeGame[0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1 = 0x0000000000000000000000000000000000000000000000000000000000000000 -> 0xe056d712a70ffcd59ed6a9b46613bee28a97068c8d987625fa97a5898b009170]`
    - Storage Slot: `0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1`
    - Storage Value Before: `0x0000000000000000000000000000000000000000000000000000000000000000`
    - Storage Value: `0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1`
- [FaultDisputeGame](https://sepolia.etherscan.io/address/0x27f77e1f136204d18a100c30f634704067251d09)
  - [Resolution Transaction](https://sepolia.etherscan.io/tx/0xf5192a987d2594399d2c56e4c1418c67d09eba73725f48c1d7117eb33080778f)
    - `Function: resolve() *** MethodID: 0x2810e1d6`
    - [Resoultion Transaction Tenderly](https://dashboard.tenderly.co/tx/sepolia/0xf5192a987d2594399d2c56e4c1418c67d09eba73725f48c1d7117eb33080778f?trace=0.0.6)
      - below is the update to the storage slot including setting the `status` to `DEFENDER_WINS`
        - `FaultDisputeGame[0x0000000000000000000000000000000000000000000000000000000000000000 = 0x0000000000000000000000000000010000000000668e4784000000006689aa08 -> 0x0000000000000000000000000000010200000000668e4784000000006689aa08]`
        - Storage Slot: `0x0000000000000000000000000000000000000000000000000000000000000000`
        - Storage Value Before: `0x0000000000000000000000000000010000000000668e4784000000006689aa08`
        - Storage Value : `0x0000000000000000000000000000010200000000668e4784000000006689aa08`
      - need also to check storage slot for `gameCreator`
        - Storage Slot: N/A is the Proposer address which called the `DisputeGameFactory` see [here](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/FaultDisputeGame.sol#L666)
        - Storage Value: `0x49277EE36A024120Ee218127354c4a3591dc90A9`
      - need also to check storage slot for `claimData[0]`
        - `claimant` is the Proposer address which called the `DisputeGameFactory`
          - Storage Slot: TBD
          - Storage Value: `0x49277EE36A024120Ee218127354c4a3591dc90A9`
        - need also to check storage slot for `rootClaim`
          - Storage Slote: TBD
          - Storage Value: '0xe056d712a70ffcd59ed6a9b46613bee28a97068c8d987625fa97a5898b009170`

## Contracts

Following is an overview of relevant contracts addresses are for mainnet(5).

| Contract            | Address                                                                                                               | Code                                                                                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OptimismPortalProxy | [0xbEb5Fc579115071764c7423A4f12eDde41f106Ed](https://etherscan.io/address/0xbEb5Fc579115071764c7423A4f12eDde41f106Ed) | [OptimismPortal2.sol](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/L1/OptimismPortal2.sol)            | Developers must look at the OptimismPortal contract to determine the respectedGameType and then use this information to query the DisputeGameFactory for a list of recent DisputeGame contracts with the correct game type.                                                                                                                               |
| DisputeGameFactory  | [0xe5965Ab5962eDc7477C8520243A95517CD252fA9](https://etherscan.io/address/0xe5965Ab5962eDc7477C8520243A95517CD252fA9) | [DisputeGameFactory.sol](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/DisputeGameFactory.sol) | It is recommended that developers search for a reasonable number of recent games, say 100 games, and pick the first proposal with a sufficient block number. Developers should then verify this proposal locally as the default game type will allow for permissionless proposals and there is no longer a strong guarantee that proposals will be valid. |
| FaultDisputeGame    | [0xFA069a2bBfce19Adc9AbD50080fBe19764503039](https://etherscan.io/address/0xFA069a2bBfce19Adc9AbD50080fBe19764503039) |

## Additional Information

### Overview of Changes for Cannon

Below are changes highlighted in [Preparing for Fault Proofs Breaking Changes](https://docs.optimism.io/builders/notices/fp-changes)

- L2OutputOracle: Withdrawals will have to be proven against the rootClaim of some dispute game rather than referencing an output in the L2OutputOracle contract.
- OptimismPortal: Developers must look at the OptimismPortal contract to determine the respectedGameType and then use this information to query the DisputeGameFactory for a list of recent DisputeGame contracts with the correct game type.
- DisputeGameFactory: It is recommended that developers search for a reasonable number of recent games, say 100 games, and pick the first proposal with a sufficient block number. Developers should then verify this proposal locally as the default game type will allow for permissionless proposals and there is no longer a strong guarantee that proposals will be valid.

Below is a diagram of the Fault Proof Process flow from [Optimisms Fault Proof Specification](https://specs.optimism.io/fault-proof/index.html).

### Input Parameters for Game Factory

Input Parametrs for Dispute game factory (0xaa0b247c978f411fd740fd688dc71e6add80417079355604c29c04f9b8b4d459)

| #   | Name        | Type    | Data                                                               |
| --- | ----------- | ------- | ------------------------------------------------------------------ |
| 0   | \_gameType  | uint32  | 0                                                                  |
| 1   | \_rootClaim | bytes32 | 0xdfbb2397989b1349e68e09dbb1cbc910e96151da88061b7fef9887e4f843c82c |
| 2   | \_extraData | bytes   | 0x0000000000000000000000000000000000000000000000000000000007441de4 |

### Root Claim notes

From [l2_proposer_test.go](https://github.com/ethereum-optimism/optimism/blob/develop/op-e2e/actions/l2_proposer_test.go#L136)

```golang
  outputComputed, err := sequencer.RollupClient().OutputAtBlock(t.Ctx(), gameBlockNumber.Uint64())
  require.NoError(t, err)
  require.Equal(t, eth.Bytes32(latestGame.RootClaim), outputComputed.OutputRoot, "output roots must match")
```

### Root Claim Generation Logic

- [Optimism Cannon Root Claim Implementation](https://specs.optimism.io/fault-proof/index.html)
- [Relevant Contract Addresses](https://docs.optimism.io/chain/addresses)
  - Ethereum
    - Proposer: [0x473300df21D047806A082244b417f96b32f13A33](https://etherscan.io/address/0x473300df21D047806A082244b417f96b32f13A33)
    - DisputeGameFactory: [0xe5965Ab5962eDc7477C8520243A95517CD252fA9](https://etherscan.io/address/0xe5965Ab5962eDc7477C8520243A95517CD252fA9)
    - FaultDisputeGame Instance : [0xc65c6e71c5639d989c79497dc1dbfb05745bbef9](https://etherscan.io/address/0xc65c6e71c5639d989c79497dc1dbfb05745bbef9)
  - Optimism
  - L2ToL1MessagePasser: [0x4200000000000000000000000000000000000016](https://optimistic.etherscan.io/address/0x4200000000000000000000000000000000000016)
- Relevant Transactions
  - Proposer: [0x001378a0993047a732b6c56aabab97cfc7a8b5934b70ba5d58aa7169de0fb419](https://etherscan.io/tx/0x001378a0993047a732b6c56aabab97cfc7a8b5934b70ba5d58aa7169de0fb419)
    - Proposer RootClaim: `0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1`
  - Dispute Game Factory: [0x001378a0993047a732b6c56aabab97cfc7a8b5934b70ba5d58aa7169de0fb419](https://etherscan.io/tx/0x001378a0993047a732b6c56aabab97cfc7a8b5934b70ba5d58aa7169de0fb419)
    - Dispute Game Factory \_gameType: `0`
    - Dispute Game Factory \_rootClaim: `0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1`
    - Dispute Game Factory \_extraData: `0x00000000000000000000000000000000000000000000000000000000074b8fba`
  - Fault Dispute Game Instance:
    - Fault Dispute Game Creation Transaction: [0x001378a0993047a732b6c56aabab97cfc7a8b5934b70ba5d58aa7169de0fb419](https://etherscan.io/tx/0x001378a0993047a732b6c56aabab97cfc7a8b5934b70ba5d58aa7169de0fb419)
    - Fault Dispute Game ContractAddress: [0xc65c6e71c5639d989c79497dc1dbfb05745bbef9](https://etherscan.io/address/0xc65c6e71c5639d989c79497dc1dbfb05745bbef9)
    - Fault Dispute Game Root Claim: `0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1`
    - Fault Dispute Game l2BlockNumber: `122392506` (`0x74b8fba`)
- Data to Test
  - root_claim 0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1
  - l2BlockNumber: `122392506` (`0x74b8fba`)
  - intentHash: `tbd`
  - Fulfillment tx: `tbd`
  - Expected Root Claim: `0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1`
  - l2WorldStateRoot = l2EndBatchBlockData.stateRoot: `0x0df68f220b56ca051718e18e243769fae3296859243b8cf391b9198314f7eef8`
  - l2MessagePasserStateRoot = l2MesagePasserProof.storageHash: `0x0dad8f82574fb890e31def513e65431fae8b7d253769c7b8a8f89d6f2a06e79c`
  - l2LatestBlockHash = l2EndBatchBlockData.hash: `0x6e423d26e1beba75c5d8d0f02ad9c8ae7e7085f16419b6fa4a3b9d726e1fe1bc`

```typescript
console.log("Testing original generateOutputRoot")
const mainnetOutputRootOptimism = solidityPackedKeccak256(
  ["uint256", "bytes32", "bytes32", "bytes32"],
  [
    0,
    // mainnetL2_WORLD_STATE_ROOT_ORIGINAL,
    // mainnetL2_MESSAGE_PASSER_STORAGE_ROOT_ORIGINAL,
    // mainnetL2_BATCH_LATEST_BLOCK_HASH_ORIGINAL,
    "0x0df68f220b56ca051718e18e243769fae3296859243b8cf391b9198314f7eef8",
    "0x0dad8f82574fb890e31def513e65431fae8b7d253769c7b8a8f89d6f2a06e79c",
    "0x6e423d26e1beba75c5d8d0f02ad9c8ae7e7085f16419b6fa4a3b9d726e1fe1bc",
  ],
)
expect(mainnetOutputRootOptimism).to.equal(
  "0xbb7d60e03580594837f907cc093413c79d57f438165c23e810740aac361ddfa1",
)
```

## FaultDispute Game Storage

Retrieved using

```
cast storage 0xd5bc8c45692aada756f2d68f0a2002d6bf130c42 --rpc-url https://eth-sepolia.g.alchemy.com/v2/<alchemy key> -e <etherscan key>
```

| Name                    | Type                                                              | Slot | Offset | Bytes | Value | Hex Value                                                          | Contract                                          |
| ----------------------- | ----------------------------------------------------------------- | ---- | ------ | ----- | ----- | ------------------------------------------------------------------ | ------------------------------------------------- |
| createdAt               | Timestamp                                                         | 0    | 0      | 8     | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| resolvedAt              | Timestamp                                                         | 0    | 8      | 8     | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| status                  | enum GameStatus                                                   | 0    | 16     | 1     | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| initialized             | bool                                                              | 0    | 17     | 1     | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| l2BlockNumberChallenged | bool                                                              | 0    | 18     | 1     | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| l2BlockNumberChallenger | address                                                           | 1    | 0      | 20    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| claimData               | struct IFaultDisputeGame.ClaimData[]                              | 2    | 0      | 32    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| credit                  | mapping(address => uint256)                                       | 3    | 0      | 32    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| claims                  | mapping(Hash => bool)                                             | 4    | 0      | 32    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| subgames                | mapping(uint256 => uint256[])                                     | 5    | 0      | 32    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| resolvedSubgames        | mapping(uint256 => bool)                                          | 6    | 0      | 32    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| resolutionCheckpoints   | mapping(uint256 => struct IFaultDisputeGame.ResolutionCheckpoint) | 7    | 0      | 32    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |
| startingOutputRoot      | struct OutputRoot                                                 | 8    | 0      | 64    | 0     | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/dispute/FaultDisputeGame.sol:FaultDisputeGame |

## Sample Storage Proofs

### Fault Dispute Game Factory

## References

- [[1]Fault Proof Specification](https://specs.optimism.io/fault-proof/index.html): Optimism Fault Proof Specification
- [[2]Fault Proofs Explainer](https://docs.optimism.io/stack/protocol/fault-proofs/explainer): Optimism Fault Proof Explainer
- [[3]Preparing for Fault Proofs Breaking Changes](https://docs.optimism.io/builders/notices/fp-changes): Changes for Fault Proofs
- [[4]Optimism Smart Contract Overview](https://docs.optimism.io/stack/protocol/rollup/smart-contracts): Overview of Optimism Smart Contracts
- [[5]Optimism Contract Addresses](https://docs.optimism.io/chain/addresses): Optimism Smart Contract Addresses
- [[6]Viem](https://viem.sh/op-stack): Viem provides first-class support for chains implemented on the OP Stack. Source code is [here](https://github.com/wevm/viem)
- [[7]Using the Optimism SDK](https://docs.optimism.io/builders/chain-operators/tutorials/sdk): Source code is [here](https://github.com/ethereum-optimism/ecosystem/tree/main/packages/sdk) and it has the following warning. _@eth-optimism/sdk has been superseded by op-viem. For most developers we suggest you migrate to viem which has native built in op-stack support built in. It also has additional benefits._
- [[8] How to use Ethereum Proofs](https://www.infura.io/blog/post/how-to-use-ethereum-proofs-2): Deep dive on storage proofs using `cast` and `@ethereumjs/trie`
- [[9]Cast commands](https://book.getfoundry.sh/reference/cast/cast): Overview of commands for interacting with ethreum including generating proofs.
- [[10]@ethereumjs/trie](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/trie): Implements modified Merkle Patricia Trie.
- [[11]Merkle Patricia Trie](https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/): explainer on Ethereum's 'modified Merkle-Patricia Trie',and how the state of Ethereum (all accounts, balances and smart contracts) are stored.
