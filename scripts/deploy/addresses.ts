import * as fs from 'fs'
import * as path from 'path'

interface AddressBook {
  [network: string]: {
    [key: string]: string
  }
}

// const filePath = path.join(__dirname, 'addresses.ts');
const jsonFilePath = path.join(__dirname, '../../build/jsonAddresses.json')

export function updateAddresses(network: string, key: string, value: string) {
  let addresses: AddressBook = {}

  if (fs.existsSync(jsonFilePath)) {
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
    addresses = JSON.parse(fileContent)
  }
  addresses[network] = addresses[network] || {}
  addresses[network][key] = value
  fs.writeFileSync(jsonFilePath, JSON.stringify(addresses), 'utf8')
}
