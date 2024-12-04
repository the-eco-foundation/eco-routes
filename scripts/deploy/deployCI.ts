import { deployViemContracts } from '../viem_deploy/deployViemContracts'
import { deleteAddressesJson, transformAddresses } from './addresses'
import { addressesToCVS } from './csv'

async function main() {
  await deployViemContracts()
  transformAddresses()
  addressesToCVS()
  deleteAddressesJson()
}

main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
