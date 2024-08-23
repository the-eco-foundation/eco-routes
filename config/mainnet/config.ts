/* eslint-disable no-magic-numbers */
const provingMechanisms: any = {
  self: 0,
  bedrock: 1,
  cannon: 2,
  nitro: 3,
  hyperProver: 4,
  0: 'self',
  1: 'bedrock',
  2: 'cannon',
  3: 'nitro',
  4: 'hyperProver',
}
const networkIds: any = {
  mainnet: 1,
  optimism: 10,
  base: 8453,
  1: 'mainnet',
  10: 'optimism',
  8453: 'base',
}

const actors: any = {
  deployer: '0x6cae25455BF5fCF19cE737Ad50Ee3BC481fCDdD4',
  intentCreator: '0x448729e46C442B55C43218c6DB91c4633D36dFC0',
  solver: '0x7b65Dd8dad147C5DBa896A7c062a477a11a5Ed5E',
  claimant: '0xB4e2a27ed497E2D1aD0C8fB3a47803c934457C58',
  prover: '0x923d4fDfD0Fb231FDA7A71545953Acca41123652',
  recipient: '0xC0Bc9bA69aCD4806c4c48dD6FdFC1677212503e9',
}

// Note intents currently being used are for USDC with a common set of actors
// the other data coming from the network
// Here we store a minimal set of addtional fieds
const intent: any = {
  rewardAmounts: [1001],
  targetAmounts: [1000],
  duration: 3600,
  opBaseBedrock: {
    hash: '0x9fe31be4a2325655dfbd4bb54d83e8b525cfd1a05a19865fcdac7c59a1dbc981',
    fulfillTransaction:
      '0x59036b6f3138471a0b617982319a99ebb5343dc9a43760b1c7a0738e51b1ef7d',
  },
  baseOpCannon: {
    settlementBlockTag: '0x13a303b', // 20590651n
    settlementStateRoot:
      '0x2c8ae6de0f5432d5b06626b19ec08f8948fec8c200a141bfc802dd56c310c668',
    // faultDisputeGame: '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
    faultDisputeGame: {
      address: '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
      creationBlock: '0x1398b5d', // 20548445n
      resolvedBlock: '0x139ed4d', // 20573517n
      gameIndex: 1650,
    },
    hash: '0xf362fcd0ffb85c491f5d883ddd08c4e331d8bf7efc152ed97a62e912de71b3f4',
    fulfillTransaction:
      '0x2d44b7830f7fa3e78249739f4743edde5eaa73bd5e779de679271eb849d99baf',
  },
}

const networks: any = {
  mainnet: {
    network: 'mainnet',
    chainId: networkIds.mainnet,
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      base: '0x56315b90c40730925ec5485cf004d835058518A0', // base L2 OUTPUT ORACLE
      optimism: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9', // optimism Dispute Game Factory
    },
  },
  optimism: {
    network: 'optimism',
    chainId: networkIds.optimism,
    intentSourceAddress: '0x532BA2D408e77B773b1d05Dafa5E4A2392e5ED11',
    proverContractAddress: '0x82A4c0d2BdE3929320130F29b7F7aE937b5B960A',
    inboxAddress: '0xd01168742A682146095c3bCe1ad6527837593a85',
    intentSource: {
      minimumDuration: 1000,
      counter: 0,
    },
    proving: {
      mechanism: provingMechanisms.cannon,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      outputRootVersionNumber: 0,
      settlementChain: {
        network: 'mainnet',
        id: networkIds.mainnet,
        contract: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9',
      },
    },
    usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
  },
  base: {
    network: 'base',
    chainId: networkIds.base,
    intentSourceAddress: '0x5e46855a436FDc16342EB0689f6555Db59b0245B',
    proverContractAddress: '0x7fac74E2eDF61bA01d18Bb0d1D44E2101367952c',
    inboxAddress: '0x73f4eA10Ed8e6524aB3Ba60D604A6f33Cb95fc39',
    intentSource: {
      minimumDuration: 1000,
      counter: 0,
    },
    proving: {
      mechanism: provingMechanisms.bedrock,
      l1BlockAddress: '0x4200000000000000000000000000000000000015',
      l2l1MessageParserAddress: '0x4200000000000000000000000000000000000016',
      l2OutputOracleSlotNumber: 3,
      outputRootVersionNumber: 0,
      settlementChain: {
        network: 'mainnet',
        id: networkIds.mainnet,
        // L2 Output Oracle Address
        contract: '0x56315b90c40730925ec5485cf004d835058518A0',
      },
    },
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
}

export { provingMechanisms, networkIds, intent, actors, networks }
