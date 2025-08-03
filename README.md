# Ethernaut CTF Solutions

This project contains solutions for the [Ethernaut](https://ethernaut.openzeppelin.com/) Capture The Flag (CTF) challenges, implemented using Hardhat and Solidity.

## Project Structure

- `contracts/`: Contains the original challenge contracts and solution implementations
  - `level-03-coin-flip/`: CoinFlip challenge and solution
    - `CoinFlip.sol`: Original vulnerable contract
    - `solution/CoinFlipGues.sol`: Solution contract that exploits the vulnerability

## Available Scripts

- `deploy-CoinFlipGues.ts`: Deploys the CoinFlip solution contract
- `call-CoinFlipGues.ts`: Calls the `getCoinFlip` method on the deployed solution contract

## Getting Started

### Prerequisites

- Node.js and npm
- Hardhat
- Ethereum wallet with Sepolia testnet ETH

### Installation

```shell
npm install
```

### Configuration

Create a `.env` file with the following variables:

```
RPC_URL_SEPOLIA_NETWORK=your_rpc_url
PRIVATE_KEY_SEPOLIA_NETWORK=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
COIN_MARKET_CAP_API_KEY=your_coinmarketcap_api_key
```

## Usage

### Deploy the CoinFlip Solution Contract

```shell
npx hardhat run scripts/deploy-CoinFlipGues.ts --network sepolia
```

### Call the getCoinFlip Method

```shell
npx hardhat run scripts/call-CoinFlipGues.ts --network sepolia
```

## CoinFlip Challenge Explanation

The CoinFlip challenge requires predicting the outcome of a coin flip 10 times in a row. The vulnerability lies in the pseudorandom number generation that uses the previous block hash, which is predictable.

The solution contract (`GuessCoinFlip`) uses the same algorithm to predict the outcome and make the correct guess.

## Other Useful Commands

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```
