import { Hex } from 'viem'
import Create2DeployerJson from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/deploy/Create2Deployer.sol/Create2Deployer.json'
import Create3DeployerJson from '@axelar-network/axelar-gmp-sdk-solidity/artifacts/contracts/deploy/Create3Deployer.sol/Create3Deployer.json'

export const CREATE2_DEPLOYER_ADDRESS: Hex =
  '0x98b2920d53612483f91f12ed7754e51b4a77919e'
export const CREATE3_DEPLOYER_ADDRESS: Hex =
  '0x6513Aedb4D1593BA12e50644401D976aebDc90d8'

export const Create2Deployer = {
  constractName: Create2DeployerJson.contractName,
  address: CREATE2_DEPLOYER_ADDRESS,
  abi: Create2DeployerJson.abi,
}

export const Create3Deployer = {
  constractName: Create3DeployerJson.contractName,
  address: CREATE3_DEPLOYER_ADDRESS,
  abi: Create3DeployerJson.abi,
}
