/* eslint-disable no-magic-numbers */
export default {
  layer1: {
    l2BaseOutputOracleAddress: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
    l2BaseOutputOracleStorgeSlot:
      '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f747F1D',
    l2BaseOutputOracleStorageRoot:
      '0x4d14fc0663fc0c255a3fa651f29eab4745b50a9eb24c0da64c765a8d69de21d4',
  },
  layer2Source: {
    l1BlockAddress: '0x4200000000000000000000000000000000000015',
    intentSourceAddress: '0xf8e03e7FD9f45B9B050a5a2c0e41fF5a3021Ff46',
    proverContractAddress: '0x653f38527B6271F8624316B92b4BaA2B06D1aa57',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  layer2Destination: {
    chainId: 84532,
    inboxAddress: '0x84b9b3521b20E4dCF10e743548362df09840D202',
    l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  actors: {
    deployer: '0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4',
    swapper: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
    solver: '0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E',
    claimint: '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
    prover: '0x923d4fDfD0Fb231FDA7A71545953Acca41123652',
    recipient: '0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9',
  },
  intent: {
    destinationChainId: 84532,
    recipient: `0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9`,
    targetTokens: [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`],
    targetAmounts: [1236],
    rewardTokens: ['0x5fd84259d66Cd46123540766Be93DFE6D43130D7'],
    rewardAmounts: [1237],
    duration: 3600,
  },
  intentTransaction: {
    transaction:
      '0xdcec879122df8469101d4d18dabb382312acee435ff8fc138b2dbc1c7d058595',
    hash: '0x53819d1039447c99d2fc31960ac5b56a389d961cddde355941a02f8ff0b7d9c8',
    nonce: '0xbdf8aa3e891eaf55796069c59400592f18ace63bccfc836dab094d09c3ed6ce3',
  },
  fullfillmentTransaction: {
    transaction:
      '0x73a239917783af3d1b9bbaf6152ed19de757096b34636d168a42ef3450d5906f',
    blockNumber: 10978073,
    blockHash:
      '0xcc682ef8fc55061db71007cc76662d1a109ca2a94168e5aa7d3f9aebd38364fa',
    blockBatch: 91483,
    blockBatchLastBlock: 10978080,
    blockBatchLastBlockHash:
      '0xe41b89c14bc987d9c557742e790dfaee50ddb1bf981c5e9854fe5c50a96646fb',
    l1Block: 6054921,
    l1BlockHash:
      '0x43399d539577a23a93d713934c6b490210c69915aba2f1c4c9203618cc141c64',
    l1WorldStateRoot:
      '0xbffb76d782f51dde41ea7d7f9715664b4dd0617fc7373ba20a670281645ba135',
    l1StateRootSubmissionTransaction:
      '0xbc0d0b35f144aeb2239b3d97c36b56b7e0d933618e3d9bf6c6ab16882a464f8a',
  },
}
