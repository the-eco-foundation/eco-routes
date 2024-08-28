/* eslint-disable no-magic-numbers */
const provingMechanisms: any = {
  self: 0,
  bedrock: 1,
  cannon: 2,
  0: 'self',
  1: 'bedrock',
  2: 'cannon',
}
const networkIds: any = {
  sepolia: 11155111,
  optimismSepolia: 11155420,
  baseSepolia: 84532,
  11155111: 'sepolia',
  11155420: 'optimismSepolia',
  84532: 'baseSepolia',
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
}

const networks: any = {
  sepolia: {
    network: 'sepolia',
    chainId: networkIds.sepolia,
    // The following settlement contracts are useful for event listening
    settlementContracts: {
      baseSepolia: '0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1', // baseSepolia Dispute Game Factory
      optimismSepolia: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1', // optimismSepolia Dispute Game Factory
      // arbitrumSepolia: '0xd80810638dbDF9081b72C1B33c65375e807281C8', // arbitrumSepolia Rollup Admin Contract
    },
  },
  optimismSepolia: {
    network: 'optimism-sepolia',
    chainId: networkIds.optimismSepolia,
    intentSourceAddress: '0x4Ce3dba6598B4c1197f13680804808f867FDc044',
    proverContractAddress: '0xb31Fd140643dbD868E7732EECB5aC9C859348eb9',
    inboxAddress: '0xE855D08e3798AA174155e8f8684d955056Fe6c8D',
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
        network: 'sepolia',
        id: networkIds.sepolia,
        contract: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
      },
    },
    // The following destination chains are useful for proving
    // destinationChains: [
    //   84532, // baseSepolia
    //   421614, // arbitrumSepolia
    // ],
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  baseSepolia: {
    network: 'base-sepolia',
    chainId: networkIds.baseSepolia,
    intentSourceAddress: '0x62fd344CE4E0e4c3d9C98D64390cA2739aF9021f',
    proverContractAddress: '0xDDf437F557129f5900b2F9Bd1ca78B2AD90f5630',
    inboxAddress: '0xB857982B58D1F544b47F0CA0a67FDDc893930Dc6',
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
        network: 'sepolia',
        id: networkIds.sepolia,
        // Dispute Game Factory address
        contract: '0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1',
        // Old L2 Ourput Oracle Address
        // contract: '0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254',
      },
    },
    // The following settlement contracts are useful for event listening
    settlementContracts: {},
    // The following destination chains are useful for proving
    // destinationChains: [
    //   11155420, // optimismSepolia
    //   421614, // arbitrumSepolia
    // ],
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
}

export {
  provingMechanisms,
  networkIds,
  intent,
  // enshrined,
  actors,
  networks,
}
