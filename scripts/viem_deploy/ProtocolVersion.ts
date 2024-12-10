import * as fs from 'fs'
import * as path from 'path'
import semver from 'semver-utils'
import { Chain } from 'viem'
import { DeployChains } from '../viem_deploy/chains'
import pacote from 'pacote'
import PackageJson from '../../package.json'
import csvtojson from 'csvtojson'
import { PRE_SUFFIX } from '../deploy/addresses'
import { rimrafSync } from 'rimraf'
import {
  getGithubTagRef,
  getPublishedPackages,
  setGithubStepSummary,
} from './git.utils'
import { compareSemverIntegerStrings } from './utils'

// Directory containing Solidity contract files
const contractsDir = path.join(__dirname, '../../contracts')

// Regular expression to verify that a string is a valid SemVer
// default regex from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string  with an optional leading v
const SEMVER_REGEX =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// The tags that can be used to publish the package
export type PublishTag = 'beta' | 'latest' | 'rc'

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
    if (await this.isPatchUpdate()) {
      const chains = await this.getNewChains()
      if (chains.length === 0) {
        throw new Error('No new chains to deploy for a patch update')
      }
      return chains
    } else {
      return DeployChains
    }
  }

  /**
   *
   * @returns the chains that have been deployed
   */
  async getNewChains(): Promise<Chain[]> {
    const saveDir = path.join(__dirname, '../../tmp')
    // extract a package into a folder
    const pkg = `${this.packageName}@${this.getReleaseTag()}`
    try {
      const { from, resolved, integrity } = await pacote.extract(
        pkg,
        saveDir,
        {},
      )
      console.log('extracted!', from, resolved, integrity)
      const data = await csvtojson().fromFile(
        path.join(saveDir, 'deployAddresses.csv'),
      )
      const chainIDs = data
        .filter((val) => !val.Address.endsWith(PRE_SUFFIX))
        .map((val) => Number.parseInt(val.Address))
      // delete tmp package directory
      rimrafSync(saveDir)
      console.log('Deleted tmp package directory')
      return DeployChains.filter((chain) => !chainIDs.includes(chain.id))
    } catch (e) {
      console.error('Error getting new chains', e)
      setGithubStepSummary(
        `### Deploying all chains\n Issue extracting package ${pkg}`,
      )
      return DeployChains
    }
  }

  /**
   * Verify that the version is a valid SemVer
   */
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

  /**
   * This function updates all the .sol files in the given directory to return a version string with the given version.
   * Its assumed that the files already have the function signature `function version() external pure returns (string memory)`
   *
   * @param dir the directory to update the version in the solidity files, default is the contracts directory
   * @param version the version to update the solidity files to, default is the current version
   */
  updateVersionInSolidityFiles(
    dir: string = contractsDir,
    version: string = semver.stringify(this.version),
  ) {
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

  /**
   * Updates the package json version to the given version
   *
   * @param version the version to update the package.json to
   */
  updatePackageJsonVersion(version: string) {
    version = this.verifySemver(version)
    // Update the version in package.json
    const packageJsonPath = path.join(__dirname, '../../package.json')
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const packageJsonObj = JSON.parse(packageJson)
    packageJsonObj.version = version
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJsonObj, null, 2),
      'utf8',
    )
  }

  /**
   * Checks the current published version of this package on npm and returns true if the current version is a patch update from the published version.
   * Patch update would be the third number in the semver string 0.0.x.
   * If no published version is found for the npm build tag, it returns false.
   *
   * @returns true if the current version is a patch update from the published version
   */
  async isPatchUpdate(): Promise<boolean> {
    const publishedVersion = await this.getPublishedVersion(this.getReleaseTag())
    if (!publishedVersion) return false
    const pub = semver.parse(publishedVersion)
    //in case the wrong string was published under another tag, ie 1.0.0-beta was published under latest
    pub.release = this.getReleaseTag()
    if (
      pub.major === this.version.major &&
      pub.minor === this.version.minor &&
      pub.patch === this.version.patch
    ) {
      throw new Error(
        `Version of git tag ${semver.stringify(this.version)} is the same as the current published version: ${publishedVersion}`,
      )
    }

    return (
      pub.major === this.version.major &&
      pub.minor === this.version.minor &&
      compareSemverIntegerStrings(this.version.patch || '0', pub.patch || '0') >
      0
    )
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

  /**
   * Gets the published dist-tag for the package on npm. If the tag is left
   * empty, it defaults to the release tag of the @link{this.version.release}
   * @param tag the npm build tag
   * @returns
   */
  async getPublishedVersion(tag: PublishTag): Promise<string | undefined> {
    const showPkg = JSON.parse(await getPublishedPackages(this.packageName))
    return showPkg['dist-tags'][tag]
  }
}
