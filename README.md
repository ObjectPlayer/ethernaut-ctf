# Ethernaut CTF Solutions

This project contains solutions for the [Ethernaut](https://ethernaut.openzeppelin.com/) Capture The Flag (CTF) challenges, implemented using Hardhat and Solidity.

## Project Structure

- `contracts/`: Contains the original challenge contracts and solution implementations organized by level
  - `level-00-hello/`: Hello Ethernaut challenge contracts
  - `level-01-fallback/`: Fallback challenge contracts
  - `level-02-fallout/`: Fallout challenge contracts
  - `level-03-coin-flip/`: CoinFlip challenge contracts
  - `level-04-telephone/`: Telephone challenge contracts
  - `level-05-token/`: Token challenge contracts
  - `level-06-delegation/`: Delegation challenge contracts
  - `level-07-force/`: Force challenge contracts
  - `level-08-vault/`: Vault challenge contracts
  - `level-09-king/`: King challenge contracts
- `deploy/`: Contains deployment scripts using hardhat-deploy with proper tagging and dependencies
  - `01-deploy-hello-ethernaut.ts`: Deploys the Level 0 Hello Ethernaut contract
  - `10-deploy-fallback.ts`: Deploys the Level 1 Fallback contract
  - `20-deploy-fallout.ts`: Deploys the Level 2 Fallout contract
  - `30-deploy-coin-flip.ts`: Deploys the Level 3 CoinFlip contract
  - `31-deploy-coin-flip-solution.ts`: Deploys the CoinFlip solution contract
  - `40-deploy-telephone.ts`: Deploys the Level 4 Telephone contract
  - `41-deploy-telephone-solution.ts`: Deploys the Telephone solution contract
  - `50-deploy-token.ts`: Deploys the Level 5 Token contract
  - `51-deploy-token-solution.ts`: Deploys the Token solution contract
  - `60-deploy-delegation.ts`: Deploys the Level 6 Delegation contract
  - `70-deploy-force.ts`: Deploys the Level 7 Force contract
  - `71-deploy-force-solution.ts`: Deploys the Force solution contract
  - `80-deploy-vault.ts`: Deploys the Level 8 Vault contract
  - `90-deploy-king.ts`: Deploys the Level 9 King contract
- `scripts/`: Contains scripts for interacting with deployed contracts and utilities
  - `level-00-hello/`: Scripts for the Hello Ethernaut challenge
    - `solve-hello-ethernaut.ts`: Solves the Hello Ethernaut challenge
  - `level-01-fallback/`: Scripts for the Fallback challenge
    - `solve-fallback.ts`: Solves the Fallback challenge
  - `level-02-fallout/`: Scripts for the Fallout challenge
    - `solve-fallout.ts`: Solves the Fallout challenge
  - `level-03-coinflip/`: Scripts for the CoinFlip challenge
    - `execute-coin-flip-guess.ts`: Executes the CoinFlip solution
  - `level-04-telephone/`: Scripts for the Telephone challenge
    - `execute-telephone-call.ts`: Executes the Telephone solution
  - `level-05-token/`: Scripts for the Token challenge
    - `execute-token-claim.ts`: Executes the Token solution
  - `level-06-delegation/`: Scripts for the Delegation challenge
    - `execute-delegation-exploit.ts`: Executes the Delegation solution
  - `level-07-force/`: Scripts for the Force challenge
    - `execute-force-exploit.ts`: Executes the Force solution
  - `level-08-vault/`: Scripts for the Vault challenge
    - `read-vault-password.ts`: Reads the private password and unlocks the vault
  - `level-09-king/`: Scripts for the King challenge
    - `claim-throne.ts`: Deploys the KingExploit contract and claims the throne
  - `verify.ts`: Utility for manually verifying contracts on block explorers
- `utils/`: Contains utility functions and configurations
  - `network-config.ts`: Network configuration for automatic contract verification
- `docs/`: Contains detailed documentation for each challenge with explanations and solution guides
  - `level-00-hello.md`: Documentation for the Hello Ethernaut challenge
  - `level-01-fallback.md`: Documentation for the Fallback challenge
  - `level-02-fallout.md`: Documentation for the Fallout challenge
  - `level-03-coin-flip.md`: Documentation for the CoinFlip challenge
  - `level-04-telephone.md`: Documentation for the Telephone challenge
  - `level-05-token.md`: Documentation for the Token challenge
  - `level-06-delegation.md`: Documentation for the Delegation challenge
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
- [Level 2: Fallout Challenge](/docs/level-02-fallout.md)
- [Level 3: CoinFlip Challenge](/docs/level-03-coin-flip.md)
- [Level 4: Telephone](./docs/level-04-telephone.md)
- [Level 5: Token](./docs/level-05-token.md)
- [Level 6: Delegation](./docs/level-06-delegation.md)
- [Level 7: Force](./docs/level-07-force.md)
- [Level 8: Vault](./docs/level-08-vault.md)
- [Level 9: King](./docs/level-09-king.md)

## Challenge Summaries

### Hello Ethernaut Challenge Summary

The Hello Ethernaut challenge is an introductory level that teaches basic smart contract interaction. It involves following a series of clues by calling different functions, ultimately finding a password and using it to authenticate.

The solution script (`solve-hello-ethernaut.ts`) walks through each step, calling the functions in sequence and extracting the necessary information to complete the challenge.

### Fallback Challenge Summary

The Fallback challenge focuses on contract ownership and fallback functions. The goal is to take ownership of the contract and drain its funds by exploiting a vulnerability in the `receive()` function.

The solution script (`solve-fallback.ts`) makes a small contribution, triggers the fallback function to take ownership, and then withdraws all funds from the contract.

### Fallout Challenge Summary

The Fallout challenge demonstrates the dangers of constructor naming in legacy Solidity code. The goal is to take ownership of the contract by exploiting a typo in what was intended to be the constructor function.

The solution script (`solve-fallout.ts`) calls the misspelled constructor function (`Fal1out` instead of `Fallout`) to claim ownership of the contract.

### CoinFlip Challenge Summary

The CoinFlip challenge requires predicting the outcome of a coin flip 10 times in a row. The vulnerability lies in the pseudorandom number generation that uses the previous block hash, which is predictable.

The solution contract (`GuessCoinFlip`) uses the same algorithm to predict the outcome and make the correct guess.

### Telephone Challenge Summary

The Telephone challenge explores the difference between `tx.origin` and `msg.sender` in Ethereum. The goal is to claim ownership of the contract by exploiting this distinction.

The solution contract (`TelephoneCall`) acts as an intermediary that calls the target contract, creating a scenario where `tx.origin` and `msg.sender` are different, allowing ownership to be claimed.

### Token Challenge Summary

The Token challenge demonstrates the dangers of integer underflow in Solidity. The goal is to gain a large number of tokens by exploiting a vulnerability in the `transfer` function.

The solution contract (`TokenOverflowHack`) calls the `transfer` function with a value of 1, even if the balance is 0. This will cause an underflow and give the attacker a large number of tokens.

### Delegation Challenge Summary

The Delegation challenge focuses on the `delegatecall` function and its security implications. The goal is to claim ownership of a contract by exploiting how `delegatecall` preserves the context (including storage) of the calling contract.

The solution directly calls the Delegation contract with the function signature of `pwn()`, which triggers the fallback function to execute the `pwn()` function via `delegatecall` in the context of the Delegation contract, changing the owner to the caller.

### Force Challenge Summary

The Force challenge explores a unique way to send ETH to a contract that has no payable functions. The goal is to make the target contract's balance greater than zero despite it having no mechanism to receive ETH.

The solution uses a contract that receives ETH and then self-destructs (`selfdestruct`), forcing its balance to be sent to the target contract. This demonstrates that there's no way to create a contract that is guaranteed to have zero ETH balance.

### Vault Challenge Summary

The Vault challenge explores the misconception that `private` variables in Solidity are truly private. The goal is to unlock a vault by discovering a password that's stored in a private variable.

The solution demonstrates that all data on the blockchain is public and can be read directly from storage, regardless of Solidity's visibility modifiers. By reading the storage slot containing the password and using it to call the unlock function, the vault can be unlocked.

### King Challenge Summary

The King challenge demonstrates a Denial of Service (DoS) attack vector in smart contracts. The goal is to prevent anyone else from becoming the "king" by exploiting a vulnerability in the way the contract handles ETH transfers.

The solution deploys a malicious contract that becomes the king but doesn't implement a receive or fallback function, making it impossible for the King contract to send ETH to it. This prevents anyone from claiming the throne afterwards, effectively breaking the game mechanics.

## Other Useful Commands

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```
