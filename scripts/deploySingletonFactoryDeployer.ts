import { ethers, network } from 'hardhat'
import { SingletonFactory } from '../typechain-types'

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'

console.log('Deploying to Network: ', network.name)
async function deployDeployer() {
  const deployerSalt = ethers.keccak256(ethers.toUtf8Bytes('ECO'))
  const singletonFactory: SingletonFactory = await ethers.getContractAt(
    'SingletonFactory',
    singletonFactoryAddress,
  )
  const deployerTx = await (
    await ethers.getContractFactory('Deployer')
  ).getDeployTransaction(ethers.ZeroAddress)

  const receipt = await singletonFactory.deploy(deployerTx.data, deployerSalt)
}

async function deploySingletonFactory() {
  const factoryDeployerAccount = '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D'
  const minimumDeployerBalance = ethers.parseEther('0.0247')
  const [signer] = await ethers.getSigners()

  // Check deployer balance
  const deployerBalance = await ethers.provider.getBalance(
    factoryDeployerAccount,
  )
  if (deployerBalance < minimumDeployerBalance) {
    // Fund deployer
    console.log('Funding deployer...', {
      deployerBalance,
      minimumDeployerBalance,
    })
    const fundTx = await signer.sendTransaction({
      to: factoryDeployerAccount,
      value: minimumDeployerBalance - deployerBalance,
    })
    await fundTx.wait()
  } else {
    console.log('Deployer has enough funds', { deployerBalance })
  }

  console.log('Deploying EIP-2470...')

  // Deploy EIP-2470
  const txHash = await ethers.provider.send('eth_sendRawTransaction', [
    '0xf9016c8085174876e8008303c4d88080b90154608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c634300060200331b83247000822470',
  ])

  console.log('EIP-2470 deployed! Transaction hash: ', txHash)
}

deploySingletonFactory()
