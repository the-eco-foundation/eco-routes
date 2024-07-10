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
    },
  },
}
