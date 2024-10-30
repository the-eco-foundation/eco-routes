#!/usr/bin/env bash

set -euo pipefail

# cross platform `mkdir -p`
mkdirp() {
  node -e "fs.mkdirSync('$1', { recursive: true })"
}

# cd to the root of the repo
cd "$(git rev-parse --show-toplevel)"

npm run clean

env COMPILE_MODE=production npm run build

mkdirp contracts/build/abi/contracts
mkdirp contracts/build/abi/interfaces

cp artifacts/contracts/**/*.json contracts/build/abi/contracts
cp artifacts/contracts/interfaces/**/*.json contracts/build/abi/interfaces

rsync -av --include '*/*.sol' --exclude 'test' --exclude 'build' --exclude 'tools' contracts/ contracts/build
rm contracts/build/abi/contracts/*.dbg.json
rm contracts/build/abi/interfaces/*.dbg.json

npx ts-node scripts/publish/abi-export.ts

cp README.md contracts/




