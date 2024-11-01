import * as fs from 'fs'
import * as path from 'path'
/**
 * This script reads the JSON files in the contracts/build/contracts/abi directory
 * and generates TypeScript files with the ABI of the contracts. Needed to export as a
 * const array for viem's type system to work correctly.
 */
type AbiFile = {
  abi: any[]
  contractName: string
  sourceName: string
}

// Directory containing the JSON files
const abiParentDir = path.join(__dirname, '../../build/src/abi')
const dirs = [
  path.join(abiParentDir, '/contracts'),
  path.join(abiParentDir, '/interfaces'),
]
let mainIndexContent = ''

dirs.forEach((abiDir) => {
  console.log(abiDir)
  // Read through the directory and get all .json files
  const jsonFiles = fs
    .readdirSync(abiDir)
    .filter((file) => file.endsWith('.json'))

  // Read each JSON file and parse its content
  const data = jsonFiles.reduce((acc: AbiFile[], file) => {
    const filePath = path.join(abiDir, file)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const abiFile = JSON.parse(fileContent)
    acc.push({
      abi: abiFile.abi,
      contractName: abiFile.contractName,
      sourceName: abiFile.sourceName,
    })
    fs.unlinkSync(filePath)
    return acc
  }, [])

  let indexContent = ''
  const indexFilePath = path.join(abiDir, 'index.ts')
  // Generate the TypeScript code
  data.forEach((abiFile: AbiFile) => {
    const name = `${abiFile.contractName}Abi`
    indexContent += `export * from './${abiFile.contractName}'\n`
    const outputContent = `export const ${name} = ${JSON.stringify(abiFile.abi, null, 2)} as const\n`
    const filePath = path.join(abiDir, `${abiFile.contractName}.ts`)
    fs.writeFileSync(filePath, outputContent, 'utf-8')
  })

  fs.writeFileSync(indexFilePath, indexContent, 'utf-8')
  mainIndexContent += `export * from './${abiDir.split('/').pop()}'\n`
})

fs.writeFileSync(path.join(abiParentDir, 'index.ts'), mainIndexContent, 'utf-8')
