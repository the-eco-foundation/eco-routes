# Testing Notes

## Master Data

### Sepolia

- Base Dispute Game Factory : 0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1
- Optimism Dispute Game Factory: 0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1

### BaseSepolia

- ECO L2 Output Oracle Address: 0xb3EDAE5AB86f16242018c7cED4fBCabb3c784951

### ECO Testnet

### OptimismSepolia

## ECO Base Initial Tests (Cannon and Self and Bedrock)

ETA Monday 7:00 - 8:00 am

### Base Proving (Intent from Base to ECO)

#### Sepolia (Settlement For Base)

Method: `proveSettlementLayerState`

- Block - 6442168 (or later)

#### BaseSepolia (Settlement for Eco) - Cannon

Method : `proveWorldStateCannon`

- Fault Dispute Game : 0xE6585806C6864D6a3285CC72961eB1Ed7e078E2E
- Fault Dispute Game Transaction : 0x25f0965510cd29f9d7cac6637bc694b71e7da369d7a5b264f4d648d584cc822b
- Fault Dispute Game Transaction Block: 6419979
- Base Batch Block Number: 13398533
- Fault Dispute Game Resolved Transaction: 0xed2920cc5e60aea2aed360cea446ffa2bf07fd79922cec77b6983ff885642a5b
- Fault Dispute Game Resolved Block: 6442168

#### EcoTestnet (Destination chain for Intent)

Method: `proveWorldStateBedrock`

- Base Settlement Block: 13398441
- Base Settlement Transaction: 0x8d477a0358a9820dec6b397c0ecb109610f1251c76894ea94c7de52ddec9aead
- L2 Output Index: 2915
- ECO Testnet Batch End Block: 699840

#### Intents

- Intents
  - Hash: 0x527060a732792b125122358a61ba70055678e24dd2490c85616fa932fa30fc24
  - Creation (Base): 0x08129c47b9be538653c65dfe8c6121cef0f2418547d708ee6e536b42f77c0408
  - Fulfillment (ECO Testnet): 0x8c6988f25cf6105779aab38909094b6c715a5e23ea3638e1ca379fe129a6e6d5
    - Block: 699790

### Proving ECO Testnet (intent sent to Base)

