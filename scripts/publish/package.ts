import * as fs from 'fs'
import * as path from 'path'

const packageJsonPath = path.join(__dirname, '../../package.json')
const outputPath = path.join(__dirname, '../../contracts/build/package.json')

fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err)
    return
  }

  const packageJson = JSON.parse(data)
  delete packageJson.devDependencies
  delete packageJson.scripts
  delete packageJson.files

  fs.writeFile(
    outputPath,
    JSON.stringify(packageJson, null, 2),
    'utf8',
    (err) => {
      if (err) {
        console.error('Error writing package.json:', err)
        return
      }

      console.log('package.json has been created successfully.')
    },
  )
})
