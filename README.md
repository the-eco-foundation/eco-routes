<div id="top"></div>
<h1>Eco Routes</h1>

</div>

- [Abstract](#abstract)
  - [How it works](#how-it-works)
- [Components](#components)
  - [Intent Creation / Settlement](#intent-creation--settlement)
  - [Intent Fulfillment / Execution](#intent-fulfillment--execution)
  - [Intent Proving](#intent-proving)
- [Contract Addresses](#contract-addresses)
- [Future Work](#future-work)
- [Usage](#usage)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Lint](#lint)
  - [Testing](#testing)
  - [Deployment](#deployment)
  - [End-To-End Testing](#end-to-end-testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Abstract

An intents-driven, permissionless, trust-neutral protocol for facilitating the creation, incentivized execution, and proof of cross-L2 transactions.

**Warning: This code has not been audited. Use at your own risk.**

- [Intent Creation / Settlement](#intent-creation--settlement)
- [Intent Fulfillment / Execution](#intent-fulfillment--execution)
- [Intent Proving](#intent-proving)

We identify three main user profiles:

- `Users`: Individuals who want to transact across different L2s.
- `Fillers`: Individuals interested in performing transactions on behalf of others for a fee.
- `Provers`: Individuals interested in proving on the source chain that an intent was fulfilled on the destination chain.

### How it works

A `User` initiates a cross-chain transaction by creating an intent. Put simply, an intent represents a `User`'s end goals on the destination chain. It contains the calls they'd want to make, those calls' corresponding addresses, and the price they'd be willing to pay someone to execute this call on their behalf, along with other metadata. Seeing this intent and being enticed by the fee they'd receive, a `Filler` creates and executes a fulfill transaction on the destination chain that corresponds to the user's intent, storing the fulfilled intent's hash on the destination chain. A `Prover` - perhaps the `Filler` themselves or a service they subscribe to - sees this fulfillment transaction and performs a proof that the hash of the fulfilled transaction on the destination chain matches that of the intent on the source chain. After the intent proven, the filler can withdraw their reward.

## Components

Within the following sections, the terms 'source chain' and 'destination chain' will be relative to any given intent. Each supported chain will have its own `IntentSource`, `Inbox`, and `Prover`s.

### Intent Creation / Settlement

Intent creation and filler settlement processes both exist on the `IntentSource` on the source chain, and is where the full intent lifecycle will start and end. Both `Users` and `Fillers` interact with this contract, Users to create intents and `Fillers` to claim their reward after fulfillment has been proven.

### Intent Fulfillment / Execution

Intent fulfillment lives on the `Inbox`, which lives on the destination chain. `Fillers` interact with this contract to `fulfill` Users' intents.

### Intent Proving

Intent proving lives on the `Prover` and `HyperProver` contracts, which exist on the source chain. `Provers` are the parties that should be interacting with prover contracts, but the `IntentSource` does read state from it. There are currently two types of provers: StorageProvers (`Prover.sol`), which use storage proofs to verify the fulfillment of an intent, and HyperProvers(`HyperProver.sol`), which utilize a <a href="https://hyperlane.xyz/" target="_blank">Hyperlane</a> bridge in verifying intent fulfillment.

**See [contracts](/contracts) for a detailed API documentation**

## Contract Addresses

| **Mainnet Chains** | IntentSource                               | Inbox                                      | StorageProver                              | HyperProver                                |
| :----------------- | :----------------------------------------- | :----------------------------------------- | :----------------------------------------- | :----------------------------------------- |
| Optimism           | 0xa8c5Be07A551E9C792AAbCE3d763a9A808621E3d | 0xed368A5C796Ae803D36ffa02A88A33dA190b0179 | 0x45509D6f3020a099456B865deF46807724b39222 | 0x7ccc9c871e3f666C94E35bF280d0E517B741d812 |
| Base               | 0xa8c5Be07A551E9C792AAbCE3d763a9A808621E3d | 0xed368A5C796Ae803D36ffa02A88A33dA190b0179 | 0xaE4151171e98D139c55c50Eb6F6E0d6ff5a70Cb6 | 0xe011914A09D15Dd86B7CdAbC1378B417Ca3851e6 |
| Mantle             | 0xa8c5Be07A551E9C792AAbCE3d763a9A808621E3d | 0xed368A5C796Ae803D36ffa02A88A33dA190b0179 | 0x558E075071348C1BD06E5f7e429BA7e4d0F1611D | 0x88FE05b3Bd415Eaa1F9Fdf89353d58289Be248B4 |
| Arbitrum           | 0xa8c5Be07A551E9C792AAbCE3d763a9A808621E3d | 0xed368A5C796Ae803D36ffa02A88A33dA190b0179 | 0x558E075071348C1BD06E5f7e429BA7e4d0F1611D | 0x2294a2228107880CceE12815eCf1692CAA13e7D3 |
| Helix              | 0xa8c5Be07A551E9C792AAbCE3d763a9A808621E3d | 0xed368A5C796Ae803D36ffa02A88A33dA190b0179 | 0xfeD7A2dcf48c95F47E70b8ea59669CBF964d6940 | 0xE9bd7285279d9AE70E3D6d3ecda442A70e73a842 |

| **Testnet Chains** | IntentSource                               | Inbox                                      | StorageProver                              | HyperProver                                |
| :----------------- | :----------------------------------------- | :----------------------------------------- | :----------------------------------------- | :----------------------------------------- |
| OptimismSepolia    | 0x62a2324Fa89C44625d1152e362600Fa20b439a10 | 0x29a7490df0E44fF69912f0C63f6a379d696292cc | 0x39F49d1ac7A6EE02e0dFE0B9E431b1B8751177c3 | 0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981 |
| BaseSepolia        | 0x62a2324Fa89C44625d1152e362600Fa20b439a10 | 0x29a7490df0E44fF69912f0C63f6a379d696292cc | 0xFA693a838DE0922Bc863a53Ff658D8384EC703FC | 0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981 |
| MantleSepolia      | 0x62a2324Fa89C44625d1152e362600Fa20b439a10 | 0x29a7490df0E44fF69912f0C63f6a379d696292cc | 0x39F49d1ac7A6EE02e0dFE0B9E431b1B8751177c3 | 0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981 |
| ArbitrumSepolia    | 0x62a2324Fa89C44625d1152e362600Fa20b439a10 | 0x29a7490df0E44fF69912f0C63f6a379d696292cc | 0x39F49d1ac7A6EE02e0dFE0B9E431b1B8751177c3 | 0x45509D6f3020a099456B865deF46807724b39222 |
| ECOTestnet         | 0x62a2324Fa89C44625d1152e362600Fa20b439a10 | 0x29a7490df0E44fF69912f0C63f6a379d696292cc | 0x6e54fa98C9292fc1B343F74d67EC2671515c24D2 | 0x606b4657ee2b57DbB4c7bA72c8AA5d7C88f9C981 |

## Future Work

Fully-operational end-to-end tests are currently under development. We are also working on services for streamlining and batching prover and solver functionalities. Additionally, we intend to build out support for additional chains.

## Usage

To get a local copy up and running follow these simple steps.

### Prerequisites

Running this project locally requires the following:

- [NodeJS v23.0.1](https://nodejs.org/en/blog/release/v23.1.0) - using nvm (instructions below)
- [Yarn v1.22.22](https://www.npmjs.com/package/yarn/v/1.22.22)

It is recommended to use `nvm` to install Node. This is a Node version manager so your computer can easily handle multiple versions of Node:

1. Install `nvm` using the following command in your terminal:

```sh
curl -o- curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
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
nvm install v23.0.1
```

4. Once the installation is complete you can use it by running:

```bash
nvm use v23.0.1
```

You should see it as the active Node version by running:

```bash
nvm ls
```

### Installation

1. Clone the repo

```bash
git clone git@github.com:ecoinc/Cross-L2-Actions.git
```

2. Install and build using yarn

```bash
 yarn install
```

```bash
 yarn build
```

### Lint

```bash
yarn lint
```

### Testing

```bash
# tests
$ yarn  test

# test coverage
$ yarn coverage
```

### Deployment

Deploy using `deploy.ts` in the `scripts` directory. This script draws from the configs (found in the `config` directory) as well as a local .env file. See `.env.example`.

### End-To-End Testing

This section is under development. While the tests are not yet operational, the scripts are available in the `scripts` directory

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

Project Link: [https://github.com/the-eco-foundation/eco-routes.git](https://github.com/the-eco-foundation/eco-routes.git)

<p align="right">(<a href="#top">back to top</a>)</p>
