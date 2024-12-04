import { deployViemContracts } from './deployViemContracts'

async function main() {
  await deployViemContracts()
}
main()
  .then((results) => {
    // console.log('Deployment and verification results:', results)
  })
  .catch((err) => {
    console.error('Error:', err)
  })
