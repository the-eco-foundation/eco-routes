// publish --tag beta --access public # --provenance --access public

import { execCMD } from '../utils'
import { ProtocolVersion } from '../viem_deploy/ProtocolVersion'

function publish() {
  const pv = new ProtocolVersion()
  const tag  = pv.getReleaseTag()
  const ops = {cwd: 'build'}
  execCMD(`echo starting yarn publish`, ops)
  execCMD(`"pwd"  pwd`, ops)
  execCMD(`echo NPM build tag is ${tag}`,ops)
  execCMD(`echo GITHUB_ACTION is $GITHUB_ACTION`, ops)
  execCMD(`yarn publish --tag ${tag} --access public`,ops)
}

publish()