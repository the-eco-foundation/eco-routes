import { ethers, run, network } from 'hardhat'
import { IntentSource, Inbox } from '../../typechain-types'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks, actors } from '../../config/mainnet/config'

const networkName = network.name
console.log('Deploying to Network: ', network.name)
let counter: number = 0
let minimumDuration: number = 0
switch (networkName) {
  case 'base':
    counter = networks.base.intentSource.counter
    minimumDuration = networks.base.intentSource.minimumDuration
    break
  case 'optimism':
    counter = networks.optimism.intentSource.counter
    minimumDuration = networks.optimism.intentSource.minimumDuration
    break
  default:
    counter = 0
    minimumDuration = 0
    break
}
console.log('Counter: ', counter)

console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  console.log(`**************************************************`)
  const baseChainConfiguration = {
    chainId: networks.base.chainId, // chainId
    chainConfiguration: {
      provingMechanism: networks.base.proving.mechanism, // provingMechanism
      settlementChainId: networks.base.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.base.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
      blockhashOracle: networks.base.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber: networks.base.proving.outputRootVersionNumber, // outputRootVersionNumber
    },
  }

  const optimismChainConfiguration = {
    chainId: networks.optimism.chainId, // chainId
    chainConfiguration: {
      provingMechanism: networks.optimism.proving.mechanism, // provingMechanism
      settlementChainId: networks.optimism.proving.settlementChain.id, // settlementChainId
      settlementContract: networks.optimism.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.     blockhashOracle: networks.optimism.proving.l1BlockAddress,
      blockhashOracle: networks.optimism.proving.l1BlockAddress, // blockhashOracle
      outputRootVersionNumber:
        networks.optimism.proving.outputRootVersionNumber, // outputRootVersionNumber
    },
  }

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover = await proverFactory.deploy([
    baseChainConfiguration,
    optimismChainConfiguration,
  ])
  console.log('prover implementation deployed to: ', await prover.getAddress())

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSource: IntentSource = await intentSourceFactory.deploy(
    minimumDuration,
    counter,
  )
  console.log('intentSource deployed to:', await intentSource.getAddress())

  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inbox: Inbox = await inboxFactory.deploy(actors.inboxOwner, false, [
    actors.solver,
  ])
  console.log('Inbox deployed to:', await inbox.getAddress())

  const inboxOwnerSigner = await new ethers.Wallet(
    process.env.INBOX_OWNER_PRIVATE_KEY || '0x' + '11'.repeat(32),
    ethers.getDefaultProvider(networkName),
  )
  const setSolverTx = await inbox
    .connect(inboxOwnerSigner)
    .changeSolverWhitelist(actors.solver, true)
  await setSolverTx.wait()
  console.log('Solver added to whitelist:', actors.solver)

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  if (network.name !== 'hardhat') {
    console.log('Waiting for 30 seconds for Bytecode to be on chain')
    await setTimeout(30000)
    try {
      await run('verify:verify', {
        address: await prover.getAddress(),
        // constructorArguments: [l1BlockAddressSepolia, deployer.address],
        constructorArguments: [
          [baseChainConfiguration, optimismChainConfiguration],
        ],
      })
    } catch (e) {
      console.log(`Error verifying prover`, e)
    }
    try {
      await run('verify:verify', {
        address: await intentSource.getAddress(),
        constructorArguments: [minimumDuration, counter],
      })
      console.log('intentSource verified at:', await intentSource.getAddress())
    } catch (e) {
      console.log(`Error verifying intentSource`, e)
    }
    try {
      await run('verify:verify', {
        address: await inbox.getAddress(),
        constructorArguments: [deployer.address, false, [actors.solver]],
      })
      console.log('Inbox verified at:', await inbox.getAddress())
    } catch (e) {
      console.log(`Error verifying inbox`, e)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
