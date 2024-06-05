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

### Existing Contracts

The following existing contracts should be identified

- USDC on both Optimism and Base Sepolia

  - Optimism Sepolia - [0x5fd84259d66Cd46123540766Be93DFE6D43130D7](https://sepolia-optimism.etherscan.io/address/0x5fd84259d66Cd46123540766Be93DFE6D43130D7)
  - Base Sepolia - [0x036CbD53842c5426634e7929541eC2318f3dCF7e](https://base-sepolia.blockscout.com/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e)

- [Optimsim System Contracts](https://docs.optimism.io/chain/addresses)

  - L2OutputOracle on Sepolia
    - [0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254](https://sepolia.etherscan.io/address/0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254#readProxyContract)

- [Base System Contracts](https://docs.base.org/docs/base-contracts)

## Deployment

The following scripts are setup for Deployment

Source Chain (Optimism Sepolia)

- [deploySourceAndProver.ts](https://github.com/eco/ecoism/blob/main/scripts/deploySourceAndProver.ts): Deploys [Prover.sol](https://github.com/eco/ecoism/blob/main/contracts/Prover.sol) and [IntentSource.sol](https://github.com/eco/ecoism/blob/main/contracts/IntentSource.sol)

```bash
ecoism (ECO-1885-JW-TEST)$ yarn deploySourceAndProver
yarn run v1.22.22
$ hardhat run --network sepoliaOptimismBlockscout scripts/deploySourceAndProver.ts
Deploying contracts with the account: 0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4
prover deployed to: 0xf820639A8508cbA7E9F2C26FC43e61b2342A25B3
Successfully submitted source code for contract
contracts/Prover.sol:Prover at 0xf820639A8508cbA7E9F2C26FC43e61b2342A25B3
for verification on the block explorer. Waiting for verification result...

Successfully verified contract Prover on the block explorer.
https://optimism-sepolia.blockscout.com/address/0xf820639A8508cbA7E9F2C26FC43e61b2342A25B3#code

intentSource deployed to: 0xdcF77d6a12Dfc717D43c941F9026105E7092e534
Successfully submitted source code for contract
contracts/IntentSource.sol:IntentSource at 0xdcF77d6a12Dfc717D43c941F9026105E7092e534
for verification on the block explorer. Waiting for verification result...

Successfully verified contract IntentSource on the block explorer.
https://optimism-sepolia.blockscout.com/address/0xdcF77d6a12Dfc717D43c941F9026105E7092e534#code
```

Destination Chain (Base Sepolia)

- [deploy-inbox.ts](https://github.com/eco/ecoism/blob/main/scripts/deploy-inbox.ts): Deploys [Inbox.sol](https://github.com/eco/ecoism/blob/main/contracts/Inbox.sol)

```bash
ecoism (ECO-1885-JW-TEST)$ yarn deployInbox
yarn run v1.22.22
$ hardhat run --network baseSepolia scripts/deployInbox.ts
Deploying contracts with the account: 0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4
Inbox deployed to: 0x4520be39A6E407B0313042Efb05323efB76B506a
The contract 0x4520be39A6E407B0313042Efb05323efB76B506a has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.basescan.org/address/0x4520be39A6E407B0313042Efb05323efB76B506a#code
```

### Verification

The following commands will verify the contracts

```bash
# verify Optimism Sepolia Intent Source
npx hardhat verify --network sepoliaOptimismBlockscout "0xAca455CCfbE4F02b2091413ECe0EF2424eb8D6fb"
# verify Optimsim Sepolia Prover
npx hardhat verify --network sepoliaOptimismBlockscout 0x84b9b3521b20E4dCF10e743548362df09840D202 "
```

## End to End Testing

### Positive Walkthrough - Claimant

1. Intent Creation - createIntent.ts
2. Intent Solving - fulfill-intent.ts
3. Proof Generation - proof-generation.ts
4. Prove L1 WorldState - proveL1WorldState.ts (this block is in this batch which has been settled to L1)
5. Prove OutputRoot.ts - (proveOutput Root)
6. Prover Update - proveIntent.ts + proof-generation.ts
7. Claim Rewards - withdrawReward.ts

```bash
# Intent creation
yarn createIntent

```

### Positive Walkthrough Clawback

1. Intent Creation
2. Claw Back Funds

## Appendix A - L2StateProof

The following gives a walkthrough of proving an L2 State Root from Base Sepolia using
the function `proveOutputRoot` on `Prover.sol`

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

```solidity
contract mock4788 {
    // L2 inbox: 0xCfC89c06B5499ee50dfAf451078D85Ad71D76079
    // L2 tx: 0x423566ff4d43c56c60c5aa8051044632fa7d5e2b59cd1a55835c01fa9af07d05
    // L2 batch: 82785 (double this in hex: 286C2)
    // L2OutputOracle address: 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254
    // L2OutputOracle mapping start storage slot: 0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71F85B
    // L2OutputOracle relevant storage slot: 0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D
    // L2 Output being proven: 0x82af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d
    // L1 block to prove: 5903085
    // L1 block hash (block I grabbed the proof from): 0xddbab69aac369068d1591a69ce60fffee3a9c5049e44ff7e5099d462cabffd4f
    // L1 state root (of above): 0x80be241290d08c1e19fd83e4afd9a68e6594afc91d3af207b60f01ffd5434c79
    /* L1 storage proof of L2 output:
   {"address":"0x84457ca9d0163fbc4bbfe4dfbb20ba46e48df254","balance":"0x0","codeHash":"0xfa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998","nonce":"0x1","storageHash":"0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4","accountProof":["0xf90211a0bfb9919b56cbfb2a9f7b8ebaf7b121385267a695526e7b818d350bda8a35779aa0c3e83efb439189085ef6dc49ac88ec5b7bf8d50550d9275ab0f625654aba2567a0fdc3a1e7f481199e827e71d18802fb87402cb60782f6edd441b337f72629b46aa0f6caab76d5495f6055c1a300755105c11b1977b2f4dc8bf6da73ebd7389f9633a0ea7a31d6ff8ac41e8f8001cc30ca5225ffb6e7ef3c4e976154f28d239fd301ada0a121fad21a3013c7f3beca644b941ce0c67f2bd5fa467fd0cf06275c1fdae491a05ac0cbbb029266068035ded9bc5d1f3c4deb34c9b42f2a130935aa00ee5fc835a0d1afd8cf6f1a2ee905fdec230b3125b2bca442887255be11faf030cf8394d1daa01796eb6a8ef2aa35005f3d8f29eb67ce9fcb9bd74580b441d6b3a47345387c02a0cbdab1effc199b9a73c4981ad891f2083af9ba2e0119da360e6ab1da63b1c808a072e66cbac9075774bb5169c51c116be00959ebd039ccb9b7e342740a1f728b09a0015587187596d08e872e69b0e3e4d2b801e18c58df32b28d561b3b9c3ab6466fa0ba7d8544f787f088d1fce0302d5b7ba5884a3cb1b5ce1eab75eba8f3698001f5a066b19005e26d3044cc5e3d24db3e4ea1a4aaa33f187e72b6d70b5b71b4a4aa36a0caad9b79328ebf61a28e9b138c0c554fd7abbdc4f0dc95b4ddb03188c0aec000a0087cdd2e809697d89c3cc97bd2c46f3e5d664983504141c0ece3adcef1576aa780","0xf90211a0abee5fcc87a024726d389acc396664e3c6111179fc2086a0f97e7ea7118c3caba042a2b06fdfecd9a8e64fdb010c070a9d4af827f54b19367ecbff1e146546eca3a08c6b298b1f95e287e82abfe33feb781adf90ad5e5f45ed698b3f6f96fc5b1125a07b3eae5d91d1596f33b1a6e36f38536e35236a7880fa456a11cb118742e50d7ea0c72324f4561763ae52e1c9e81936ba15570aabdba6f2bc54afd20a311e66d59ca0aae4698d708af1ba2b8d17fe64d0dba413c09caaa9bab6821200f4b58cd49ffaa046d88f0fca182b2e74e1d055521cd8946f803ceb800a040c701c3ffdc37a989ca01e75b5ef645a675957e7b2c58609c93403f63360d8ffa57721fb39a811b3e9bfa0f017b71c04a00865ca71502600cabafba920d0134f4b6611814f05349dea129aa060be26832ac2e7904e0d3e0c8777e1c1dab9473db5e472b28631c3504ccf1981a0051f9eeefb01737e40f6939d7140b38e2fd17d853e4af00664d66824255fe265a05dbb7bae84978c647d1fd2223c408f25b1253b1e964901d154d269e2ebe4249ca0d18b15ec25551b264457f076bcd7452d10be8529b6953769249885cf6fad13bba0ae8e1ae1f5a2c3b2395c61227da1424f69d59725639c9f0c69d888f76fecea2ea0b0694672f218e3acd40bff738089abc7590a397898f283c66c20e258beec905ca080e30336c15ebb0a74a406c21ce289c673c42dddecbdee98ff5d4fbf42b205d380","0xf90211a0031c8665af86336b044ec4d33e53199998f5169da40f85745f571a7945ea1c70a0ad111faae57c47d184e8f48bb804a0f7811b37cd78bbdd425dbea63fa34fb69da05cd5a3d0f0a902d557073d0e67169ed3664e0478448fa6e23002452d324467a3a0df1bbb117ce6b01a957b486b00e6641c887eba2eed5dcf1afbaa0554971cffa3a06de4ab62fb12660654edbe96cc80a82875485b902d365f6efcae7ccfd49fad9ea0e5b5026772f481a11690034eb3af808efa7cf3d1b886d584910f53a53dfd799ca0151af60bd1f2c5ad5547dcb8e045aac641ce83046481a40bf128dc6ee561793fa0ee0924bfc2ab4f2742ac5a0c75e7ee86eb7db5d643c05aebd0056ad889d07eb7a0ab774ff7894cd332e105ec7aa5c74ad028cbda2754b299b71ac785872fd6dd79a065d5a8648764fef72987e4f98fc0d21d81fca462fca2820ab7af03c861617578a04d961f5216642a0de17a8c32de6136a09ff2f7754a73da86660396e27ca68cb9a034240b77d48c0abfa3a73a1c693c63f76e687cedc891cf45331cb902f3d4aeafa0985cea242344d8ff9bd15d69b196041e924857043160203ba6f23ac9ab5f3470a0fb4c53ed1b723107b5a8d98b697baa9b2850b61aceaca1810e1b3de772db27b4a0a0d04b9a251230b2ae0d4876835247ec8fbcd640d169e1f91d0562507c0546d7a0911e825acca86392e61c55c3f8a47f904f09ac820ead1229140911f99b993f0780","0xf90211a08513cba61790fe62562a2f25698426ca6e4231329627931f3e70a894cff61da2a0fb3b95bdaa6f094cc9e59dc520ec28381547993e80a8e62a1631e1fb9c76df8da01fa11c41869c9a54690911972027704de583ce90899f7e96ab86b35adeb73333a0cbefaff58d2a2e82bd8b5a0afbf2a41ab483ca68105eca20e42e327df9d8ca09a0dbff708ad753c11e82b40839011d5798e652f52915125e57715d100e8df2806aa04b0da01af035d3fcf452d6bc5b5ffedebe9ef264c99418c56725b8f0f0be9c62a075b60973136f96a316d5454c06f5474fc0df62b9494dbb52c2e96d7d7c5c55ffa049b0c9d4178e4a1dc01006c6a6e7c8242cf8425926b96d4898ec1b707e13310fa017205bbe85c573d18d1f93b24bf3045d8a650564dfdcd5d9b510163cf9bf05ada057e26b7f05153b8f3c818a2e37a1e9e5c35fe2c389c394349b4be978e4716078a0568800a9526c529b5394c68bb1d0dfe68777700322e7813cd02ec352bc4aecf0a018f2e80cff368c0862a4755728bc2f4c6a8e48baebdea0c8f7b526a6922dc38fa06837c44ae10f101305f0fbaef56a6ff00db12d2a35e1ee6b7e6364de97598416a06496573ce7c1c9cef7f8e0bcac464a67e7d1137531ca6dcab21c31b6df5ac7cea0b2ce325087c0cf4f4dc16a6694a945ade015a64b2fdabc3259849194fd04e67da0453031b5bbb2f300844841e2044ca6d24da7ee377490c9c61ce81f5367eb951780","0xf90211a03a7f71ddaca4aab7806ce167410c20a9fae109ef2dbecc6679c1bdc0e7b1084aa00475e672c31f2c5fe5ebaf02aa20d90f5d1f92c07c84f25362666a462a9c5dcfa04767339c7d946c96e2f2abddc052756f8cb4bdb480e1c1109670b2259796def9a08a802e07f817b8a8b7d2d26c7055098ef96e6e72d260b94398d0f59fc8faab53a08d2523366776ef47c229ca0d416830b3afe091fb5372514b59ca6abaf42a315aa06816909e4ff22e9a80e72f319e904d9e64c89607960f7e0cc22a7f1fa0e77e25a096b9ba5e2d96703ada62dbe8351fb530003e46ec75135bb8ae4dca32f01ca368a025f02c06d1b2d596cde5537c5075eed9c2747ae8e8e49e94f61663fe0cd8986fa06bde6e78916fc703131c7235927355b393d4c9ddcb0b663ec029c3142113526aa0c30559acd6d1f3ffdd02bc71c5b73eb398360ce5b590792ca0605ee46c1574cda0d2fca3f723c74ee427754cad1baf3f1766ae6ec96497a4ee650b691a4e9c7b0fa053c0274016972816d268b2f5817d1aef088c14e3ef7c874ecc83ac67dab6b89ba0c87e7ec771291d91bae19da42cf88eee7cd1ef3551599eb0b274494aeb3a3a72a0668062d9a3a38595ba497095feb9345409d0d3bf55d17371c117f050af6c0f3ea0d59040cdfb8bfea177ee406385d5b0cddfeaeb871d7e368abdbe646a66c65057a032833fae7f7241aec33a76b0fae012975bdef725b406919750b51191d024047780","0xf901d1a0cdaac1f24386b8ad05fe9002facc552f1a3fe4e154b6ac598a4fc9ced29cf66fa08cb184202418d04566f5ad0bc650a9d20e51e69b4a30a967e0b92e1f131f585ca0bfe116147405f46bf711e907c0b5e60b0fe49d8a1cd7477424e6bd6f946f04aea0b63965ccf299291026921963fdeb5885e496f2f82992d14ce1b29111b12a5184a076ded8f891b0b8ba180e6c8323b34d8d8cd7a6866cbd8408d0321be5362a63eea0981bef44af9c36d6ef1a1a172e2ae1a171aedbedfa2ce0f433f608f5ffc4f61aa0be4455c572b7911c08e489bdd2cea611cafdc3628c61d719f9752dba4fd707d9a08140f493327b97838a91ae3651b8fdde51b4fe83089a48528c8caf44b24af6f9a054b30b0c32a2357452545b748b451f9a2884cdd31780f03179bce3eefa012c9ea0e5dcc4976a340477579dccce881880685604878cb51f5bcfd3252c31ab1ccff8a0464958fa77f044f300fe9a6440a9a72c68095ce1f8b5126048b1d5c9d6b5814e80a0df7b1ab0755a7ed4b405909318ee544299f8db7f4e18c62f3cad5a420e57d0f0a0596f248603536ec155c870556a729ced3fb2ce42aec1fbd160f63c9d3c8b389280a052d3e659c1dc4ffba6876ebfd1e5b94486f25ab030e9529589a5f9a2cf98090480","0xf87180808080a0216d61bc7d3db7ee9dad81cbae50413a5b561c550e768925f32638b033241ecfa04dc01907d1b0288cfeb0426191feb4396c77b42fb072247de2df2469c3e83b88808080808080808080a08ad8dd6f3ea18e8c98aa9aeaf2d29b3832099685e09bef788529b42b79ead6db80","0xf851808080808080808080a0f80468e0c756b46a2b79aed2f700d292732b326ba913ca5c13f2db70175f4aa38080808080a0ebc73a4539e12c7e5ec6d112a7b794bcc09d084ce738c6ed6eaff234f2f361a480","0xf8669d2025175e22c85b35ea2185b26c96801b0821bf198a3bb114ace81b3d51b846f8440180a04d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4a0fa8c9db6c6cab7108dea276f4cd09d575674eb0852c0fa3187e59e98ef977998"],"storageProof":[{"key":"0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747f1d","proof":["0xf90211a0bfd212994604c585735e74f4354be526d18748ad2666e78b65fb49c2e6bbbee9a01c08b76bd207991906711c3cc0b5a6118ab0de3a065d55d14d7015f84d1abc6da088209ce0684c1bdd8c5fd2c2116b48de8abf35e02d96d82b75df7a076e50a254a093a19d41813e8d3464b8291985feb9cdb253f0b20fa6cbd7f1725de2f3c7beada0ea0dc43529bfdcb5d1cb2250b31274cb9de1be1bed9ea497a0e045d310090867a0c76487e313d16116880c195538047de70cca922a4f9eef2cde1a71817fabf607a02d13c2a187bb92d32bc4ceb30abcb5ec4ab37bfdb0cffeb982a248bc6c553b0ea073b674e9c1ae861e94e0a85de933ffc242773f6bc94a039098368363ca407170a0aeb641e53ad9a1b68ae6d2584206c920b5bc9e7c332e7ce5ebc3c02b33fe2499a0026293f79be5701d143d718bb7a3a99d4468eadadb3e0eb9699bde0b9447846aa0c2b3982d16087d116b4c39a979a3ecc3f9636e63d79e824ef21d7efa2bea3776a07acdc461058751de6c9f00b3b7eb0e91746d49ac1e86099b5ac0952cef265da3a0b897cebb783cc6495ab3d600c4779bf61f429496bcfc79aa753e4f79dd70c39ba05177078e3f0591c3bafbfd8231202cb11ad7a5258d9cbe5b4cee2a05cd65fbdba05e9b6fc4323888e58ca307a0efadbff10c09173a8e0b0d783de49933305780eea090569fe014fd575fbae898f89ed8cd4ac59c97e6624864c7e17f4b7b8b9f098f80","0xf90211a05837330dd58f5eb559d4c4e1216a71bb6d7692586a1007cc102e591888b11ff7a0d8cba08d50cc77911ced3f3c627d2083b6061f17b60a703b31f4d5d27cc04a27a0b2941698bde97b39503eb80e893ecc63bf318ab87cfdea133068fe072f3b794da0532d608892ddab1ceac4220816b35717b2f4684d9d03acb4f2f767b0e4056429a017dea5b10f1ec88082ab63fdf0757af11cc4ef7d91aeb3294c5ffc0220d53380a03b2cf450cc3b31e78e2dc15cdfbdf1bcab62f1b1bb242806ca9b261fb5c798b2a0b5e32d66562733e185adc1e588f9fff4884f9a7d0b6207918e6200dfbebf9adfa0893ae5aa4fec9c55e5f48affb5abece1295afba1e34f0deb3efe9f9c8f06ab07a02713bad64d67c69ea2fedf769f8b31272bdc057c38b981ec94448733ec895671a0fc0957f42b8a777134cca63c14fdd5881aeacef46a4128614f10b4247b16acafa07c137333dcd50a3f2cb7498bc70333a01c9b9fb932b3a86e75a3155cfceccb4ca0019a712031e6e1eab128fd5ed8a78456209bf007fd8cb826ae6f98826ba6929ca0bc68e2297de745edddb8bdd63b733cd8d87097727ffe6f1e4357d7be582d8214a05f2b91af78e7f6124766aad44b543ae0da304c69748e803fcb69ae95884c4918a03491f0d634e1fccf3a77b31f77bffb48c477263b6ee83e0c53a5c0f45c938481a05825128641a0d4bdf591f268681d0b1c9ba7aa9b066092b71e3e5ce3768258c780","0xf90211a00a89099fd3ad43d4275f2c013cd9ab57d7e5f5634086afd3a60b641e383ff5afa0df31d5297aef7c76f60fcabcdd1b358e84b014c5913808902438479d1c03ab12a07dcf113cbadd33996a97e1ba78c354f29347e1c88128338b978d38c43de75e28a0ec1c4150d23390483c88c9cdbf3602a833d448d8c2d500cb6fca80f4a8ff93cea0892022ccf0b4ad7a245833c84c3c92475ac1deddd237e6021e28b72a2e212ff5a0b01963ea6b49045636d21b996f40331cd6c1543ecad87e3bc8713a4e890f88eea0c7fc34f928c297015bf0309e61053a6968d2a8d1e63a20038c5dce4730049353a08fc523a2a4e5e2bd1738f8261c5c782c92509d50956860fcc60645096409cd0ba05bde7269f2563aeeb427d5005bd3038fa07fd04ca200a3595aad3e19de2cd926a03e7b56c26ae75337fae9390e84a9feb30ea0973943c8284c8f2ef4fb7375299aa0888a3ef56d3df3ad3eb0d55f944200bf90d2ce86bfc53bf402d8d5f49f38f08ea07d65621167c29949cc3a3a2eea2a3ac390c54b562572442f2a477f2c246c4618a06eba648deb2dddd326097cb8548920d5273e40f2cb4bbd6189772f92fbba277fa0c443c4ca92bf2675e47f32ddb9fc8327a27ba1b8e807afb17900d3f9b8b5efb7a0e32d0db30f450322fd221d33961bd1e8da071a09bbeb13e8fcee3649bd94a7c7a0b623d3b5104e782d41d1ee67782f48c437e065e3ac6acef95d86fffc171c3c6680","0xf901f180a0298816c361a6dd73e5c6d650a116b210117b5f6f95ca91cb380fc45756337b5ba0288af8116f2273750aca980d0c24c72fc7062503d3a753744f9a7bba069c2d6da0bdf98daab367dd62c3854a7271670b254d9283b3001cb094f57ee726d95fbf69a0e3a4a7cf7e7813e446dee70e3593516a950e2d44d7d4f8198bcfca34b0e0a3fba0af93df1050c70e83886e62702540c2acdffeab3121fff3b33ec202694ede8930a047f6b6e892f877c5a336f23d6f76a989df2357e52d7b8a4e1e6968eaaed5d3d4a0174e612df82c6748928adc8d0c4f635bae5b3603851aa0348a73a8ee2265b878a0baa96e56e6b547bcd09c4fce6176e0f086bc8294b258ce2794be203ed82d943ea02b701c002e0cf16ab8669e62ee06a4d42b73c84b11c7619ec35c44fa10a17680a04bc6603c68106b8b5fa17abe17337f57d1294c5c3b6531a03176f7e21d37ad13a0ad353825499cf67aa9cce1e3ced9049450043f2b1d9df76a96b40e353c9b8a45a06d3eec642ecdcd6ded17ca14439fc19502ace50689be0608795a526568238f15a0da4a746889703e3c1ac322ca7bdf307d55df8d35a9d7c56632faa6cacf22ae12a0e3f5048a4b328c842b06a93d2dd713615d8f840ea6e2a36b81906ba6967327e0a0f84969caa1eee6f14b38b91776cf7049446ac4d9d20749b48124670f37c2da8280","0xf87180808080a092cc089f45cfa91178aa2773bd8d9596aea1e71fb6355a4d107d716d365f0c0580a0a4def846c97b1c574e2ec556b5c4282a67357c6b3b9ec2398c20758e6fe2eb33a02ef52f8e3dcfb6ab936437ee578919fb9e674dd2e94d8c0f76889e900158561b808080808080808080","0xf8419e3bd809cd30703531a76fc0e67a1ac5304cb6b58f9cf5f7f618541d6a9043a1a082af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d"],"value":"0x82af251eb4e15ec624f3a0d8e891892e45272cc3b364dec56cd00a1b2f36f62d"}]}
    */
    // L2 batch index being proven 82785
    // L2 block at end of batch 9934320
    // Output root version number: 0
    // L2 block hash 0x38a352d17ebab79b125d97f331a7b6cec88ce80ae858a12054391781ca77fe6d
    // state root of L2 block 0xc543c14c6ddc733964d287a5b302556a4d87b085169e6ee51caa29f3cc479a9c
    // L2 sender: 0x445575a842c3f13b4625F1dE6b4ee96c721e580a
    // L2 recipient: 0x3BA5Fbec17056A4c3C689F4DfA9a3d8a48C44962
    // Intent hash used: 0x4321000000000000000000000000000000000000000000000000000000000000
    // L2 inbox contract: 0xcfc89c06b5499ee50dfaf451078d85ad71d76079
    // L2 inbox contract storage slot: 0xfc3e15078e229f29b5446a5a01dc281ef6c7c3054d5a5622159257fe61e0aac7
    // L2 inbox stored fee recipient
    // L2 storage proof of sent message: 0x445575a842c3f13b4625f1de6b4ee96c721e580a
    /*
    {"address":"0xcfc89c06b5499ee50dfaf451078d85ad71d76079","balance":"0x0","codeHash":"0xe7560e2b071e0e66064efb4e4076a1b250386cb69b41c2da0bf1ba223e748e46","nonce":"0x1","storageHash":"0x02db022d2959526a910b41f5686736103098af4ba16c5e014e0255e0289bcc04","accountProof":["0xf90211a06121894b25a347f71af9f348e5c7df50e5b6caadfaf00dfc0993176bd99a097ca058f6fed8b3f6b22be59acf4ef949d24e7f0ecb16cb534af77789826fedfa0825a02b79ca53de2887773c6775cc53ae848a2f12c37331f5b73e9ddb59f58b421d1ca0f77174830b4397d56a13ebb4177a046ef47af6e8b562be745b07fd3a668399f2a0aa2a325836bc9ef19fa5cb46dade4e257a37980c124fb3b3bb26c97027abf4e3a032df9b870da4b0ae4504d0883ebf64ea0726b75ac2195dce69623e175b5fd07aa0fc3700e512de4814befe89220198a32c32cc6545c1310afc7231c1bcc847636ca0bdc50b4db32097b3f755e6853f4e868e7063dd08c0ccfdb91447adcbc3d0abe2a0e06a230a4d343c569dcc3a43655560b3766925b3c6e3bcd4495ad6f5c9ddd6bfa0bdff1a1ead10689a1f323625140fecc8e8de16fd10eaad2c27921aea0750e2e9a09b46a7afbe6014888be0f8b403697144af14587ef391412a1ed1b7500974b335a07a132659f5efd62f88d68d24673cba69ece850cff80c993bbd5cfdbffb3a8e9ea0f317921bec954ce628d654afe7d19635b85d7e76e8d6fe77719a962e93555893a016709a115db98c8204fc15d04cb0793fbc53fc2eb2588a3a48219b8b913e8c1ba0a038b9fd35c02994fad1285e22598a103b74090b70bffa279edf3698b7eca4dca0516faeab9b47f8c521fc7049f6023712bba3789a9571f0721a460156f17c430a80","0xf90211a082617599bcbd763764e2371a2cb9e213bf5fcb5e62e2390659d705612af55f84a055244607d730a310c1681be7d93717508502578814075ed882245f71d41c6dcaa0b4d02272d9b9a9d835ef81114a28f05add1f567d4aa0bc2936bcefb0376c7cb9a025a02c778b4e2dde021b3e7574bb73e40c44579f310e3c1c5a0fbc895650b18ea0b476be08d8b653fa584fedaf380a5b4574899b1790dbd8ee9bb3b4b448bc6f60a0439cc877a0040684f2cda232aba2ec2b3595b7e2b79946474954ef6495c951dba00fff418c7e774c88e7c5ba0505c475fc81e9b4d6816193e225abda57d857a79aa0b3b0c50c29fdb4d28e31dd30d3c9fb1615f14021ccaca92a25d4fdd1c9ca15f1a0030911d915f91b3dd3b3ca997af43ab285c11f66796ca3d82599fcbc062bf0f0a041a98482218b599e288e1cc1858ecee8746c9a5d445da6aea7f99712a88ee93da08b556977769f9c033460c607d0f6279ccb8e822b42a2df812e490f83531b4d17a02b22d0e21597d50c14f2591a1b69f26409b13d96677744f2cc27391f3ae23a21a01c1bb61166fcb8bfcc0bac93052896b1243b107c364a1b6a17fd9ed6fffdc83aa04c2120c7d5f5364c6fc51b9fdd92a5dd490d82c0d8f960b759faeae62adda7f6a07939cd3bd650f106f5cc419b436ecf9a1bf09e7edb3ae120f91b290a28d8153ba0901939b6bc88cdf2a5f189aa726def65149331f9080f99fd1f3be469db818fb280","0xf90211a0deecebb04bb9817a681c1635b24587fd95fc240c88880e7bca79182a6b95e974a0a603841e536ff88c5c4eb94e1d7a6893444cb55930ce727a578901fb0cfa7287a0b3f891bd83cdf3bcba996b32b41c00a5f68e93b4d6f0c36aea8dc6acaa826d2aa0ade828c7aac2c0a01fbd6a94c493818a862c061c4d5b482c9a0bd929b2622a30a086924a1703d1015581971da64c99ef7ec99723bc00cae2a34baff98066a9edcca0af991f2bfc91218f670de0df687f12e7e54c5b0e38a5ca9788bc9c1a4741f27da09b61ce533c48dda81255fc9c5cbbc28d178b709c83705977b25e88c89d75693aa04d88e945e902dffee8442d4c88ab44c21d2cb36a4a2b1f69d2980fdedd29cc64a09a7bc5feedf97c01fc661d133a3cee123027416da17c1b8795c22580b1f31adfa09fdb5fd187b9d374b1c16ca611344bff42f88f27967d10d96eb2dc5cc53b5f7fa020971d3d640527dfd9bb4bd716ff4c07499edd0e5bd8b1a8b2f2b30bbc4a5c11a070feb0816a7e5c4377f599583d07c8df5e21a118128fb53321babf3c4ac54473a07d159ff34c68e67a8a471bc0063788eb01d1ddc798d57a7102810f282bd0795da09e647b9e2bba8a59b2b4d155b764de92128a3c30b1c76442635bdf333c7fa023a0c1ff942a793f47e7444b440983e6d009ba75546ffea420ea10f941879864dbbba0594256865e6241364638f6a6a1e5a5d4d035540cc31629d5b1a36e9a7f4ff5c580","0xf90211a0ae4f0a00684017f70e14d1458909ad7dfca0d3ecfaf6c7039934c7c9ed61b773a0e76bbdd3508abe744421cf2ced34213b9c356eb0058211dae49a7c34f9cf59a4a077664dc1929c8c17c5c3fde1dfa949e6f105108395ae2d743c2c03c7c292a58da05f4da700b5694789705f7c50506a9fd469cb7b54b02c7f0aca8bcd3debe5c9e3a0518beb237b6a25334a63e522eb86e1d11c6c7e4044b8a9928e109fbfd2c75608a0c83e2ecc07aa1c7356a999b25dfcf9a7ac0192198794e7227671ed4be78c74cea0a094641febf17acb0d8a7dd1fad3fd7bc5cc213a4209b680465bd2f8a44baa15a02c02a8a7592b8f707ef794263ab25802b58fa4b987a52aded2cb0a2f9e2054e4a01e27c614e158a2ef85babde068a8d76f107aab26f974ee85e87337aa44164daaa013b58f7dfe16baf1d40bc86f4cd7cf070c5942700c649a062c0f1489741cb79ea03bd9a4918443f8b84657ed68ed02d725bde2150f541df4c4a1a5a582a2c65dd8a0b4f9f1b2d2fab041f38e023cb1aae181e44ca8acb6a26efd025cbc1a7adbc2f8a09497d9c0c3c7a19110f4f3b4cc3f7828e628228579aaa61f89b3bdcb6c3a6690a0d529e986ec16199b3daba1e0fc6ac5fd639b58c4b1485e39627fefa420c7b760a00186cfeb7130d2b63119ce8adced8359dedf984e49864c63c71a2f8b2e56e203a0583a34b58daff2557ced6c47028e8ed63e8c0fe560fa7cb4dbd8004aa9d43c5c80","0xf901d1a08db09d13624104c2a661d7ab0ac2d047c6cf8986ba5df766de5396e267d629a6a072eb3281ab25293b29e90b086a77cf69dff3d1ce905bb6af650857fd84a2c6bea0327b8dc5ab80942984a750a54a99b4c63c159f441a219db42e9b9e230ffe12b3a0f37eba5fbffbd821fdc81cae5654bdad3527a50d40fb08bf99458b684d82b6ee80a0b0f8a7815b773f91a8f2eac1f06680de064a89748106b05766e5cad3b77efb0aa0f38807593c203a53b3ed8d0340023137fe346e990952c0bca6424a4293f871a8a0d1424d978c782c179be6994150dfc3faf5d58dc72611d538d8548da53d6b75f3a0be5d947e1f776f1da25f58095b95e7a120575d8ece634148c21c6f8ca0a2f9bd80a0fa0f8d367cc0786b73c85e8dddafe363aa6ee31c83d110dbf0cf57ac579a4229a01a4c06b358cc35ee753f273d3deb815d120c16a9077b5cfa815994d5b58c96baa081d0b794b4009cea5f452fb7887ba250c4a3257de15cf0a0332d9de5b79e25bca0704e1c3f8f8caec4055cef2d76f39d77ac4590dc02028fa3044a1b7ef2b1766ba0550b6578bc5d90bd7297a494f97a360e628a71104c1fdaee752f527f527a5294a0e051331760e18a0dc706bb58db8a2d8ce365cd2df9bf30609b529a7125b6ad3d80","0xf89180a00101a59c2902350854ffcb7ab745441523a707bab36bc1479e8c8dcce24f2d328080808080a0653999d54210d5244766ec55f9119329441fcf572fb220712930ae1201d43b6480a09fce5223f93751e8f2886ad2affc5673e31582abdde301a46fec9eca05ae37428080a07fc0e0a2566f08e7f320e4ffd64d67b71f2cb777a982cb0fb9e9c04bf7dbcbba80808080","0xf85180808080a07a596d95184cb688eaf5598197d65d773d99afadaf596cfb117a66b9f3c31ea68080808080808080a0abb72d5822095efeb726183261bfdee090ce1158606e392ea2a94b61ccd5b777808080","0xf8669d3037c0233cd2053a89f17a4599efb8c96f07d9a38ddbe10640f9cea584b846f8440180a002db022d2959526a910b41f5686736103098af4ba16c5e014e0255e0289bcc04a0e7560e2b071e0e66064efb4e4076a1b250386cb69b41c2da0bf1ba223e748e46"],"storageProof":[{"key":"0xfc3e15078e229f29b5446a5a01dc281ef6c7c3054d5a5622159257fe61e0aac7","proof":["0xf838a120ceaa546d78134283b3b4a86b6ae3d0d57bb8166c714a3893d80b26ecd35ccb9f9594445575a842c3f13b4625f1de6b4ee96c721e580a"],"value":"0x445575a842c3f13b4625f1de6b4ee96c721e580a"}]}
    */
}


/*
raw L1 block data
{"jsonrpc":"2.0","id":1,"result":{"baseFeePerGas":"0x3bcd96875","blobGasUsed":"0xa0000","difficulty":"0x0","excessBlobGas":"0x5c80000","extraData":"0xd883010d0b846765746888676f312e32312e36856c696e7578","gasLimit":"0x1c9c380","gasUsed":"0xae0208","hash":"0xddbab69aac369068d1591a69ce60fffee3a9c5049e44ff7e5099d462cabffd4f","logsBloom":"0xc440c448404248d0d732508311017626405a94801880050066402205c802509c05689853c92ae135d776e7016334f0a228303181076f660830145a28613a0680643003405816824ac615828b0038d2040c0472106518a38150414000018d00073a2d0408de0c40328a0a0a28531c5d8854bd00e409e58f383008241429a838409602a0111a129d10bc785d8820180e120869068240048ca11389018455c48011421a486390080804617ca815a88493c6696bab21a04d444038e4d222002344809234c92210f5542159dd0e91dcb7625603789189014c21304014126071d0a28483544c60150500800ac1502365cac26c812037447dbdb360a093568a3a30d458","miner":"0xf24a01ae29dec4629dfb4170647c4ed4efc392cd","mixHash":"0xe9a0128db6a83a34ec516c749fc69503db278399883078a42de7d60118006125","nonce":"0x0000000000000000","number":"0x5a12ed","parentBeaconBlockRoot":"0xf52def609774f39fcafc482540a1fdec24451a7e13ed4f1ce543cd8099933d0a","parentHash":"0xaa7af754873ab629349b99325136f8052d657f0923a922497a7028f18bfa939d","receiptsRoot":"0x16049fbfa3d56e4757d380d447ab0332ffa13835c9e77a98791144d295d525b7","sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":"0x1120c","stateRoot":"0x80be241290d08c1e19fd83e4afd9a68e6594afc91d3af207b60f01ffd5434c79","timestamp":"0x6643bc24","totalDifficulty":"0x3c656d23029ab0","transactions":["0xaf41b6bc39f22c5da5863e2b36149e6a829cb556b5b98f701e747b224004f872","0xe9e2dbde5bfa21f84ae6d4bfc2a7d2084eeeaf6979c11ce710187cd758666d05","0xf704221f8bbd7776f327d2fb8c04b65810bc9cb857bfbb08899746a564eea47d","0x2fbb54f2e09d7bb3b48ee8e968049763ebc3ccd085096fb0e12ca9b464591d12","0x09707224e85a755fea638df663a863975c49689e1dfd9fb9b42364a9f576dbfa","0x74c39fdddf5d278edf9691b86f5efda959b5e776cbd49b1cb0587817b6eefe1b","0x85d65c646686e02b198979a7a18f7169685de7d3f4dd733c8b711e30bdf5dcd5","0x0daf8bc5b22e11209b77a3db976c75e80e0290dabdcd37964cf67a5fa6db515d","0xcbdb21b509fe289c5128f1145907ffbd1cd91f2ef15c4e5960a49bf530463119","0x50455e355f39a252dfa82aac1be2618327a2ca69e1bd01c9b1bb953e91b15ea4","0xec661f38f961c981245bd569e18cd49ecd35c9735c3ccf329cdd0b31f992cb37","0x035414ce4a529b3138f078c8f0074e184fed64d4153552313be443dc41952b69","0xb74e437e5804d49de62866076e6987ea2331f9e817eb36fb21408d33d53c80fe","0xabf474fc074f4ad4ad1067ef1c204073d6707eb654cd119fcc3438b65af83d80","0xca5274d7920d75c257c379db3559bc346bcf0d43205fbd21c62467bac3145f58","0x7829ce50da3586899796a1a25b2b8e491f3a7282948d9abd16274067045a6d25","0x67fe326c9a21e50079d862de2e6723c875a24a4111aba03318f07f5203a7ee0e","0x7c48fc46c6d89c240a7751c265d2f0b076b75a78d123a12707316bd4bfdce659","0xeac3c74c2dd7629930542163b098722b61f0d5889152c8c47442095c4bda04d0","0x30116bfdd17692c605f28a75090ff6e526ea7f0270c381e023572bb82ac80ee4","0x01cc7afee96b90b2130a92c6c2ffe6d6373d9b6aa5ab430f962bff9dfa57e717","0x8b74d83133b35be8406b73ed6a30d40393e32b0cc7997fe61d7f59b668dcdf9e","0xa14dfb8b088f6c4e9937f1abff2030e3c6b9fae99f410fe7db472240fdda4891","0x999fa3e9f13f256de7d3eb7f2471b1823f3c8212de3aaec75555f4066d0bbe12","0x7fa68a2ceef2cece299036c13bd99c4f1e76da9f18beb69f7af8ba49ad081e1b","0x2370ace23894ab7374aaf1646fc935cfee8363c01487f5553332a3e55e389fb9","0xbc7ef5295ca0b4b6a55320b79abc7b8419c8d834b3590fc23470d59e089bcdce","0x57084a1d2852af339579edab31e12feb1654128e6a02a31323d5e5237d940502","0x7b55b12b3d3f0d6d7fb0d0e0228de7fd5fa8eccb8333eb6fdd7ad80cbf9ce2be","0x64a83b91ed86a55119631bbb262be85ab590e8bf290ae50374e11e11a5f8cab4","0xb16d104f37d271c73cfbce8910406f32a93f4862a244badfb379370b3f4b3b6b","0x18e86912b92f2a92316848a6ea3cdf6a5f3bcc6709dd105d56a980ad6a4c21a0","0x7cfdb495d08355eba7261da5291f40ee7f5b7009375534c724249d4abf920d49","0xfa7df851e1655360448e3c56b6c937bfeedf1095ae9a67642ff0182a807085f9","0x3c95732d331df7980aaa5fdf0174c6cde84184a45e786e1c94e80c6369b9fa30","0xcd5aba53731e7237e2226cf58aaed70f4341817d9166ab3fef37e1769b1977fa","0x976cd03722bf151e942b6fd1464ee603168f20213060365025583dd22ae105d7","0x735e440deb4f56cd33702fa4832ed18116233c8b100b309642d588e6c951cba0","0xedf9f1bcf0fdab85fafa25c1b9c862620040cacb0ee3c57779e43f8d934fd44c","0x71039f8322b13f3cf1b6e477867160cfe07755ccd8ab7f79a290b1e1d6382e55","0x234a610644d679d8d2cfb3760d962c5dda505a0ead477504b957a3f12d714ff2","0xdc946677fcd7d3d91d95683af90bd8e9f6b14ee07fa6890462bbb9f19bd7ddef","0x070e1fd217e370df149625f2d938a91532c02d36837330ba65f44bf8fab4a4f9","0xa3943b2e282ab393771ef770b6d99be9a168e88026abfdb25d11ea85e28dd2c9","0xaec50189cb53cf28ff3098962b0259c2bd88b69f58ec2c42b6da2b4ede0eb811","0xbb724c884e170f93c4978d367d19cbeb09072302badb71f02310f2206e75b637","0xbda64235303f4f639869044e35cd696f3194b70a7c63bf2d66c49f493ccb2e1b","0x212e66eaea36f6fce032bed5c34cdd486c2a76a3dda20e88ba83a55f46c2179b","0x939ae62efb628d14937c62f5c19b14f9742e697836c725a79c6c7e8257355ad5","0x69f7d0836558f465b29c2714d90b38bb70b4987b8a7afcfcd7f8522c8035f6e9","0x93aa5eb1f20acfe08962a71e09109a0e148e951ded4fb73efa30fbc6842ef605","0x3527e6f1daad91f1a8e6a0d15755fdf0a1671b505c707e1784c238d7f3118423","0xa4eed831b7a49b28fe17c2a430beaaa79a3cd139ad6a24fa593733253a17ddae","0x7866eb7745b0cb57dc272ddb228637976c951590f41cccb9fe14559a5f8b7fcf","0xf424d0d07c49adf24a41ec7309cc362dab042b58d6316afc4300d6e7f8c74970","0x6666114a70ada045ed3b54decac86136ade0d1341fc7f43089475d17db731860","0x17384c457306fe05e2020d76f030d974953ae7e64c795e06fd0213c9a531b577","0x59cb7f4d5786e2f355a61877bb2f9ab078553a55b9dd43f46d773eb1b24e7031","0xe87be6e2a62430a64aa73caad2b4b04e8bec23e3cb73c83439377ad679897343","0x48fdfd08e454aa7022f66f6c611f463041d68c86524d650548fef6ba62488def","0xd6b8a7bf2cc92bcaa923c8a432cd3ada137d89fabbfacd67f7eed0ff5112834b","0x4f23332efd9cb048d9401c7fdf4a2506c437dd0acc9b0a6ca2d33d8b1c3fdc68","0xa1f0aa9657a198678e25734e913278a5e6106ca0489dd0af0594f25413c35ec9","0xf433b72e99e94878eaa2ba6d76c574dbeeac6c4e484d60150e61351e0465f78f","0x0c9e565bfb0e800bde14d0267deadf6f8c87c79c8306d777b232e66479164597","0x4dca953abaa14cf1d4b002142ca8148dc9948163b28c480319ce2476b24e9116","0x8c8b7ff2aa86823ff002cc30d1c757207fe619194afb1d9a3dda5870261b5f73","0x5196072085e9076fb0c708bce18beac3e75ed8cb56799425ef8185df10fc37b3","0x8dca42432e5414f6487ce047f4bb9de33dcda6accc856a7ea85a8f527e262af0","0x39dee9855b3691928d85231ed05f15926fdfe1a63a45d3ab6b368f2f285c8f29","0x284fb5a44f5534fd6b46b9b69dae0ded7318720bc4909de8ae03d2bc53619ed3","0xbb4f715d0e5b286d9b884f300caa156d619dfe23b47152340d4512a7712385a4","0x0255e36e9b12cae89b6ff64b9b92742815d8fece2e424916b5abfcbda543487f","0xf72430ba95ce936cc7e78054ae23160c64c0d4c126ca4b5056be900e687d1b22","0x90d2e42a241e670a09f5c8bdc4d5a256e7b047db62c5bc23c4d78b2ebbf050d2","0x714a14b1d8f539362c4f8cf2e7cb9c6d53b7f36341de3206643d18762da5c341","0xa572294af13d8d3a4be0873db2e282792a6f8594c4e7c80e2d9f4ec3b91475f4","0xc1d7f65d4e2b49f2c9c61c809a230546f083829e5b0256c42e88697b6550d653","0xb17914466cb303c8e1c5f890bcc45aa912d6f26cc751d3e0c30406f8dd5063a5","0xeb7621b777f3920a815b8d94d43362c5222fd1a8eb1461b9d70f71fd7d202ecc","0xa732c74ce689aa4e4c511e491464c9729b5e092849da18c5286881a4f9b610fd","0x43d892d59622390a4816f916c2e6b0333c2c0a6685b268c91c09446bb62be42c","0x0e3ecf7925ff140de73c2062f7069eb854b6a2efeedc50400fb2ce573348ddaa","0x80dee29c0f8396198f99e54126f776c3de554eeed7dfd2cbc00dba5b699ac38a","0x619998cb53fa48182096f93ae579ec815e7aa08c1e4ce3b1cf1eee86b663f33e","0x456dfdfe8b5f01be1e5a9de3c40b86c5effd75c9e206d6758ba5e4fa7427a29a","0xf926f167c9d52ae2575b6e6d826a4ce1e83665fdee971342ecebb9cd67ab52e4","0x008a887575594cc4524bfd7811e9594c335c69f0682c5b88b8f9e66aa69c16a6","0xca44ec217c32e4a271066e56501e0384c8c4dfe7f41ba894f126f6e53c0d1769","0xfbd8c541e1fb9583bd7f417c7be118de0f6bcfff5eae918c49a3e78ee358b647","0x43efda9eddba9a8f32575cf8d407f78cc770af8279a3a62925895cc8486175d5","0x5f0a75cbcb282c1a1e7958a6311906de2a62707c35d865587ee5180f4d2131ed","0x66f18d993514ecc81e2eb6c305368ab06f161c8b9bc8d61eb4acea476e744a68","0xc634966bfa0aa272ac00f892828b9bb2d10f958f87f5af72576b5b1105606250","0x103a3bfd859c4ed8ce6cee89f2d800eeafd7120bc5bf22f05b848a1cb8784335","0x5cad50523ddc7999903c450f3f6fae5b3e7210a513ee2a8f807e379d9e5bf7d0","0x276fbf7e8e22d1a5d26c48e6c3a9ce06eaf4b7507d65c2324104693c92728cd8","0x67a405f99d7e51914e909cbf7f07f5b74ae386c5b82787707110d5c6542c4bcc","0x5926664f8e84fc7cdb3b9eaa84adab4fa0c6730f2faf71bb337f19f2787f0aef","0x454eb52f7df4706149424d1fd153b9494d05ade6ba2264ee2ce7b903b0229fd1","0xb777033e65bffd5274697ebc3654536b9aec5100e50f1852e13b5806b938eba6","0xfb3a094946a2e45c0f3434fc44ac691f8398636cf616c4e3e4379957423e90b5","0x56fab0630dd839fe395befcfaf281d3d2a10121cd08532adc3b1f9d19325d03f"],"transactionsRoot":"0x9d6f4563f6dfccd330cf837a25dc5823fa73f6c8d7a7530e1f027e9cb60b6e52","uncles":[],"withdrawals":[{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9b9","validatorIndex":"0x3c4"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9ba","validatorIndex":"0x3c9"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9bb","validatorIndex":"0x3d1"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9bc","validatorIndex":"0x3d7"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9bd","validatorIndex":"0x3d8"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9be","validatorIndex":"0x3df"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9bf","validatorIndex":"0x3e0"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9c0","validatorIndex":"0x3e1"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9c1","validatorIndex":"0x3e2"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xec0","index":"0x2c6d9c2","validatorIndex":"0x3e5"},{"address":"0xe276bc378a527a8792b353cdca5b5e53263dfb9e","amount":"0xb10","index":"0x2c6d9c3","validatorIndex":"0x3e6"},{"address":"0xf97e180c050e5ab072211ad2c213eb5aee4df134","amount":"0xb10","index":"0x2c6d9c4","validatorIndex":"0x60f"},{"address":"0xf97e180c050e5ab072211ad2c213eb5aee4df134","amount":"0xb10","index":"0x2c6d9c5","validatorIndex":"0x614"},{"address":"0xf97e180c050e5ab072211ad2c213eb5aee4df134","amount":"0xb10","index":"0x2c6d9c6","validatorIndex":"0x619"},{"address":"0x25c4a76e7d118705e7ea2e9b7d8c59930d8acd3b","amount":"0xb10","index":"0x2c6d9c7","validatorIndex":"0x191"},{"address":"0x25c4a76e7d118705e7ea2e9b7d8c59930d8acd3b","amount":"0xb10","index":"0x2c6d9c8","validatorIndex":"0x194"}],"withdrawalsRoot":"0xdc3d7de926e5e8655d9005b34e4781c6e32798f71a104d1458555c6db31c6291"}}%
*/
```

# Additional References

- [Alchemy - Smart Contract Storage Layout](https://docs.alchemy.com/docs/smart-contract-storage-layout)