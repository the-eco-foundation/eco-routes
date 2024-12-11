import { ProtocolDeploy } from '../viem_deploy/ProtocolDeploy'
import { deleteAddressesJson, transformAddresses } from './addresses'
import { addressesToCVS } from './csv'

async function main() {
  const deploy = new ProtocolDeploy()
  await deploy.deployFullNetwork(true)
  transformAddresses()
  addressesToCVS()
}

main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
