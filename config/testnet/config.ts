/* eslint-disable no-magic-numbers */
export default {
  sepolia: {
    network: 'sepolia',
    chainId: 11155111,
    layer: 1,
    role: ['Settlement'],
    L2BlockOutput: {
      baseSepolia: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
      optimismSepolia: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
    },
    l2BaseOutputOracleAddress: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
    l2OptimismDisputeGameFactory: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
  },
  optimismSepolia: {
    network: 'optimism-sepolia',
    chainId: 11155420,
    layer: 2,
    role: ['Source', 'Destination'],
    provingMechanism: 'cannon',
    l1BlockAddress: '0x4200000000000000000000000000000000000015',
    proverContractAddress: '0x2470b9B23F3A2934574E04a3Bcb7C6B43438D582',
    intentSourceAddress: '0x3f222827D8466E85d6c19594564b55Dc4a1c1DcF',
    inboxAddress: '0x32388BB27E07db4bdda11Cc1EC919634cc6afF65',
    l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  baseSepolia: {
    network: 'base-sepolia',
    chainId: 84532,
    layer: 2,
    role: ['Source', 'Destination'],
    provingMechanism: 'bedrock',
    l1BlockAddress: '0x4200000000000000000000000000000000000015',
    proverContractAddress: '0xbe271EC06776e4B27AF854dA6511B3bb84313544',
    intentSourceAddress: '0xcFbbD67c9f43a8E6D3D9aF7Ab93d61397c7a08CE',
    inboxAddress: '0xbE6562D1F5cB7687ec3617Ec993A645104d77b5c',
    l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    registry: {
      destinationChains: [
        {
          chainId: 11155420,
          prover: '0xD680eF529AA9340ba8754157Fc06055f18E3a151',
          inbox: '0x8831967844AA280E8F0Ac47977AdB4d947BAE536',
        },
      ],
    },
  },
  noncePacking: 1,
  intentSourceCounter: 100,
  l2OutputOracleSlotNumber: 3,
  l2OutputVersionNumber: 0,
  actors: {
    deployer: '0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4',
    intentCreator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
    solver: '0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E',
    claimant: '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
    prover: '0x923d4fDfD0Fb231FDA7A71545953Acca41123652',
    recipient: '0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9',
  },
  intents: {
    baseSepolia: {
      creator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
      destinationChainId: 84532,
      recipient: `0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9`,
      targetTokens: [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`],
      targetAmounts: [1241],
      rewardTokens: ['0x5fd84259d66Cd46123540766Be93DFE6D43130D7'],
      rewardAmounts: [1242],
      duration: 3600,
      intentHash:
        '0x484cea121edd714e3d33dbd9882b7bd8c86e0df55e795de5ab1eaff252ad3952',
      intentFulfillTransaction:
        '0xba339fca2d1bbcced87a66845bdb43b62451513756f10b9f0800341cf5ae0a8b',
    },
    optimismSepolia: {
      creator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
      destinationChainId: 11155420,
      recipient: `0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9`,
      targetTokens: [`0x5fd84259d66Cd46123540766Be93DFE6D43130D7`],
      targetAmounts: [1241],
      rewardTokens: ['0x036CbD53842c5426634e7929541eC2318f3dCF7e'],
      rewardAmounts: [1242],
      duration: 3600,
      intentHash:
        '0xede356179c8f295d21327bb56d9fd91f29cdd7bfe42714de0fef3bae7bf2ce3c',
      intentFulfillTransaction:
        '0x19b05b2f33d9427a0cc3adad5a7d7cb5caedae42847e893b0e7a3c7d1c65c1ac',
      layer1BlockTag: '0x600484',
      layer1BlockHash:
        '0x57d56beb8418ef9382bb72e48ed1701ba632176587a55ec029ce2290256b47b3',
      layer1RLPEncodedBlockData:
        '0xf9025da00510ecb4de7d4b00f5862670616329e18cb3426849b6e386e58f772f92e6318ea01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794c6e2459991bfe27cca6d86722f35da23a1e4cb97a0b61f35acccbbead7e691d137539fe35c8f3c9538ce280138ca6b5dee907ef29fa08c7582d8db054dbe0aa339643dbff5463b307981ab8e3a19cccd4c2156bc85b4a0898fdc9c396ebc141311f087d8667ff59a3fdb4e14a865e0b9076b038fc1b2f5b90100b02168024111c204ec114452c000206c0211c61c10ac83240204002d469a8002002c002960825020345205118626418ce23819218305820580c4b2153024004f1292e0c38d0500264104c84a0a21482044005610046001100100804200860241148081180a0414920014405020200900803801e0811600656018881080c8000686802000019962132946019809016814403188008000200c100131411f2068000728800ba0a0611048400113a27ec65c124a1088043089200eaa638362430428000181021039480090130c1328ca028110122650210080442c02db450007202c0d5082302014009e00103c01a0188456020bbe440811520502008546081cc38280836004848401c9c380840198c98184669066cc91726574682f76312e302e302f6c696e7578a0fed8a445733e53bdb6be75576d01e3b02d25993c20a7a5a01b74cdff0d91908e880000000000000000850247c9c056a06189d4316e56c54f2652049ed02d4201a1609d8080fadaf771b715b3abad71e083040000836e0000a02165a005e5e0faaf9337fa73df5617ac79e693ec819a3e8a9ec0fa31c7e65d9b',
      layer1WorldStateRoot:
        '0xb61f35acccbbead7e691d137539fe35c8f3c9538ce280138ca6b5dee907ef29f',
      gameType: 0,
      rootClaim:
        '0xe056d712a70ffcd59ed6a9b46613bee28a97068c8d987625fa97a5898b009170',
      extraData:
        '0x0000000000000000000000000000000000000000000000000000000000d966dc',
      // Hash uuid = getGameUUID(_gameType, _rootClaim, _extraData);
      // uuid_ = Hash.wrap(keccak256(abi.encode(_gameType, _rootClaim, _extraData)));
      // wrap https://docs.soliditylang.org/en/latest/types.html#user-defined-value-types
      // Hash https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/lib/LibUDT.sol#L174-L189
      gameUUID:
        '0x6112bbc540fb9a6a2cbe226050665e62644f6ed4aa95c0784d981539c4eae69a',
      // GameId id = LibGameId.pack(_gameType, Timestamp.wrap(uint64(block.timestamp)), address(proxy_));
      // LibGameId is here https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/dispute/lib/LibUDT.sol#L82C1-L118C2
      gameID:
        '0x00000000000000006689aa0827f77e1f136204d18a100c30f634704067251d09',
      gameIDStorageSlot:
        '0xdc1a0dba53f837978d5bafb52ebb7cd67f5cfb418c5ec060ebdc4bca53327769',
      // can we comment this
      faultDisputeGameAddress: '0x27F77e1F136204d18A100C30F634704067251d09',
      gameState:
        '0x0000000000000000000000000000010200000000668e4784000000006689aa08',
      l2EndBatchBlock: '0xd966dc',
    },
  },
}
