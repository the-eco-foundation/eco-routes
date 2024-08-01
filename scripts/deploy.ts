import { ethers, run, network, upgrades } from 'hardhat'
import { IntentSource, Inbox } from '../typechain-types'
import { setTimeout } from 'timers/promises'
// import { getAddress } from 'ethers'
import c from '../config/testnet/config'

const networkName = network.name

console.log('Deploying to Network: ', networkName)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const proverFactory = await ethers.getContractFactory('Prover')
  const prover = await upgrades.deployProxy(proverFactory, [deployer.address], {
    initializer: 'initialize',
    kind: 'uups',
  })
  console.log('prover proxy deployed to:', await prover.getAddress())
  console.log(
    'prover implementation deployed to: ',
    await upgrades.erc1967.getImplementationAddress(await prover.getAddress()),
  )

  await prover.setChainConfiguration(
    c.baseSepolia.chainId,
    1,
    c.sepolia.chainId,
    c.sepolia.settlementContract.baseSepolia,
    c.baseSepolia.l1BlockAddress,
    c.baseSepolia.outputRootVersionNumber,
  )

  // optimismSepolia Config
  await prover.setChainConfiguration(
    c.optimismSepolia.chainId,
    2,
    c.sepolia.chainId,
    c.sepolia.settlementContract.optimismSepolia,
    c.optimismSepolia.l1BlockAddress,
    c.optimismSepolia.outputRootVersionNumber,
  )
  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await setTimeout(30000)
      await run('verify:verify', {
        address: await prover.getAddress(),
        // constructorArguments: [l1BlockAddressSepolia, deployer.address],
      })
      console.log('prover proxy verified at:', await prover.getAddress())
      await run('verify:verify', {
        address: await upgrades.erc1967.getImplementationAddress(
          await prover.getAddress(),
        ),
        // constructorArguments: [l1BlockAddressSepolia, deployer.address],
      })
      console.log(
        'prover implementation verified at:',
        await prover.getAddress(),
      )
    }
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }

  const intentSourceFactory = await ethers.getContractFactory('IntentSource')
  const intentSource: IntentSource = await intentSourceFactory.deploy(
    await prover.getAddress(),
    1000,
    c.intentSourceCounter,
  )
  console.log('intentSource deployed to:', await intentSource.getAddress())

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await setTimeout(30000)
      await run('verify:verify', {
        address: await intentSource.getAddress(),
        constructorArguments: [
          await prover.getAddress(),
          1000,
          c.intentSourceCounter,
        ],
      })
    }
    console.log('intentSource verified at:', await intentSource.getAddress())
  } catch (e) {
    console.log(`Error verifying intentSoruc`, e)
  }

  const inboxFactory = await ethers.getContractFactory('Inbox')

  const inbox: Inbox = await inboxFactory.deploy()
  console.log('Inbox deployed to:', await inbox.getAddress())

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await setTimeout(30000)
      await run('verify:verify', {
        address: await inbox.getAddress(),
        constructorArguments: [],
      })
    }
    console.log('Inbox verified at:', await inbox.getAddress())
  } catch (e) {
    console.log(`Error verifying inbox`, e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
