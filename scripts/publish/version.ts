import { ProtocolVersion } from '../viem_deploy/ProtocolVersion'

async function main() {
  const pv = new ProtocolVersion()
  pv.updateProjectVersion()
  const chains = await pv.getDeployChains()
  // console.log(
  //   'Chains going to be deployed: ',
  //   chains.reduce((acc, chain) => {
  //     acc += chain.id + ','
  //     return acc
  //   }, ''),
  // )
}

main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
