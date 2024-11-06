import * as fs from 'fs'
import * as path from 'path'

const packageJsonPath = path.join(__dirname, '../../package.json')
const outputPath = path.join(__dirname, '../../build/package.json')
console.log('start package json generation')
fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err)
    return
  }

  const packageJson = JSON.parse(data)
  // const rimrafVersion = packageJson.devDependencies.rimraf
  // const deps = packageJson.dependencies

  // delete packageJson.dependencies
  delete packageJson.devDependencies
  delete packageJson.scripts
  delete packageJson.files
  delete packageJson.engines

  // packageJson.scripts = {
  //   "build": "tsc",
  //   "clean": "rimraf dist",
  //   "prepack": "yarn clean && yarn build"
  // }

  // packageJson.dependencies = deps
  // packageJson.devDependencies = {
  //   "rimraf": rimrafVersion
  // }

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
