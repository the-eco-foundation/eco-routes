import {  ProtocolDeploy } from './ProtocolDeploy'

async function main() {
  const deploy = new ProtocolDeploy()
  await deploy.deployFullNetwork()
  // await deployViemContracts()
  // await deployViemFull()
}
main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
