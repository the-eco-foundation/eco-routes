<div id="top"></div>

<br />
<div align="center">
  <a href="https://github.com/eco/eco-protocol">
    <img src="https://i.postimg.cc/ryNBfZkN/Logo-Blue.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Eco Protocol</h3>

  <p align="center">
    The amazing ECO intent protocol!
    <br />
    <a href="https://github.com/eco/eco-protocol"><strong>Explore the docs »</strong></a>
    <br />
  </p>
</div>

- [About The Project](#about-the-project)
- [Components](#Components)
  - [Intent Creation / Settlement](#intent-creation--settlement)
  - [Intent Fulfillment / Execution](#intent-fulfillment--execution)
  - [Intent Proving](#intent-proving)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Lint](#lint)
- [Test](#test)
- [Testnet End to End Tests](#testnet-end-to-end-tests)
  - [Deployment](#deployment)
  - [End to End Testing](#end-to-end-testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About the project

The Eco protocol is an intents-driven permissionless, trust-neutral protocol and liquidity network enabling cross-L2 transactions. We are live on `Optimism` and `Base`, with cross-chain routes running in both directions. See it in action using our wallet, [Bend](bend.eco).

The ecosystem has three main parts:

- [Intent Creation / Settlement](#intent-creation--settlement)
- [Intent Fulfillment / Execution](#intent-fulfillment--execution)
- [Intent Proving](#intent-proving)

There are also three main types of ecosystem participants:

- `Users`: Individuals who want to transact across different L2s.
- `Fillers`: Individuals interested in performing transactions on behalf of others for a fee.
- `Provers`: Individuals interested in proving on the source chain that an intent was fulfilled on the destination chain.

### How it works

A `User` initiates a cross-chain transaction by creating an intent. Put simply, an intent represents a `User`'s end goals on the destination chain. It contains the calls they'd want to make, those calls' corresponding addresses, and the price they'd be willing to pay someone to execute this call on their behalf, along with other metadata. Seeing this intent and being enticed by the fee they'd receive, a `Filler` creates and executes a fulfill transaction on the destination chain that corresponds to the user's intent, storing the fulfilled intent's hash on the destination chain. A `Prover` - perhaps the `Filler` themselves or a service they subscribe to - sees this fulfillment transaction and performs a proof that the hash of the fulfilled transaction on the destination chain matches that of the intent on the source chain. After the intent proven, the filler can withdraw their reward.

## Components

Within the following sections, the terms 'source chain' and 'destination chain' will be relative to any given intent. Each of n supported chain will have its own `IntentSource`(1), `Inbox`(1), and `Prover`s(n-1)

### Intent Creation / Settlement

Intent creation and filler settlement processes both exist on the `IntentSource` on the source chain, and is where the full intent lifecycle will start and end. Both `Users` and `Fillers` interact with this contract, Users to create intents and `Fillers` to claim their reward after fulfillment has been proven.

#### __*API*__

##### Events

__IntentCreated__: emitted on a successful call to createIntent
Attributes:
- `_hash` (bytes32) the hash of the intent, also the key to the intents mapping
- `_creator` (address) the address that created the intent
- `_destinationChain` (uint256) the destination chain
- `_targets` (address[]) the address on \_destinationChain at which the instruction sets need to be executed
- `_data` (bytes[]) the instructions to be executed on \_targets
- `_rewardTokens` (address[]) the addresses of reward tokens
- `_rewardAmounts` (uint256[]) the amounts of reward tokens
- `_expiryTime` (uint256) the time by which the storage proof must have been created in order for the solver to redeem rewards.

__Withdrawal__: emitted on successful call to withdraw
Attributes: 
- _hash (bytes32) the hash of the intent on which withdraw was attempted
- _recipient (address) the address that received the rewards for this intent


### Intent Fulfillment / Execution

Intent fulfillment lives on the `Inbox`, which lives on the destination chain. `Fillers` interact with this contract to `fulfill` Users' intents.

### Intent Proving

Intent proving lives on the `Prover`, which is on the source chain. `Prover`s are the parties that should be interacting with the Prover contract, but the `IntentSource` does read state from it.

## Usage

To get a local copy up and running follow these simple steps.

### Prerequisites

Running this project locally requires the following:

- [NodeJS v18.20.3](https://nodejs.org/en/blog/release/v18.20.3) - using nvm (instructions below)
- [Yarn v1.22.19](https://www.npmjs.com/package/yarn/v/1.22.19)

It is recommended to use `nvm` to install Node. This is a Node version manager so your computer can easily handle multiple versions of Node:

1. Install `nvm` using the following command in your terminal:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

2. If you're not on an M1 Mac, skip to step 3. For Node < v15, `nvm` will need to be run in a Rosetta terminal since those versions are not supported by the M1 chip for installation. To do that, in the terminal simply run either:

If running bash:

```sh
arch -x86_64 bash
```

If running zsh:

```sh
arch -x86_64 zsh
```

More information about this can be found in [this thread](https://github.com/nvm-sh/nvm/issues/2350).

3. Install our Node version using the following command:

```sh
nvm install v18.20.3
```

4. Once the installation is complete you can use it by running:

```bash
nvm use v18.20.3
```

You should see it as the active Node version by running:

```bash
nvm ls
```

### Installation

1. Clone the repo

```bash
 git clone git@github.com:eco/eco-protocol.git
```

2. Install and build using yarn

```bash
 yarn install
```

```bash
 yarn build
```

## Lint

```bash
yarn lint
```

## Test

```bash
# tests
$ yarn  test

# test coverage
$ yarn coverage
```

## Testnet End to End Tests

For more information please see [TESTING.md](./TESTING.md)

### Deployment

Before beginning end to end tests on sepolia you must deploy the following contracts

```bash

# Deploy IntentSource and Prover contracts on Source Chain
yarn deploySourceAndProver

# Deploy Inbox contract on Destination chain
yarn deployInbox

```

### End to End Testing

Coming soon

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

1. Fork the Project
2. Create your Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- LICENSE -->

## License

[MIT License](./LICENSE)

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Project Link: [https://github.com/eco/eco-protocol](https://github.com/eco/eco-protocol)

<p align="right">(<a href="#top">back to top</a>)</p>
