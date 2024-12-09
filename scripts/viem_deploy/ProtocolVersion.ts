import * as fs from 'fs'
import * as path from 'path'
import { execCMD } from '../utils'
import semver from 'semver-utils'
import { Chain } from 'viem'
import { DeployChains } from '../viem_deploy/chains'
import pacote from 'pacote'
import PackageJson from '../../package.json'
import csvtojson from 'csvtojson'
import { PRE_SUFFIX } from '../deploy/addresses'
import rimraf, { rimrafSync } from 'rimraf'
import { PublishTag } from '../publish/publish'

// Directory containing Solidity contract files
const contractsDir = path.join(__dirname, '../../contracts')

// Regular expression to verify that a string is a valid SemVer
// default regex from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string  with an optional leading v
const SEMVER_REGEX = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

/**
 * Given a version number MAJOR.MINOR.PATCH, increment the:
 *
 * 1. MAJOR version when you make incompatible API changes
 * 2. MINOR version when you add functionality in a backward compatible manner
 * 3. PATCH version when you make backward compatible bug fixes. This inlcudes
 * partial releases where we add chain support with no new features
 * 
 * Additional labels for pre-release and build metadata are available as extensions to the MAJOR.MINOR.PATCH format.
 */
export class ProtocolVersion {
  // The version of the protocol
  version: semver.SemVer
  packageName: string = PackageJson.name

  constructor(version?: string) {
    this.version = semver.parse(this.verifySemver(version || getGithubTagRef()))
    this.version.release = this.version.release || 'latest'
  }

  async getDeployChains(): Promise<Chain[]> {
    if (true || await this.isPatchUpdate()) {
      const chains = await this.getDeployedChains()
      return chains
    } else {
      return DeployChains
    }
  }
  async getDeployedChains(): Promise<Chain[]> {
    const saveDir = path.join(__dirname, '../../tmp')
    // extract a package into a folder
    const pkg = `${this.packageName}@${this.getReleaseTag()}`
    const { from, resolved, integrity } = await pacote.extract(pkg, saveDir, {})
    console.log('extracted!', from, resolved, integrity)

    const data = await csvtojson().fromFile(path.join(saveDir, 'deployAddresses.csv'))
    const chainIDs = data.filter(
      (val) => !val['Address'].endsWith(PRE_SUFFIX)
    )
      .map(
        (val) => Number.parseInt(val['Address'])
      )
    //delete tmp
    // rimrafSync(saveDir)
    console.log("Deleted tmp package directory")
    return DeployChains.filter(
      (chain) => !chainIDs.includes(chain.id)
    )
  }

  // Verify that the version is a valid SemVer
  verifySemver(version: string): string {
    if (!SEMVER_REGEX.test(version)) {
      console.error(`Invalid version: ${version}`)
      throw new Error(`Invalid version: ${version}`)
    }
    if (version.startsWith('v')) {
      version = version.substring(1)
    }
    return version
  }

  // Returns the version of the protocol
  getVersion(): string {
    return semver.stringify(this.version)
  }

  // Function to update the Version variable in Solidity files
  updateVersionInSolidityFiles(dir: string = contractsDir, version: string = semver.stringify(this.version)) {
    const files = fs.readdirSync(dir)

    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        this.updateVersionInSolidityFiles(filePath, version)
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

  updatePackageJsonVersion(version: string) {
    version = this.verifySemver(version)
    // Update the version in package.json
    const packageJsonPath = path.join(__dirname, '../../package.json')
    let packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonObj = JSON.parse(packageJson)
    packageJsonObj.version = version
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonObj, null, 2), 'utf8')
  }

  async isPatchUpdate(): Promise<boolean> {
    const publishedVersion = await this.getPublishedVersion()
    if (!publishedVersion) return false
    const pub = semver.parse(publishedVersion)
    //The semver string on the published package isnt correct, ie beta was release to latest or something
    if(this.getReleaseTag() != pub.release) return false
    if (pub.release != this.version.release) throw new Error(`Release version mismatch for npm tag ${pub.release}: ${pub.release} != ${this.version.release}`)
    if (pub.major == this.version.major && pub.minor == this.version.minor && pub.patch == this.version.patch) throw new Error(`Version of git tag ${semver.stringify(this.version)} is the same as the current published version: ${publishedVersion}`)

    return pub.major == this.version.major && pub.minor == this.version.minor
      && Number.parseInt(pub.patch || '0') > Number.parseInt(this.version.patch || '0')
  }

  /**
   * Parses the version tag to release for the tag type 
   * @returns 'beta' | 'rc' | 'latest', throws otherwise
   */
  getReleaseTag(): PublishTag {
    const releaseTag = this.version.release
    switch (releaseTag) {
      case 'beta':
        return 'beta'
      case 'rc':
        return 'rc'
      case 'latest':
        return 'latest'
      default:
        throw new Error(`Invalid release tag: ${releaseTag}`)
    }
  }

  async getPublishedVersion(tag?: PublishTag): Promise<string | undefined> {
    tag = tag || this.getReleaseTag()
    const showPkg = JSON.parse(await execCMD(`npm show @eco-foundation/routes --json`))
    return showPkg['dist-tags'][tag]
  }

  async getPublishedPackages(): Promise<string> {
    return await execCMD(`npm show @eco-foundation/routes --json`)
  }


}
// Get the GITHUB_REF environment variable
export function getGithubTagRef(): string {
  // Get the GITHUB_REF environment variable
  const githubRef = process.env.GITHUB_REF
  if (!githubRef) {
    console.error('GITHUB_REF environment variable is not set.')
    throw new Error('GITHUB_REF environment variable is not set.')
  }
  // Check if GITHUB_REF is a tag
  const tagPrefix = 'refs/tags/'
  if (!githubRef.startsWith(tagPrefix)) {
    console.error('GITHUB_REF is not a tag.')
    throw new Error('GITHUB_REF is not a tag.')
  }
  // Extract the tag name
  return githubRef.substring(tagPrefix.length)
}