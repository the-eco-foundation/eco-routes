## Eco Routes Protocol Deployment
This directory contains the files needed to deploy, verify and publish the contracts to a number of chains.

## Semver
The npm publishing semver follows the standard found [here](https://semver.org/). On patch(0.0.x) version updates will
agument any existing npm package of the same major.minor.x release.

## Requirements:
Protocol deployment requires some contracts to be already deployed on the chain

### Create2 & Create3:
Used by the deployment scripts to deploy the routes protocol to deterministic addresses.
```
const CREATE2_DEPLOYER_ADDRESS: Hex =
  '0x98b2920d53612483f91f12ed7754e51b4a77919e'
const CREATE3_DEPLOYER_ADDRESS: Hex =
  '0x6513Aedb4D1593BA12e50644401D976aebDc90d8'
```

### Multicall3:
Multicall3 is used for multi call reads from the filler
```
 0xca11bde05977b3631167028862be2a173976ca11
```

### Kernel Smart Wallet:
The kernel sw are used for the filler as their on-chain accounts
```
"0.3.1": {
        ECDSA_VALIDATOR: "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57",
        ACCOUNT_LOGIC: "0xBAC849bB641841b44E965fB01A4Bf5F074f84b4D",
        FACTORY_ADDRESS: "0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419",
        META_FACTORY_ADDRESS: "0xd703aaE79538628d27099B8c4f621bE4CCd142d5"
    }
```

### Money
The deployer account needs to be funded in the gas token on each chain 

## Deployment
The script in this repo is designed to build, test, deploy and then publish the addresses and contracts to npm.

There are two different types of deploy: full and partial. A full deploy is one that deploys to all chains defined 
in the [chains.ts](./chains.ts) file. A partial deploy is when we deploy some new chains, but include prior deployed 
addresses for other pre-existing deploys.

### Deploy trigger
To trigger a partial/full deployment, create a tag on the github repo with the version set to a semver like `v1.2.3-beta` 
and select the branch/commit to deploy.

The tag system accepts 3 types of tag suffixes that correspond to release types:
- `v1.2.3-beta` will deploy a beta npm package
- `v1.2.3-rc` will deploy a rc(release candidate) npm package
- `v1.2.3` will deploy a package to latest npm package. This is the default when u run 'yarn add @eco_foundation/routes'

#### Full Deployment
To trigger a full deployment, increment the semver major or minor variable. This will deploy all the [chains](./chains.ts)