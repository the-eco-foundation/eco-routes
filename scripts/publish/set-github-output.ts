import * as fs from 'fs'

export function setGithubOutput(key: string, val: string) {
  // Get the GITHUB_OUTPUT environment variable
  const githubOutput = process.env.GITHUB_OUTPUT

  if (!githubOutput) {
    console.error("Error: GITHUB_OUTPUT environment variable is not defined.")
    process.exit(1)
  }

  // Append the key-value pair to the GITHUB_OUTPUT file
  fs.appendFileSync(githubOutput, `${key}=${val}\n`)

  console.log(`Exported ${val} to GITHUB_OUTPUT.`)
}

// setGithubOutput('tag', 'latest')