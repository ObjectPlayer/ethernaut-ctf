# Ethernaut CTF Solutions

This project contains solutions for the [Ethernaut](https://ethernaut.openzeppelin.com/) Capture The Flag (CTF) challenges, implemented using Hardhat and Solidity.

## Project Structure

- `contracts/`: Contains the original challenge contracts and solution implementations
  - `level-03-coin-flip/`: CoinFlip challenge and solution
    - `CoinFlip.sol`: Original vulnerable contract
    - `solution/CoinFlipGues.sol`: Solution contract that exploits the vulnerability
- `deploy/`: Contains deployment scripts using hardhat-deploy
  - `30-deploy-coin-flip.ts`: Deploys the CoinFlip contract
  - `31-deploy-coin-flip-solution.ts`: Deploys the GuessCoinFlip solution contract
- `scripts/`: Contains scripts for interacting with deployed contracts
  - `execute-coin-flip-guess.ts`: Calls the `getCoinFlip` method on the deployed solution contract
- `docs/`: Contains detailed documentation for each challenge
  - `level-03-coin-flip.md`: Documentation for the CoinFlip challenge

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

### Deploy the Contracts

Deploy both the CoinFlip contract and the solution contract:

```shell
# Deploy all contracts
npx hardhat deploy --network sepolia

# Or deploy specific contracts by tags
npx hardhat deploy --tags coin-flip --network sepolia
npx hardhat deploy --tags coin-flip-solution --network sepolia
```

### Execute the Solution

Call the `getCoinFlip` method on the deployed solution contract:

```shell
# Using default address
npx hardhat run scripts/execute-coin-flip-guess.ts --network sepolia

# Or specifying a custom address
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/execute-coin-flip-guess.ts --network sepolia
```

## Challenge Documentation

Detailed documentation for each challenge is available in the `docs/` directory:

- [Level 3: CoinFlip Challenge](/docs/level-03-coin-flip.md)

## CoinFlip Challenge Summary

The CoinFlip challenge requires predicting the outcome of a coin flip 10 times in a row. The vulnerability lies in the pseudorandom number generation that uses the previous block hash, which is predictable.

The solution contract (`GuessCoinFlip`) uses the same algorithm to predict the outcome and make the correct guess.

## Other Useful Commands

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```
