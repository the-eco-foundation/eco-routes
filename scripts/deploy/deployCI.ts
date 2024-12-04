import { deployViemContracts } from '../viem_deploy/deployViemContracts'
import { deleteAddressesJson, transformAddresses } from './addresses'
import { addressesToCVS } from './csv'
// import { deployViemContracts } from '../viem_deploy/deploy'
import hre from "hardhat";
async function main() {
  await deployViemContracts()
  // transformAddresses()
  // addressesToCVS()
  // deleteAddressesJson()
  // const buildinfo = await hre.artifacts.getBuildInfo("contracts/Prover.sol:Prover")
  // console.log(buildinfo)
}

main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
