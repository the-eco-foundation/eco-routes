import { deleteAddressesJson, transformAddresses } from './addresses'
import { deployContracts } from './ci'
import { addressesToCVS } from './csv'

deployContracts()
transformAddresses()
addressesToCVS()
deleteAddressesJson()
