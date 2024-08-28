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
  inboxOwner: '0xd0d9fa3a953189258a65f8404a06599B3466F562',
  solver: '0x3A322Ff8ef24592e5e50D2EB4E630cDA87Bd83A6',
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
    hash: '0xd093c375174f1a3bae72779a000166b46262ac9c62dca8ce410bebe663414e27',
    fulfillTransaction:
      '0xcc10211f2bda384a385264c680eafa15e648413ce053ee00dcdd835b2d7246f6',
  },
  baseOpCannon: {
    settlementBlockTag: '0x13aca7f', // 20630143n
    settlementStateRoot:
      '0x72b6739729dabea437bd2b97441e656550170f06ce75fff795dc547378e88457',
    // faultDisputeGame: '0x4D664dd0f78673034b29E4A51177333D1131Ac44',
    faultDisputeGame: {
      address: '0x7066f76DC4C04730793928bD32634C430d95793B',
      creationBlock: '0x139d153', // 20566355n
      resolvedBlock: '0x13a332d', // 20591405n
      gameIndex: 1710,
    },
    hash: '0x64cfcf941df8efa0ba72a089b1bd46ddeef801200ca591d70cd13fa2d6a0209e',
    fulfillTransaction:
      '0xf7dabff5669c2187070a33ce1d718f78fe5058090f3412d5c5347fae868acbcd',
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
    intentSourceAddress: '0xBB05f92D342572F68AEA18171dAe83a7a8ff098A',
    proverContractAddress: '0xa20c508f230433F3E347c96cA10aAbB64fAD1fEf',
    inboxAddress: '0x560D77D7CDAB38DD5033674571359d3C9B68bbAC',
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
    intentSourceAddress: '0x4df739d075095B54C33f5E79B10d1284577e2d20',
    proverContractAddress: '0x0CA4437E8f89a5C9b3569Cd430E89E72B2e26bFf',
    inboxAddress: '0x3B4232f5c2dC798Cc07424d26562c097D6100900',
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
