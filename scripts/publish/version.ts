import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'

// Get the GITHUB_REF environment variable
const githubRef = process.env.GITHUB_REF

if (!githubRef) {
  console.error('GITHUB_REF environment variable is not set.')
  process.exit(1)
}

// Check if GITHUB_REF is a tag
const tagPrefix = 'refs/tags/'
if (!githubRef.startsWith(tagPrefix)) {
  console.error('GITHUB_REF is not a tag.')
  process.exit(1)
}

// Extract the tag name
const tagName = githubRef.substring(tagPrefix.length)

// Directory containing Solidity contract files
const contractsDir = path.join(__dirname, '../../contracts')

// Function to update the Version variable in Solidity files
const updateVersionInSolidityFiles = (dir: string, version: string) => {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      updateVersionInSolidityFiles(filePath, version)
    } else if (filePath.endsWith('.sol')) {
      let content = fs.readFileSync(filePath, 'utf8')
      const versionRegex =
        /function version\(\) external pure returns \(string memory\) \{[^}]*\}/
      const newVersionFunction = `function version() external pure returns (string memory) { return "${version}"; }`
      content = content.replace(versionRegex, newVersionFunction)
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`Updated Version in ${filePath}`)
    }
  })
}

// Update the version in package.json
exec(
  `yarn version --new-version ${tagName} --no-git-tag-version`,
  (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(`stdout: ${stdout}`)
    console.error(`stderr: ${stderr}`)
  },
)

// Update the Version variable in all Solidity files
updateVersionInSolidityFiles(contractsDir, tagName)
