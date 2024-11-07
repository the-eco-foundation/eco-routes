import { ethers, run, network } from 'hardhat'

console.log('Deploying to Network: ', network.name)

async function main() {
  const localGasLimit = 250000000000
  const [deployer] = await ethers.getSigners()
  const salt = ethers.keccak256(ethers.toUtf8Bytes('TESTNET-MANTLE'))

  // Get the singleton deployer
  const singletonDeployer = await ethers.getContractAt(
    'Deployer',
    '0xfc91Ac2e87Cc661B674DAcF0fB443a5bA5bcD0a3',
  )
  console.log('Deploying contracts with the account:', deployer.address)
  console.log(
    'Deploying contracts with the singleton deployer:',
    await singletonDeployer.getAddress(),
  )
  console.log(`**************************************************`)

  const TestERC20Factory = await ethers.getContractFactory('TestERC20')
  // Deploy TestERC20Factory
  const testERC20Tx = await TestERC20Factory.getDeployTransaction(
    'EcoTestUSDC',
    'eUSDc',
  )
  const testERC20Receipt = await singletonDeployer.deploy(
    testERC20Tx.data,
    salt,
    {
      gasLimit: localGasLimit,
    },
  )
  await testERC20Receipt.wait()
  console.log('testERC20 deployed')

  const testERC20Address = (
    await singletonDeployer.queryFilter(
      singletonDeployer.filters.Deployed,
      testERC20Receipt.blockNumber,
    )
  )[0].args.addr

  console.log(`testERC20 deployed to: ${testERC20Address}`)

  try {
    await run('verify:verify', {
      address: testERC20Address,
      constructorArguments: ['EcoTestUSDC', 'eUSDc'],
    })
    console.log('testERC20 verified at:', testERC20Address)
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }

  console.log('Done!')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
