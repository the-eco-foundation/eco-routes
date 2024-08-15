import { ethers, run, network, upgrades } from 'hardhat'

console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const proverProxyAddress = '0x3AAc4C74E2Dd6446370Cc9850ae15e78624f5394'
  const proverL3 = await ethers.getContractFactory('ProverL3')
  const prover = await upgrades.upgradeProxy(proverProxyAddress, proverL3)
  console.log('prover proxy deployed to:', await prover.getAddress())
  console.log(
    'prover implementation deployed to: ',
    await upgrades.erc1967.getImplementationAddress(await prover.getAddress()),
  )

  // adding a try catch as if the contract has previously been deployed will get a
  // verification error when deploying the same bytecode to a new address
  try {
    if (network.name !== 'hardhat') {
      console.log('Waiting for 30 seconds for Bytecode to be on chain')
      await run('verify:verify', {
        address: await upgrades.erc1967.getImplementationAddress(
          await prover.getAddress(),
        ),
      })
      console.log(
        'prover implementation verified at:',
        await prover.getAddress(),
      )
    }
  } catch (e) {
    console.log(`Error verifying prover`, e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
