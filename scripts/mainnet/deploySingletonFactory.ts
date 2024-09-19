import { ethers, run, network } from 'hardhat'
import { IntentSource, Inbox, SingletonFactory } from '../../typechain-types'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
// import c from '../config/testnet/config'
// import networks from '../config/testnet/config';
import { networks, actors } from '../../config/mainnet/config'

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
const salt = ethers.keccak256(ethers.toUtf8Bytes('PROD'))

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
  const singletonFactory: SingletonFactory = await ethers.getContractAt(
    'SingletonFactory',
    singletonFactoryAddress,
  )

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
  const proverDeployTx = await proverFactory.getDeployTransaction([
    baseChainConfiguration,
    optimismChainConfiguration,
  ])
  let receipt = await singletonFactory.deploy(proverDeployTx.data, salt)
  console.log('Prover deployed in tx with hash: ', receipt.hash)

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSourceDeployTx = await intentSourceFactory.getDeployTransaction(
    minimumDuration,
    counter,
  )
  receipt = await singletonFactory.deploy(intentSourceDeployTx.data, salt)
  console.log('intentSource deployed in tx with hash: ', receipt.hash)

  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inboxDeployTx = await inboxFactory.getDeployTransaction(
    actors.inboxOwner,
    false,
    [actors.solver],
  )
  receipt = await singletonFactory.deploy(inboxDeployTx.data, salt)
  console.log('inbox deployed in tx with hash: ', receipt.hash)

  //  having trouble here since i can't figure out how to get the address of the inbox contract (or any of these deployed contracts) programatically.
  //   const inboxOwnerSigner = await new ethers.Wallet(
  //     process.env.INBOX_OWNER_PRIVATE_KEY || '0x' + '11'.repeat(32),
  //     ethers.getDefaultProvider(networkName),
  //   )
  //   const setSolverTx = await inbox
  //     .connect(inboxOwnerSigner)
  //     .changeSolverWhitelist(actors.solver, true)
  //   await setSolverTx.wait()
  //   console.log('Solver added to whitelist:', actors.solver)

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address

  // also having trouble with this since cant get contract addresses
  //   if (network.name !== 'hardhat') {
  //     console.log('Waiting for 30 seconds for Bytecode to be on chain')
  //     await setTimeout(30000)
  //     try {
  //       await run('verify:verify', {
  //         address: await prover.getAddress(),
  //         // constructorArguments: [l1BlockAddressSepolia, deployer.address],
  //         constructorArguments: [
  //           [baseChainConfiguration, optimismChainConfiguration],
  //         ],
  //       })
  //     } catch (e) {
  //       console.log(`Error verifying prover`, e)
  //     }
  //     try {
  //       await run('verify:verify', {
  //         address: await intentSource.getAddress(),
  //         constructorArguments: [minimumDuration, counter],
  //       })
  //       console.log('intentSource verified at:', await intentSource.getAddress())
  //     } catch (e) {
  //       console.log(`Error verifying intentSource`, e)
  //     }
  //     try {
  //       await run('verify:verify', {
  //         address: await inbox.getAddress(),
  //         constructorArguments: [deployer.address, false, [actors.solver]],
  //       })
  //       console.log('Inbox verified at:', await inbox.getAddress())
  //     } catch (e) {
  //       console.log(`Error verifying inbox`, e)
  //     }
  //   }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
