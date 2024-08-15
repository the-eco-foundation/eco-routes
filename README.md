<div id="top"></div>

<br />
<div align="center">
  <a href="https://github.com/eco/ecoism">
    <img src="https://assets.website-files.com/609bd719ffb9df9499369faa/60ca59c5b5d40fee5d7ea4c9_eco-symbol.svg" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Eco - Intent Protocol</h3>

  <p align="center">
    The amazing ECO intent protocol!
    <br />
    <a href="https://github.com/eco/ecoism"><strong>Explore the docs »</strong></a>
    <br />
  </p>
</div>

- [About The Project](#about-the-project)
  - [Built With](#built-with)
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

## About The Project

This is the ECO intent Protocol Backend

### Built With

- [Hardhat](https://hardhat.org)

## Getting Started

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
 git clone git@github.com:eco/ecoism.git
```

2. Install and build ecoism using yarn

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

Project Link: [https://github.com/eco/ecoism](https://github.com/eco/ecoism)

<p align="right">(<a href="#top">back to top</a>)</p>
