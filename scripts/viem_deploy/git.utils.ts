import { execCMD } from '../utils'

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

/**
 * Gets the published package metadata as json from the npm registry
 * @param packageName the name of the package
 * @returns
 */
export async function getPublishedPackages(
  packageName: string,
): Promise<string> {
  return await execCMD(`npm show ${packageName} --json`)
}

/**
 * Sets the environment variable in the Github Action
 *
 * @param envKey the environment variable key
 * @param envVal the environment variable value
 */
export function setGithubActionEnv(envKey: string, envVal: string) {
  execCMD(`echo "${envKey}=${envVal}" >> $GITHUB_ENV`)
}

/**
 * Sets the summary markdown in the Github Action step
 * @param summaryMarkdown the markdown summary to be set
 */
export function setGithubStepSummary(summaryMarkdown: string) {
  execCMD(`echo "${summaryMarkdown}" >> $GITHUB_STEP_SUMMARY`)
}
