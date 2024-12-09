// publish --tag beta --access public # --provenance --access public

import { execCMD } from "../utils"
import { ProtocolVersion } from "../viem_deploy/ProtocolVersion"
import { setGithubOutput } from "./set-github-output"

export type PublishTag = 'beta' | 'latest' | 'rc'
// GITHUB_REF=refs/tags/v0.0.509-beta GITHUB_OUTPUT=$(pwd)/a.txt npx tsx scripts/publish/publish.ts
function publishTag() {
  const pv = new ProtocolVersion()
  // execCMD(`cd build && pwd`)
  // execCMD(`npm publish --tag ${pv.getReleaseTag()} --access public`)
  // console.log(`TAG=${pv.getReleaseTag()}`)
  // execCMD(`echo ${pv.getReleaseTag()}`)
  // console.log(pv.getReleaseTag())
  setGithubOutput('NPM_TAG', pv.getReleaseTag())
  // execCMD(`echo "::set-output name=NPM_TAG::${pv.getReleaseTag()}"`)
}


publishTag()