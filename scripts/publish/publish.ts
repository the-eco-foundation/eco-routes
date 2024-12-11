// publish --tag beta --access public # --provenance --access public

import { execCMD } from '../utils'
import { ProtocolVersion } from '../viem_deploy/ProtocolVersion'

function publish(){
  const pv = new ProtocolVersion()
  const tag  = pv.getReleaseTag()
  execCMD(`echo NPM build tag is ${tag}`)
  execCMD(`echo GITHUB_ACTION is $GITHUB_ACTION`)
  execCMD(`yarn publish --tag ${tag} --access public`)
}


publish()