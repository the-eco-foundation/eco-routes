import { deleteAddressesJson, transformAddresses } from './addresses'
import { deployContracts } from './ci'

deployContracts()
transformAddresses()
deleteAddressesJson()