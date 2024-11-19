import { ethers, network } from 'hardhat'
import { SingletonFactory } from '../typechain-types'

const singletonFactoryAddress = '0xce0042B868300000d44A59004Da54A005ffdcf9f'

console.log('Deploying to Network: ', network.name)
async function deploySingletonFactoryDeployer() {
  const deployerSalt = ethers.keccak256(ethers.toUtf8Bytes('ECO'))
  //   const deployerSalt =
  //     '0xe0391e627a5766ef56109c7c98e0542c6e96a116720d7c626119be5b67e1813d'
  const singletonFactory: SingletonFactory = await ethers.getContractAt(
    'SingletonFactory',
    singletonFactoryAddress,
  )
  const deployerTx = await (
    await ethers.getContractFactory('Deployer')
  ).getDeployTransaction(ethers.ZeroAddress)

  const receipt = await singletonFactory.deploy(deployerTx.data, deployerSalt)
  await receipt.wait()
  console.log('singleton deployer deployed! Transaction hash: ', receipt.hash)
}

deploySingletonFactoryDeployer()
