/* eslint-disable no-magic-numbers */
export default {
  layer1: {
    network: 'sepolia',
    chainId: 11155111,
    l2BaseOutputOracleAddress: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
    l2BaseOutputOracleStorgeSlot:
      '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
    l2BaseOutputOracleStorageRoot:
      '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4',
  },
  layer2Source: {
    network: 'optimism-sepolia',
    chainId: 11155420,
    l1BlockAddress: '0x4200000000000000000000000000000000000015',
    intentSourceAddress: '0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46',
    proverContractAddress: '0x653f38527B6271F8624316B92b4BaA2B06D1aa57',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  layer2Destination: {
    network: 'base-sepolia',
    chainId: 84532,
    inboxAddress: '0x84b9b3521b20E4dCF10e743548362df09840D202',
    l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  noncePacking: 1,
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
  intent: {
    creator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
    destinationChainId: 84532,
    recipient: `0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9`,
    targetTokens: [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`],
    targetAmounts: [1236],
    rewardTokens: ['0x5fd84259d66Cd46123540766Be93DFE6D43130D7'],
    rewardAmounts: [1237],
    duration: 3600,
  },
}
