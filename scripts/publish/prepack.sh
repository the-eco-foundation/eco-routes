#!/bin/bash

set -euo pipefail

# cross platform `mkdir -p`
mkdirp() {
  node -e "fs.mkdirSync('$1', { recursive: true })"
}

# cd to the root of the repo
cd "$(git rev-parse --show-toplevel)"

npm run clean

env COMPILE_MODE=production npm run build

mkdirp build/src/abi/contracts
mkdirp build/src/abi/interfaces

cp artifacts/contracts/**/*.json build/src/abi/contracts
cp artifacts/contracts/interfaces/**/*.json build/src/abi/interfaces

rsync -av --include '*/*.sol' --exclude 'test' --exclude 'build' --exclude  'README.md' --exclude 'tools' contracts/ build/src

rm build/src/abi/contracts/*.dbg.json
rm build/src/abi/interfaces/*.dbg.json
echo "Start abi export and package.json generation"
npx tsx scripts/publish/abi-export.ts
npx tsx scripts/publish/package.ts
echo "Finished abi export and package.json generation"
echo "Move .npmignore, tsconfig, README.md and LICENSE to build"
cp README.md build/
cp LICENSE build/






