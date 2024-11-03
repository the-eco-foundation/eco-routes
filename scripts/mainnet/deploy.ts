import { ethers, run, network } from 'hardhat'
import { Inbox } from '../../typechain-types'
import { setTimeout } from 'timers/promises'
import { networks, actors } from '../../config/mainnet/config'
import { updateAddresses } from '../deploy/addresses'

const networkName = network.name
console.log('Deploying to Network: ', network.name)
let deployNetwork: any
let counter: number = 0
let minimumDuration: number = 0
let localGasLimit: number = 0
switch (networkName) {
  case 'base':
    deployNetwork = networks.base
    break
  case 'optimism':
    deployNetwork = networks.optimism
    break
  case 'helix':
    deployNetwork = networks.helix
    break
  case 'arbitrum':
    deployNetwork = networks.arbitrum
    break
  case 'mantle':
    deployNetwork = networks.mantle
}

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
    outputRootVersionNumber: networks.optimism.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
const helixChainConfiguration = {
  chainId: networks.helix.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.helix.proving.mechanism, // provingMechanism
    settlementChainId: networks.helix.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.helix.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.helix.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.helix.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
//   const arbitrumChainConfiguration = {
//     chainId: networks.arbitrum.chainId, // chainId
//     chainConfiguration: {
//       provingMechanism: networks.arbitrum.proving.mechanism, // provingMechanism
//       settlementChainId: networks.arbitrum.proving.settlementChain.id, // settlementChainId
//       settlementContract: networks.arbitrum.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
//       blockhashOracle: networks.arbitrum.proving.l1BlockAddress, // blockhashOracle
//       outputRootVersionNumber:
//         networks.arbitrum.proving.outputRootVersionNumber, // outputRootVersionNumber
//     },
//   }
const mantleChainConfiguration = {
  chainId: networks.mantle.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.mantle.proving.mechanism, // provingMechanism
    settlementChainId: networks.mantle.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.mantle.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.mantle.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber: networks.mantle.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
const initialSalt: string = 'HANDOFF0'
// const initialSalt: string = 'PROD'

<<<<<<< HEAD
let proverAddress = ''
let intentSourceAddress = ''
let inboxAddress = ''
if (process.env.DEPLOY_CI === 'true') {
  console.log('Deploying for CI')
}

=======
let proverAddress: string = ''
let intentSourceAddress: string = '0xa6B316239015DFceAC5bc9c19092A9B6f59ed905'
let inboxAddress: string = '0xfB853672cE99D9ff0a7DE444bEE1FB2C212D65c0'
let hyperProverAddress: string = '0xB1017F865c6306319C65266158979278F7f50118'
>>>>>>> origin/ED-4282
const isSolvingPublic = initialSalt !== 'PROD'
console.log(
  `Deploying with salt: ethers.keccak256(ethers.toUtf8bytes(${initialSalt})`,
)
const salt = ethers.keccak256(ethers.toUtf8Bytes(initialSalt))

console.log('Deploying to Network: ', network.name)

// console.log(network)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const singletonDeployer = await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )
  localGasLimit = deployNetwork.gasLimit
  counter = deployNetwork.intentSource.counter
  minimumDuration = deployNetwork.intentSource.minimumDuration
  console.log('local')

  console.log(`**************************************************`)

  let receipt
  if (proverAddress === '') {
    const proverFactory = await ethers.getContractFactory('Prover')
    const proverTx = await proverFactory.getDeployTransaction([
      baseChainConfiguration,
      optimismChainConfiguration,
      helixChainConfiguration,
      //   arbitrumChainConfiguration,
      mantleChainConfiguration,
    ])
    receipt = await singletonDeployer.deploy(proverTx.data, salt, {
      gasLimit: localGasLimit,
    })
    proverAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr
  }
  console.log('prover implementation deployed to: ', proverAddress)
  updateAddresses(networkName, 'Prover', proverAddress)
  if (intentSourceAddress === '') {
    const intentSourceFactory = await ethers.getContractFactory('IntentSource')
    const intentSourceTx = await intentSourceFactory.getDeployTransaction(
      minimumDuration,
      counter,
    )
    receipt = await singletonDeployer.deploy(intentSourceTx.data, salt, {
      gasLimit: localGasLimit / 2,
    })
    intentSourceAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr
  }
  console.log('intentSource deployed to:', intentSourceAddress)
<<<<<<< HEAD
  updateAddresses(networkName, 'IntentSource', intentSourceAddress)

=======
>>>>>>> origin/ED-4282
  if (inboxAddress === '') {
    const inboxFactory = await ethers.getContractFactory('Inbox')

    const inboxTx = await inboxFactory.getDeployTransaction(
      actors.deployer,
      isSolvingPublic,
      [actors.solver],
    )
    receipt = await singletonDeployer.deploy(inboxTx.data, salt, {
      gasLimit: localGasLimit / 2,
    })
    await receipt.wait()
    inboxAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr

    const inboxOwnerSigner = deployer

    const inbox: Inbox = await ethers.getContractAt(
      'Inbox',
      inboxAddress,
      inboxOwnerSigner,
    )

    inbox
      .connect(inboxOwnerSigner)
      .setMailbox(deployNetwork.hyperlaneMailboxAddress)
  }
  console.log('Inbox deployed to:', inboxAddress)
  updateAddresses(networkName, 'Inbox', inboxAddress)

  if (hyperProverAddress === '' && inboxAddress !== '') {
    const hyperProverFactory = await ethers.getContractFactory('HyperProver')

    const hyperProverTx = await hyperProverFactory.getDeployTransaction(
      deployNetwork.hyperlaneMailboxAddress,
      inboxAddress,
    )

    receipt = await singletonDeployer.deploy(hyperProverTx.data, salt, {
      gasLimit: localGasLimit / 4,
    })
    await receipt.wait()
    console.log('hyperProver deployed')

    hyperProverAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr

    console.log(`hyperProver deployed to: ${hyperProverAddress}`)
  }

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  if (network.name !== 'hardhat') {
    console.log('Waiting for 30 seconds for Bytecode to be on chain')
    await setTimeout(30000)
    try {
      await run('verify:verify', {
        address: proverAddress,
        constructorArguments: [
          [
            baseChainConfiguration,
            optimismChainConfiguration,
            helixChainConfiguration,
            // arbitrumChainConfiguration,
            mantleChainConfiguration,
          ],
        ],
      })
      console.log('prover verified at:', proverAddress)
    } catch (e) {
      console.log(`Error verifying prover`, e)
    }
    try {
      await run('verify:verify', {
        address: intentSourceAddress,
        constructorArguments: [minimumDuration, counter],
      })
      console.log('intentSource verified at:', intentSourceAddress)
    } catch (e) {
      console.log(`Error verifying intentSource`, e)
    }
    try {
      await run('verify:verify', {
        address: inboxAddress,
        constructorArguments: [
          actors.inboxOwner,
          isSolvingPublic,
          [actors.solver],
        ],
      })
      console.log('Inbox verified at:', inboxAddress)
    } catch (e) {
      console.log(`Error verifying inbox`, e)
    }
    try {
      await run('verify:verify', {
        address: hyperProverAddress,
        constructorArguments: [
          deployNetwork.hyperlaneMailboxAddress,
          inboxAddress,
        ],
      })
      console.log('hyperProver verified at:', hyperProverAddress)
    } catch (e) {
      console.log(`Error verifying hyperProver`, e)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
