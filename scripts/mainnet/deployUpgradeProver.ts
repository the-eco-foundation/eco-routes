import { ethers, run, network, upgrades } from 'hardhat'

console.log('Deploying to Network: ', network.name)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)
  let proverProxyAddress
  if (network.name === 'base') {
    proverProxyAddress = '0x5cAC9aB2472BE60271622F81d7961c96078b685D' // base Prover
  } else {
    proverProxyAddress = '0xC2E2147b859e1C3907D880779045dEFACC5d1392' // Optimism Prover
  }
  const proverNew = await ethers.getContractFactory('Prover')
  const prover = await upgrades.upgradeProxy(proverProxyAddress, proverNew)
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
