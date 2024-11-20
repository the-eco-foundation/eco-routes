import { execSync } from 'child_process'

process.env.DEPLOY_CI = 'true'
const mainnetDep = [
  'deployPolygon',
  'deployArbitrum',
  'deployMantle',
  'deployBase',
  'deployOptimism',
]
const sepoliaDep = mainnetDep.flatMap((dep) => {
  return dep.toLocaleLowerCase().includes('polygon') ? [] : [dep + 'Sepolia']
})

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
