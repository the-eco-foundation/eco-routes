// publish --tag beta --access public # --provenance --access public

import { execCMD } from '../utils'
import { ProtocolVersion } from '../viem_deploy/ProtocolVersion'

function publish(){
  // const pv = new ProtocolVersion()
  // const tag  = pv.getReleaseTag()
  const tag = 'testfornpm112'
  // execCMD(`npm publish --tag ${tag} --access public`)
  execCMD(`echo NPM_AUTH_TOKEN is $NPM_AUTH_TOKEN`)
  execCMD(`echo GITHUB_ACTION is $GITHUB_ACTION`)
  execCMD(`echo Tag is ${tag}`)
}


publish()