- Intent Hash: 0x9fcc6825d5739ef8c19f9ae1f891dc7e38e8433b9356aa940180a482c83774d0
- Intent Creation: [0x59bcb1186ffbe99bdbd19633e0c8b21ad88a846b3eb42efc746c5cfe4075336f](https://eco-testnet.explorer.caldera.xyz/tx/0x59bcb1186ffbe99bdbd19633e0c8b21ad88a846b3eb42efc746c5cfe4075336f)
- Intent Fulfillment: [0x5e2966449300edbfc9624a299775f5f5b4c9f090302f86f006cdf25541e1c64a](https://sepolia.basescan.org/tx/0x5e2966449300edbfc9624a299775f5f5b4c9f090302f86f006cdf25541e1c64a)
- Prove Settlement: [0xe4da50d298a380d911aed8ded28e242747a73105f52aef7aaae909bbfd814639](https://eco-testnet.explorer.caldera.xyz/tx/0xe4da50d298a380d911aed8ded28e242747a73105f52aef7aaae909bbfd814639)
- Prove Destination: []()
- Prove Intent: []()
- Withdraw: []()

#### Sepolia (Settlement for Base) - Used to prove Base Has been Settled

- Sepolia Block (Used for Proving Base Block Has been settled): 6442269 (0x624d1d)
  had to be 6442168 (or later)

#### Base (Destination from Eco) - Proving of FaultDispute Game to Show Base Block Has Been Settled

Method : `proveWorldStateCannon`

- Fault Dispute Game : 0xE6585806C6864D6a3285CC72961eB1Ed7e078E2E
- Fault Dispute Game Transaction : 0x25f0965510cd29f9d7cac6637bc694b71e7da369d7a5b264f4d648d584cc822b
- Fault Dispute Game Transaction Block: 6419979
- Base End Batch Block Number: 13398533
- Fault Dispute Game Resolved Transaction: 0xed2920cc5e60aea2aed360cea446ffa2bf07fd79922cec77b6983ff885642a5b
- Fault Dispute Game Resolved Block: 6442168

#### Intent Proof

- Intents
  - Hash: 0x9fcc6825d5739ef8c19f9ae1f891dc7e38e8433b9356aa940180a482c83774d0
  - Creation(EcoTestNet): 0x59bcb1186ffbe99bdbd19633e0c8b21ad88a846b3eb42efc746c5cfe4075336f
  - Fulfillment(BaseSepolia): 0x5e2966449300edbfc9624a299775f5f5b4c9f090302f86f006cdf25541e1c64a
    - Block: 13398241

### Standalone State Tests

Sepolia

- Block

BaseSepolia

- Sepolia L1 Block
- Fault Dispute Game : 0xc36c450bc3a00c592b5e6915da18f3458951cad7 (approx 84 hours to settle)
- Block - 13272366
- Intents - None

ECO Testnet

- Batch Index - 1850
- Block - 444240
- Block on Base: 13270761
- Transaction on Base: 0x2fe4d6288468f2e607343165ee2419b48d3220c4e36d86c686777f51fb7401fd
- Intents - None

OptimismSepolia

- Sepolia L1 Block
- Fault Dispute Game : 0xFA0c778b9460D3E76223C52e0887ca12cD143F63 (approx 84 hours to settle)
- Block - 15255829
- Intents - None

OptimismSepolia

- Sepolia L1 Block
- Fault Dispute Game : 0xFA0c778b9460D3E76223C52e0887ca12cD143F63 (approx 84 hours to settle)
- Block - 15255829
- Intents - None

### ECO Base Optimism Tests (Cannon and Bedrock and Self)

## Cannon Base to Optimism

### Sepolia

| Contract           | Address                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| DisputeGameFactory | [0x05f9613adb30026ffd634f38e5c4dfd30a197fa1](https://sepolia.etherscan.io/address/0x05f9613adb30026ffd634f38e5c4dfd30a197fa1) |

#### Original Monday Jul 21st

| Contract                         | Address                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IntentSource                     | [0xD82974FCFEA46C8E1D286B431603FB91268ec5d2](https://sepolia.basescan.org/address/0xD82974FCFEA46C8E1D286B431603FB91268ec5d2)                                            |
| Inbox                            | [0x32388BB27E07db4bdda11Cc1EC919634cc6afF65](https://optimism-sepolia.blockscout.com/address/0x32388BB27E07db4bdda11Cc1EC919634cc6afF65)                                 |
| Prover                           | [0xb96E3188AA8c9638AC72eBd6CDEf1CD953fC115D](https://sepolia.basescan.org/address/0xb96E3188AA8c9638AC72eBd6CDEf1CD953fC115D)                                            |
| Dispute Game Factory Transaction | [0x7cf990707ea8f7ea86e3763ca801b606a191dfcb909fd8a3b752e0cb3edb97cc](https://sepolia.etherscan.io/tx/0x7cf990707ea8f7ea86e3763ca801b606a191dfcb909fd8a3b752e0cb3edb97cc) |
| Fault Dispute Game               | [0x7DAa5306319cb4e209f9d7560B4aaaDE77BA1aC8](https://sepolia.etherscan.io/address/0x7daa5306319cb4e209f9d7560b4aaade77ba1ac8)                                            |

Transactions

| Transaction             | Address                                                                                                                                                                             | Information                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Intent Creation         | [0xcc08cdbee27bb66ddc085f197aa6328718e221c7b21c58fd0d004e9ec2e6c4a9](https://sepolia.basescan.org/tx/0xcc08cdbee27bb66ddc085f197aa6328718e221c7b21c58fd0d004e9ec2e6c4a9)            | Intent Hash : `0x529197ed6c5f98bb6812cecef7847838e945350fc5cdd1cd3442bf0edb37a58d`                                  |
| Intent Fulfillment      | [0xdbd0882a4e7d63bfdc6f73b62627cdaa9eb2567bb01e4c12f83b84db2bb41da8](https://optimism-sepolia.blockscout.com/tx/0xdbd0882a4e7d63bfdc6f73b62627cdaa9eb2567bb01e4c12f83b84db2bb41da8) |                                                                                                                     |
| Settlement Block Proof  | [0x362abc971b0f8ed560be5464ece000e1004ae470adb004814ababcbf9686dab9](https://sepolia.basescan.org/tx/0x362abc971b0f8ed560be5464ece000e1004ae470adb004814ababcbf9686dab9)            | Block: 0x61608e (6381710), layer1WorldStateRoot: 0x03e20642aa0e444a4a8d917944a99700d2a8e57dee59f475a87f68b45513626f |
| Destination Block Proof |                                                                                                                                                                                     |                                                                                                                     |
| Intent Proof            |                                                                                                                                                                                     |
| Withdrawal              |                                                                                                                                                                                     |

#### Current - Transactions created July 25th

| Contract                         | Address                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| IntentSource                     | [0x5bCEb706104192CBDE12FF0dB54B5eD28E10a9f0](https://sepolia.basescan.org/address/0x5bCEb706104192CBDE12FF0dB54B5eD28E10a9f0)            |
| Inbox                            | [0x44B5a2B4083c3EbFc6d1a61C9b5CBf30E73A90C1](https://optimism-sepolia.blockscout.com/address/0x44B5a2B4083c3EbFc6d1a61C9b5CBf30E73A90C1) |
| Prover                           | [0x03Fe851c0fC4Eb335505C105a595FD215B5A6735](https://sepolia.basescan.org/address/0x03Fe851c0fC4Eb335505C105a595FD215B5A6735)            |
| Dispute Game Factory Transaction | [TBD](https://sepolia.etherscan.io/tx/TBD)                                                                                               |
| Fault Dispute Game               | [TBD](https://sepolia.etherscan.io/address/TBD)                                                                                          |

Transactions

| Transaction             | Address                                                                                                                                                                             | Information                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Intent Creation         | [0xa4c2aa341a1f3a0bb8088e2850daa48533bc8b85919a5e3f07a44f0c6666d8af](https://sepolia.basescan.org/tx/0xa4c2aa341a1f3a0bb8088e2850daa48533bc8b85919a5e3f07a44f0c6666d8af)            | Intent Hash : `0x6e19cae3dcc04a2f63f195dbdaf4f28fac2d52b156c620c52687df043a4ca526` |
| Intent Fulfillment      | [0x1f81893d6851ec43222486a93d5e6553f0e2259e720ff16d4b1e71aadc878e24](https://optimism-sepolia.blockscout.com/tx/0x1f81893d6851ec43222486a93d5e6553f0e2259e720ff16d4b1e71aadc878e24) |                                                                                    |
| Settlement Block Proof  |                                                                                                                                                                                     | Block:                                                                             |
| Destination Block Proof |                                                                                                                                                                                     |                                                                                    |
| Intent Proof            |                                                                                                                                                                                     |
| Withdrawal              |                                                                                                                                                                                     |

### Mainnet

| Contract           | Address                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| DisputeGameFactory | [0xe5965Ab5962eDc7477C8520243A95517CD252fA9](https://etherscan.io/address/0xe5965Ab5962eDc7477C8520243A95517CD252fA9) |

#### Current Transaction created July 25th

| Contract                         | Address                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| IntentSource                     | [0x2b16FD1Bd15d1cC73f50B8780cE8D82bcc835f17](https://basescan.org/address/0x2b16FD1Bd15d1cC73f50B8780cE8D82bcc835f17)            |
| Inbox                            | [0x2609cE6d0c4DE600be06b1814Eb4ED6B6bBFd48c](https://optimistic.etherscan.io/address/0x2609cE6d0c4DE600be06b1814Eb4ED6B6bBFd48c) |
| Prover                           | [0x5d0cab22a8E2F01CE4482F2CbFE304627d8F1816](https://basescan.org/address/0x5d0cab22a8E2F01CE4482F2CbFE304627d8F1816)            |
| Dispute Game Factory Transaction | [TBD](https://etherscan.io/tx/TBD)                                                                                               |
| Fault Dispute Game               | [TBD](https://etherscan.io/address/TBD)                                                                                          |

Transactions

| Transaction             | Address                                                                                                                                                                     | Information                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Intent Creation         | [0xc54756d7d9388bcb537dd39315fecba74e13e57899415c1646c67c800dc56d3f](https://basescan.org/tx/0xc54756d7d9388bcb537dd39315fecba74e13e57899415c1646c67c800dc56d3f)            | Intent Hash : `0xf1d6659cafc9850da14f64b129b6ba26528de723ab0af2cbeb2600d2c84a8711` |
| Intent Fulfillment      | [0xadb6d52154591c05e740e0953817d3ebb4c8b43ec019fc768e83c5139c1ec71a](https://optimistic.etherscan.io/tx/0xadb6d52154591c05e740e0953817d3ebb4c8b43ec019fc768e83c5139c1ec71a) |                                                                                    |
| Settlement Block Proof  |                                                                                                                                                                             | Block:                                                                             |
| Destination Block Proof |                                                                                                                                                                             |                                                                                    |
| Intent Proof            |                                                                                                                                                                             |
| Withdrawal              |                                                                                                                                                                             |
