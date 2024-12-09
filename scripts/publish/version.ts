import { ProtocolVersion } from "../viem_deploy/ProtocolVersion"



async function main() {
  const pv = new ProtocolVersion('0.0.509')
  pv.updateVersionInSolidityFiles()
  const chains = await pv.getDeployChains()
  console.log(chains)
  // const version = await ver.getPublishedVersion('beta')
  // console.log(version)
}

main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })

