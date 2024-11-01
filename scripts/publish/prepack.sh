#!/usr/bin/env bash

set -euo pipefail

# cross platform `mkdir -p`
mkdirp() {
  node -e "fs.mkdirSync('$1', { recursive: true })"
}

alias

unalias cp

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

npx ts-node scripts/publish/abi-export.ts
npx ts-node scripts/publish/package.ts

cp README.md build/
cp LICENSE build/




