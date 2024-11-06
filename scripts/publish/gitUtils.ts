import { execSync } from 'child_process'

export function getGitHash() {
  return execSync('git rev-parse HEAD').toString().trim()
}
