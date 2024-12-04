import { deployViemContracts, deployViemFull } from './deployViemContracts'

async function main() {
  await deployViemContracts()
  // await deployViemFull()
}
main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
