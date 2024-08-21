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
  hash: '0x95ede9ae552aa114ce6aa3b08c8b36833aae0a4b4f75099b2f5af2d006d88de1',
  fulfillTransaction:
    '0x5782e08d42a328eeb68f5bf07ea8725c917d572911e20baab04a4410d71751d6',
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
    proverContractAddress: '0x8D4802BE8542f3ac41E25A2c6526AdBa269A1806',
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
    proverContractAddress: '0x3AAc4C74E2Dd6446370Cc9850ae15e78624f5394',
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
