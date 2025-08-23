# Ethernaut CTF Solutions

This project contains solutions for the [Ethernaut](https://ethernaut.openzeppelin.com/) Capture The Flag (CTF) challenges, implemented using Hardhat and Solidity.

## Project Structure

- `contracts/`: Contains the original challenge contracts and solution implementations organized by level
  - `level-00-hello/`: Hello Ethernaut challenge contracts
  - `level-01-fallback/`: Fallback challenge contracts
  - `level-03-coin-flip/`: CoinFlip challenge contracts
- `deploy/`: Contains deployment scripts using hardhat-deploy with proper tagging and dependencies
  - `01-deploy-hello-ethernaut.ts`: Deploys the Level 0 Hello Ethernaut contract
  - `10-deploy-fallback.ts`: Deploys the Level 1 Fallback contract
  - `30-deploy-coin-flip.ts`: Deploys the Level 3 CoinFlip contract
  - `31-deploy-coin-flip-solution.ts`: Deploys the CoinFlip solution contract
- `scripts/`: Contains scripts for interacting with deployed contracts and utilities
  - `level-00-hello/`: Scripts for the Hello Ethernaut challenge
    - `solve-hello-ethernaut.ts`: Solves the Hello Ethernaut challenge
  - `level-01-fallback/`: Scripts for the Fallback challenge
    - `solve-fallback.ts`: Solves the Fallback challenge
  - `verify.ts`: Utility for manually verifying contracts on block explorers
- `utils/`: Contains utility functions and configurations
  - `network-config.ts`: Network configuration for automatic contract verification
- `docs/`: Contains detailed documentation for each challenge with explanations and solution guides
  - `level-00-hello.md`: Documentation for the Hello Ethernaut challenge
  - `level-01-fallback.md`: Documentation for the Fallback challenge
  - `level-03-coin-flip.md`: Documentation for the CoinFlip challenge
- `test/`: Contains test suites for verifying contract functionality

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

Contracts will be automatically verified on Etherscan when deployed to non-local networks like Sepolia. The system uses the network configuration in `utils/network-config.ts` to determine which networks should trigger verification.

### Execute the Solution

To execute the solution, you'll need to interact with the deployed GuessCoinFlip contract. You can do this through:

```shell
# Using hardhat console
npx hardhat console --network sepolia

# Then in the console:
const GuessCoinFlip = await ethers.getContractFactory("GuessCoinFlip")
const guessCoinFlip = await GuessCoinFlip.attach("0xYourContractAddress")
const tx = await guessCoinFlip.getCoinFlip()
const receipt = await tx.wait()
console.log("Transaction successful:", receipt.hash)
```

You'll need to execute this multiple times (waiting for a new block each time) to achieve 10 consecutive wins.

### Manually Verify Contracts

If automatic verification fails or you need to verify a contract manually:

```shell
# Verify a contract without constructor arguments
npx hardhat run scripts/verify.ts --network sepolia -- --address 0xYourContractAddress

# Verify a contract with constructor arguments
npx hardhat run scripts/verify.ts --network sepolia -- --address 0xYourContractAddress --constructor-args arg1,arg2
```

The verification system supports multiple networks and will automatically detect if verification is appropriate based on the network's chain ID.

## Challenge Documentation

Detailed documentation for each challenge is available in the `docs/` directory:

- [Level 0: Hello Ethernaut Challenge](/docs/level-00-hello.md)
- [Level 1: Fallback Challenge](/docs/level-01-fallback.md)
- [Level 3: CoinFlip Challenge](/docs/level-03-coin-flip.md)

## Challenge Summaries

### Hello Ethernaut Challenge Summary

The Hello Ethernaut challenge is an introductory level that teaches basic smart contract interaction. It involves following a series of clues by calling different functions, ultimately finding a password and using it to authenticate.

The solution script (`solve-hello-ethernaut.ts`) walks through each step, calling the functions in sequence and extracting the necessary information to complete the challenge.

### Fallback Challenge Summary

The Fallback challenge focuses on contract ownership and fallback functions. The goal is to take ownership of the contract and drain its funds by exploiting a vulnerability in the `receive()` function.

The solution script (`solve-fallback.ts`) makes a small contribution, triggers the fallback function to take ownership, and then withdraws all funds from the contract.

### CoinFlip Challenge Summary

The CoinFlip challenge requires predicting the outcome of a coin flip 10 times in a row. The vulnerability lies in the pseudorandom number generation that uses the previous block hash, which is predictable.

The solution contract (`GuessCoinFlip`) uses the same algorithm to predict the outcome and make the correct guess.

## Other Useful Commands

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```
