import { deployViemContracts, deployViemFull } from '../viem_deploy/deployViemContracts'
import { deleteAddressesJson, transformAddresses } from './addresses'
import { addressesToCVS } from './csv'

async function main() {
  // await deployViemContracts(sepoliaDep)
  await deployViemFull()
  // transformAddresses()
  // addressesToCVS()
  // deleteAddressesJson()
}

main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
