import { execSync } from 'child_process'

process.env.DEPLOY_CI = 'true'
const mainnetDep = [
  'deployBase',
  'deployOptimism',
  // 'proverDeployBase',
  // 'proverDeployOptimism',
  // 'deployHyperProverBase',
  // 'deployHyperProverOptimism'
]
const sepoliaDep = mainnetDep.map((dep) => dep + 'Sepolia')

export function deployContracts() {
  for (const dep of mainnetDep) {
    callYarnCmd(dep)
  }
  for (const dep of sepoliaDep) {
    callYarnCmd(dep)
  }
}

function callYarnCmd(cmd: string) {
  execSync(`yarn ${cmd}`, { stdio: 'inherit' })
}
