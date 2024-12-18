import core from '@actions/core'
import { ProtocolDeploy } from './ProtocolDeploy'

async function main() {
  const deploy = new ProtocolDeploy()
  await deploy.deployFullNetwork()
}
main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
    core.setFailed(err.message)
  })
