import { ProtocolDeploy } from '../viem_deploy/ProtocolDeploy'
import { ProtocolVersion } from '../viem_deploy/ProtocolVersion'
import { transformAddresses } from './addresses'
import { addressesToCVS } from './csv'

async function main() {
  const pv = new ProtocolVersion()
  const dp = await pv.getDeployChains()
  const deploy = new ProtocolDeploy(dp.chains, { salts: dp.salts })
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
