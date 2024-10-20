export namespace actors {
  export let keys
  // Private Keys

  export async function init() {
    keys = {
      DEPLOYER: process.env.DEPLOYER_PRIVATE_KEY || '',
      INTENT_CREATOR: process.env.INTENT_CREATOR_PRIVATE_KEY || '',
      SOLVER: process.env.SOLVER_PRIVATE_KEY || '',
      CLAIMANTY: process.env.CLAIMANT_PRIVATE_KEY || '',
      PROVER: process.env.PROVER_PRIVATE_KEY || '',
    }
  }
}
