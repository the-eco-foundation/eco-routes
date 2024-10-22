import { ethers, run, network } from 'hardhat'
import { Inbox } from '../../typechain-types'
import { setTimeout } from 'timers/promises'
import { networks, actors } from '../../config/testnet/config'
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''

const networkName = network.name
console.log('Deploying to Network: ', network.name)
let deployNetwork: any
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
      networks.optimismSepolia.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.optimismSepolia.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.optimismSepolia.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}

const ecoTestnetChainConfiguration = {
  chainId: networks.ecoTestnet.chainId, // chainId
  chainConfiguration: {
    provingMechanism: networks.ecoTestnet.proving.mechanism, // provingMechanism
    settlementChainId: networks.ecoTestnet.proving.settlementChain.id, // settlementChainId
    settlementContract: networks.ecoTestnet.proving.settlementChain.contract, // settlementContract e.g DisputGameFactory or L2OutputOracle.
    blockhashOracle: networks.ecoTestnet.proving.l1BlockAddress, // blockhashOracle
    outputRootVersionNumber:
      networks.ecoTestnet.proving.outputRootVersionNumber, // outputRootVersionNumber
  },
}
let counter: number = 0
let minimumDuration: number = 0
switch (networkName) {
  case 'baseSepolia':
    counter = networks.baseSepolia.intentSource.counter
    minimumDuration = networks.baseSepolia.intentSource.minimumDuration
    deployNetwork = networks.baseSepolia
    break
  case 'optimismSepolia':
    counter = networks.optimismSepolia.intentSource.counter
    minimumDuration = networks.optimismSepolia.intentSource.minimumDuration
    deployNetwork = networks.optimismSepolia
    break
  case 'optimismSepoliaBlockscout':
    counter = networks.optimismSepolia.intentSource.counter
    minimumDuration = networks.optimismSepolia.intentSource.minimumDuration
    deployNetwork = networks.optimismSepolia
    break
  case 'ecoTestnet':
    counter = networks.ecoTestnet.intentSource.counter
    minimumDuration = networks.ecoTestnet.intentSource.minimumDuration
    deployNetwork = networks.ecoTestnet
    break
  default:
    counter = 0
    minimumDuration = 0
    break
}
console.log('Counter: ', counter)
console.log('Minimum duration: ', minimumDuration)

const initialSalt: string = 'TESTNET6'

let proverAddress = ''
let intentSourceAddress = '0xD62A91e1d49913C56157b4A4e03a962cEbC5F733'
let inboxAddress = '0x200b2417A9d0F79133C2b05b2C028B8A70392e66'

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

  console.log(`**************************************************`)
  let receipt
  if (proverAddress === '') {
    const proverFactory = await ethers.getContractFactory('Prover')
    const proverTx = await proverFactory.getDeployTransaction([
      baseSepoliaChainConfiguration,
      optimismSepoliaChainConfiguration,
      ecoTestnetChainConfiguration,
    ])
    receipt = await singletonDeployer.deploy(proverTx.data, salt, {
      gasLimit: 5000000,
    })
    // console.log(receipt.blockHash)
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
      gasLimit: 5000000,
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
      gasLimit: 5000000,
    })
    inboxAddress = (
      await singletonDeployer.queryFilter(
        singletonDeployer.filters.Deployed,
        receipt.blockNumber,
      )
    )[0].args.addr

    // on testnet inboxOwner is the deployer, just to make things easier
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
            ecoTestnetChainConfiguration,
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
        constructorArguments: [deployer.address, false, [actors.solver]],
      })
      console.log('Inbox verified at:', inboxAddress)
    } catch (e) {
      console.log(`Error verifying inbox`, e)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
