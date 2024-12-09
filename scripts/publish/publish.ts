// publish --tag beta --access public # --provenance --access public

import { execCMD } from "../utils"
import { ProtocolVersion } from "../viem_deploy/ProtocolVersion"

export type PublishTag = 'beta' | 'latest' | 'rc'

function publishTag() {
  const pv = new ProtocolVersion()
  // execCMD(`cd build && pwd`)
  // execCMD(`npm publish --tag ${pv.getReleaseTag()} --access public`)
  // console.log(`TAG=${pv.getReleaseTag()}`)
  execCMD(`echo ${pv.getReleaseTag()}`)
}


publishTag()