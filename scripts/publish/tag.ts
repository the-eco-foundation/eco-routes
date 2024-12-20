// publish --tag beta --access public # --provenance --access public

import { execCMD } from '../utils'
import { ProtocolVersion } from '../viem_deploy/ProtocolVersion'

// GITHUB_REF=refs/tags/v0.0.509-beta GITHUB_OUTPUT=$(pwd)/a.txt npx tsx scripts/publish/publish.ts
/**
 * Sets the NPM_TAG environment variable for npm publishing through github actions
 */
function setNpmTag() {
  const pv = new ProtocolVersion()

  execCMD(`echo "NPM_TAG=${pv.getReleaseTag()}" >> $GITHUB_ENV`)
}

setNpmTag()
