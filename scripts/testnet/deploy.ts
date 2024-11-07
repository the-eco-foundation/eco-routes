import { ethers, run, network } from 'hardhat'
import { Inbox } from '../../typechain-types'
import { setTimeout } from 'timers/promises'
import { networks, actors } from '../../config/testnet/config'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const networkName = network.name
console.log('Deploying to Network: ', network.name)
let deployNetwork: any
let counter: number = 0
let minimumDuration: number = 0
let localGasLimit: number = 0
switch (networkName) {
  case 'baseSepolia':
    deployNetwork = networks.baseSepolia
    break
  case 'optimismSepolia':
    deployNetwork = networks.optimismSepolia
    break
  case 'optimismSepoliaBlockscout':
    deployNetwork = networks.optimismSepolia
    break
  case 'ecoTestnet':
    deployNetwork = networks.ecoTestnet
    break
  case 'arbitrumSepolia':
    deployNetwork = networks.arbitrumSepolia
    break
  case 'mantleSepolia':
    deployNetwork = networks.mantleSepolia
    break
}
const baseSepoliaChainConfiguration = {
  chainId: networks.baseSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.baseSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.baseSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.baseSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.baseSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.baseSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

const optimismSepoliaChainConfiguration = {
  chainId: networks.optimismSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.optimismSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.optimismSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract:
      networks.optimismSepolia.proving.settlementChain.contract, // settlementContract e.g DisputeGameFactory or L2OutputOracle.
    blockhashOracle: networks.optimismSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.optimismSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

// const ecoTestnetChainConfiguration = {
//   chainId: networks.ecoTestnet.chainId, // chainId
//   chainConfiguration: {
//     provingMechanism: networks.ecoTestnet.proving.mechanism, // provingMechanism
//     settlementChainId: networks.ecoTestnet.proving.settlementChain.id, // settlementChainId
//     settlementContract: networks.ecoTestnet.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
//     blockhashOracle: networks.ecoTestnet.proving.l1BlockAddress, // blockhashOracle
//     outputRootVersionNumber:
//       networks.ecoTestnet.proving.outputRootVersionNumber, // outputRootVersionNumber
//   },
// }

const mantleSepoliaChainConfiguration = {
  chainId: networks.mantleSepolia.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.mantleSepolia.proving.mechanism, // provingMechanism
    settlementChainId: networks.mantleSepolia.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.mantleSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.mantleSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.mantleSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
// const arbitrumSepoliaChainConfiguration = {
//   chainId: networks.arbitrumSepolia.chainId, // chainId
//   chainConfiguration: {
//     provingMechanism: networks.arbitrumSepolia.proving.mechanism, // provingMechanism
//     settlementChainId: networks.arbitrumSepolia.proving.settlementChain.id, // settlementChainId
//     settlementContract:
//       networks.arbitrumSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
//     blockhashOracle: networks.arbitrumSepolia.proving.l1BlockAddress, // blockhashOracle
//     outputRootVersionNumber:
//       networks.arbitrumSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
//   },
// }
const initialSalt: string = 'nishaad0'
// const initialSalt: string = 'PROD'

let proverAddress: string = ''
let intentSourceAddress: string = ''
let inboxAddress: string = ''
let hyperProverAddress: string = ''
console.log(
  `Deploying with salt: ethers.keccak256(ethers.toUtf8bytes(${initialSalt})`,
)
const salt = ethers.keccak256(ethers.toUtf8Bytes(initialSalt))

console.log('Deploying to Network: ', network.name)

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
  console.log('localGasLimit:', localGasLimit)

  console.log(`**************************************************`)
  let receipt
  if (proverAddress === '') {
    const proverFactory = await ethers.getContractFactory('Prover')
    const proverTx = await proverFactory.getDeployTransaction([
      baseSepoliaChainConfiguration,
      optimismSepoliaChainConfiguration,
      //   ecoTestnetChainConfiguration,
      //   arbitrumSepoliaChainConfiguration,
      mantleSepoliaChainConfiguration,
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

  if (inboxAddress === '') {
    const inboxFactory = await ethers.getContractFactory('Inbox')

    // on testnet inboxOwner is the deployer, just to make things easier
    const inboxTx = await inboxFactory.getDeployTransaction(
      actors.deployer,
      true,
      [],
    )
    receipt = await singletonDeployer.deploy(inboxTx.data, salt, {
      gasLimit: localGasLimit / 2,
    })
    inboxAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr
  }
  console.log('Inbox deployed to:', inboxAddress)

  if (hyperProverAddress === '' && inboxAddress !== '') {
    const hyperProverFactory = await ethers.getContractFactory('HyperProver')

    const hyperProverTx = await hyperProverFactory.getDeployTransaction(
      deployNetwork.hyperlaneMailboxAddress,
      inboxAddress,
    )

    receipt = await singletonDeployer.deploy(hyperProverTx.data, salt, {
      gasLimit: localGasLimit,
    })
    await receipt.wait()

    hyperProverAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr
  }
  console.log(`hyperProver deployed to: ${hyperProverAddress}`)

  // on testnet inboxOwner is the deployer, just to make things easier
  const inboxOwnerSigner = deployer
  const inbox: Inbox = await ethers.getContractAt(
    'Inbox',
    inboxAddress,
    inboxOwnerSigner,
  )

  receipt = await inbox
    .connect(inboxOwnerSigner)
    .setMailbox(deployNetwork.hyperlaneMailboxAddress)
  await receipt.wait()
  console.log('Inbox mailbox set')

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  if (network.name !== 'hardhat') {
    console.log('Waiting for 30 seconds for Bytecode to be on chain')
    await setTimeout(30000)
    try {
      await run('verify:verify', {
        address: proverAddress,
        // constructorArguments: [l1BlockAddressSepolia, deployer.address],
        constructorArguments: [
          [
            baseSepoliaChainConfiguration,
            optimismSepoliaChainConfiguration,
            // ecoTestnetChainConfiguration,
            //   arbitrumSepoliaChainConfiguration,
            mantleSepoliaChainConfiguration,
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
        constructorArguments: [deployer.address, true, []],
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
