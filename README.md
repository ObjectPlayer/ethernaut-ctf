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
  - `level-10-reentrancy/`: Reentrancy challenge contracts
  - `level-11-elevator/`: Elevator challenge contracts
  - `level-12-privacy/`: Privacy challenge contracts
  - `level-13-gatekeeper-1/`: GatekeeperOne challenge contracts
  - `level-14-gatekeeper-2/`: GatekeeperTwo challenge contracts
  - `level-15-naught-coin/`: NaughtCoin challenge contracts
  - `level-16-preservation/`: Preservation challenge contracts
  - `level-17-recovery/`: Recovery challenge contracts
  - `level-18-magic-num/`: MagicNum challenge contracts
  - `level-19-allien/`: AlienCodex challenge contracts
  - `level-20-denial/`: Denial challenge contracts
  - `level-21-shop/`: Shop challenge contracts
  - `level-22-dex/`: Dex challenge contracts
  - `level-23-dex2/`: DexTwo challenge contracts
  - `level-24-puzzle-wallet/`: Puzzle Wallet challenge contracts
  - `level-25-motorbike/`: Motorbike challenge contracts
  - `level-26-double-entry-point/`: Double Entry Point challenge contracts
  - `level-27-good-samaritan/`: Good Samaritan challenge contracts
  - `level-28-gatekeeper3/`: Gatekeeper Three challenge contracts
  - `level-29-switch/`: Switch challenge contracts
  - `level-30-higher-order/`: HigherOrder challenge contracts
  - `level-31-stake/`: Stake challenge contracts
  - `level-32-impersonator/`: Impersonator challenge contracts
  - `level-33-magic-animal/`: Magic Animal Carousel challenge contracts
  - `level-34-bet-house/`: Bet House challenge contracts
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
  - `91-deploy-king-solution.ts`: Deploys the King solution contract
  - `100-deploy-reentrance.ts`: Deploys the Level 10 Reentrance contract
  - `101-deploy-reentrance-solution.ts`: Deploys the Reentrance solution contract
  - `110-deploy-elevator.ts`: Deploys the Level 11 Elevator contract
  - `111-deploy-elevator-solution.ts`: Deploys the Elevator solution contract
  - `120-deploy-privacy.ts`: Deploys the Level 12 Privacy contract
  - `121-deploy-privacy-solution.ts`: Deploys the Privacy solution contract
  - `130-deploy-gatekeeper-one.ts`: Deploys the Level 13 GatekeeperOne contract
  - `131-deploy-gatekeeper-one-solution.ts`: Deploys the GatekeeperOneExploit solution contract
  - `132-deploy-alternate-exploit.ts`: Deploys the AlternateExploit solution contract
  - `140-deploy-gatekeeper-two.ts`: Deploys the Level 14 GatekeeperTwo contract
  - `141-deploy-gatekeeper-two-solution.ts`: Deploys the GatekeeperTwoExploit solution contract
  - `150-deploy-naught-coin.ts`: Deploys the Level 15 NaughtCoin contract
  - `151-deploy-naught-coin-solution.ts`: Deploys the NaughtCoinExploit solution contract
  - `160-deploy-preservation.ts`: Deploys the Level 16 Preservation contract
  - `161-deploy-preservation-solution.ts`: Deploys the PreservationExploit solution contract
  - `170-deploy-recovery.ts`: Deploys the Level 17 Recovery contract
  - `171-deploy-recovery-solution.ts`: Deploys the RecoveryExploit solution contract
  - `180-deploy-magic-num.ts`: Deploys the Level 18 MagicNum contract
  - `181-deploy-magicnum-solution.ts`: Deploys the MagicNumSolver solution contract
  - `190-deploy-alien-codex.ts`: Deploys the Level 19 AlienCodex contract
  - `191-deploy-alien-codex-solution.ts`: Deploys the AlienCodexExploit solution contract
  - `200-deploy-denial.ts`: Deploys the Level 20 Denial contract
  - `201-deploy-denial-solution.ts`: Deploys the DenialExploit solution contract
  - `210-deploy-shop.ts`: Deploys the Level 21 Shop contract
  - `211-deploy-shop-solution.ts`: Deploys the ShopExploit solution contract
  - `220-deploy-dex.ts`: Deploys the Level 22 Dex contract and tokens
  - `221-deploy-dex-solution.ts`: Deploys the DexExploit solution contract
  - `230-deploy-dex-two.ts`: Deploys the Level 23 DexTwo contract and tokens
  - `231-deploy-dex-two-solution.ts`: Deploys the DexTwoExploit solution contract
  - `240-deploy-puzzle-wallet.ts`: Deploys the Level 24 PuzzleWallet proxy and implementation
  - `241-deploy-puzzle-wallet-solution.ts`: Deploys the PuzzleWalletExploit solution contract
  - `250-deploy-motorbike.ts`: Deploys the Level 25 Motorbike proxy and Engine implementation
  - `251-deploy-motorbike-solution.ts`: Deploys the MotorbikeExploit solution contract
  - `260-deploy-double-entry-point.ts`: Deploys the Level 26 DoubleEntryPoint contract
  - `261-deploy-double-entry-point-solution.ts`: Deploys the DoubleEntryPointSolution solution contract
  - `270-deploy-good-samaritan.ts`: Deploys the Level 27 GoodSamaritan contract
  - `271-deploy-good-samaritan-solution.ts`: Deploys the GoodSamaritanAttack solution contract
  - `280-deploy-gatekeeper-three.ts`: Deploys the Level 28 GatekeeperThree contract
  - `281-deploy-gatekeeper-three-solution.ts`: Deploys the GatekeeperThreeAttack solution contract
  - `290-deploy-switch.ts`: Deploys the Level 29 Switch contract
  - `291-deploy-switch-solution.ts`: Deploys the SwitchAttack solution contract
  - `300-deploy-higher-order.ts`: Deploys the Level 30 HigherOrder contract
  - `301-deploy-higher-order-solution.ts`: Deploys the HigherOrderAttack solution contract
  - `310-deploy-stake.ts`: Deploys the Level 31 Stake and WETH contracts
  - `311-deploy-stake-solution.ts`: Deploys the StakeAttack solution contract
  - `320-deploy-impersonator.ts`: Deploys the Level 32 Impersonator and ECLocker contracts
  - `321-deploy-impersonator-solution.ts`: Deploys the ImpersonatorAttack solution contract
  - `330-deploy-magic-animal-carousel.ts`: Deploys the Level 33 MagicAnimalCarousel contract
  - `331-deploy-magic-animal-carousel-solution.ts`: Deploys the MagicAnimalCarouselAttack solution contract
  - `340-deploy-bet-house.ts`: Deploys the Level 34 BetHouse, Pool, and PoolToken contracts
  - `341-deploy-bet-house-solution.ts`: Deploys the BetHouseAttack solution contract
- `scripts/`: Contains scripts for interacting with deployed contracts and utilities
  - `level-00-hello/`: Scripts for the Hello Ethernaut challenge
  - `level-01-fallback/`: Scripts for the Fallback challenge
  - `level-02-fallout/`: Scripts for the Fallout challenge
  - `level-03-coinflip/`: Scripts for the CoinFlip challenge
  - `level-04-telephone/`: Scripts for the Telephone challenge
  - `level-05-token/`: Scripts for the Token challenge
  - `level-06-delegation/`: Scripts for the Delegation challenge
  - `level-07-force/`: Scripts for the Force challenge
  - `level-08-vault/`: Scripts for the Vault challenge
  - `level-09-king/`: Scripts for the King challenge
  - `level-10-reentrancy/`: Scripts for the Reentrancy challenge
  - `level-11-elevator/`: Scripts for the Elevator challenge
  - `level-12-privacy/`: Scripts for the Privacy challenge
  - `level-13-gatekeeper-1/`: Scripts for the GatekeeperOne challenge
  - `level-14-gatekeeper-2/`: Scripts for the GatekeeperTwo challenge
  - `level-15-naught-coin/`: Scripts for the NaughtCoin challenge
  - `level-16-preservation/`: Scripts for the Preservation challenge
  - `level-17-recovery/`: Scripts for the Recovery challenge
  - `level-18-magic-num/`: Scripts for the MagicNum challenge
  - `level-19-alien-codex/`: Scripts for the AlienCodex challenge
  - `level-20-denial/`: Scripts for the Denial challenge
  - `level-21-shop/`: Scripts for the Shop challenge
  - `level-22-dex/`: Scripts for the Dex challenge
  - `level-23-dex2/`: Scripts for the DexTwo challenge
  - `level-24-puzzle-wallet/`: Scripts for the Puzzle Wallet challenge
  - `level-25-motorbike/`: Scripts for the Motorbike challenge
  - `level-26-double-entry-point/`: Scripts for the DoubleEntryPoint challenge
  - `level-27-good-samaritan/`: Scripts for the Good Samaritan challenge
  - `level-28-gatekeeper-three/`: Scripts for the Gatekeeper Three challenge
  - `level-29-switch/`: Scripts for the Switch challenge
  - `level-30-higher-order/`: Scripts for the HigherOrder challenge
  - `level-31-stake/`: Scripts for the Stake challenge
  - `level-32-impersonator/`: Scripts for the Impersonator challenge
  - `level-33-magic-animal-carousel/`: Scripts for the Magic Animal Carousel challenge
  - `level-34-bet-house/`: Scripts for the Bet House challenge
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
  - `level-07-force.md`: Documentation for the Force challenge
  - `level-08-vault.md`: Documentation for the Vault challenge
  - `level-09-king.md`: Documentation for the King challenge
  - `level-10-reentrancy.md`: Documentation for the Reentrancy challenge
  - `level-11-elevator.md`: Documentation for the Elevator challenge
  - `level-12-privacy.md`: Documentation for the Privacy challenge
  - `level-13-gatekeeper-one.md`: Documentation for the GatekeeperOne challenge
  - `level-14-gatekeeper-two.md`: Documentation for the GatekeeperTwo challenge
  - `level-15-naught-coin.md`: Documentation for the NaughtCoin challenge
  - `level-16-preservation.md`: Documentation for the Preservation challenge
  - `level-17-recovery.md`: Documentation for the Recovery challenge
  - `level-18-magic-num.md`: Documentation for the MagicNum challenge
  - `level-19-alien-codex.md`: Documentation for the AlienCodex challenge
  - `level-20-denial.md`: Documentation for the Denial challenge
  - `level-21-shop.md`: Documentation for the Shop challenge
  - `level-22-dex.md`: Documentation for the Dex challenge
  - `level-23-dex-two.md`: Documentation for the DexTwo challenge
  - `level-24-puzzle-wallet.md`: Documentation for the Puzzle Wallet challenge
  - `level-25-motorbike.md`: Documentation for the Motorbike challenge
  - `level-26-double-entry-point.md`: Documentation for the DoubleEntryPoint challenge
  - `level-27-good-samaritan.md`: Documentation for the Good Samaritan challenge
  - `level-28-gatekeeper-three.md`: Documentation for the Gatekeeper Three challenge
  - `level-29-switch.md`: Documentation for the Switch challenge
  - `level-30-higher-order.md`: Documentation for the HigherOrder challenge
  - `level-31-stake.md`: Documentation for the Stake challenge
  - `level-32-impersonator.md`: Documentation for the Impersonator challenge
  - `level-33-magic-animal-carousel.md`: Documentation for the Magic Animal Carousel challenge
  - `level-34-bet-house.md`: Documentation for the Bet House challenge
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
- [Level 10: Reentrancy](./docs/level-10-reentrancy.md)
- [Level 11: Elevator](./docs/level-11-elevator.md)
- [Level 12: Privacy](./docs/level-12-privacy.md)
- [Level 13: GatekeeperOne](./docs/level-13-gatekeeper-one.md)
- [Level 14: GatekeeperTwo](./docs/level-14-gatekeeper-two.md)
- [Level 15: NaughtCoin](./docs/level-15-naught-coin.md)
- [Level 16: Preservation](./docs/level-16-preservation.md)
- [Level 17: Recovery](./docs/level-17-recovery.md)
- [Level 18: MagicNum](./docs/level-18-magic-num.md)
- [Level 19: AlienCodex](./docs/level-19-alien-codex.md)
- [Level 20: Denial](./docs/level-20-denial.md)
- [Level 21: Shop](./docs/level-21-shop.md)
- [Level 22: DEX](./docs/level-22-dex.md)
- [Level 23: DexTwo](./docs/level-23-dex-two.md)
- [Level 24: Puzzle Wallet](./docs/level-24-puzzle-wallet.md)
- [Level 25: Motorbike](./docs/level-25-motorbike.md)
- [Level 26: DoubleEntryPoint](./docs/level-26-double-entry-point.md)
- [Level 27: Good Samaritan](./docs/level-27-good-samaritan.md)
- [Level 28: Gatekeeper Three](./docs/level-28-gatekeeper-three.md)
- [Level 29: Switch](./docs/level-29-switch.md)
- [Level 30: HigherOrder](./docs/level-30-higher-order.md)
- [Level 31: Stake](./docs/level-31-stake.md)
- [Level 32: Impersonator](./docs/level-32-impersonator.md)
- [Level 33: Magic Animal Carousel](./docs/level-33-magic-animal-carousel.md)
- [Level 34: Bet House](./docs/level-34-bet-house.md)

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

### Reentrancy Challenge Summary

The Reentrancy challenge introduces one of the most famous vulnerabilities in Ethereum smart contracts. The goal is to drain all the funds from the Reentrance contract by exploiting a vulnerability in its withdraw function.

The solution creates an exploit contract that takes advantage of the fact that the Reentrance contract updates balances after sending ETH. By implementing a receive function that recursively calls withdraw again before the first call completes, the exploit can drain all the funds from the contract.

### Elevator Challenge Summary

The Elevator challenge demonstrates how interfaces can be manipulated in Solidity. The goal is to reach the top floor of an elevator by exploiting a vulnerability in how the Elevator contract interacts with the Building interface.

The solution implements a malicious Building interface that returns inconsistent values for the same function call. By returning false on the first call to isLastFloor() and true on the second call, we can trick the Elevator contract into thinking we've reached the top floor.

### Privacy Challenge Summary

The Privacy challenge explores the misconception that `private` variables in Solidity are truly private. The goal is to unlock the contract by discovering a key that's stored in a private variable.

The solution demonstrates that all data on the blockchain is public and can be read directly from storage, regardless of Solidity's visibility modifiers. By determining the correct storage slot, reading the bytes32 value, converting it to bytes16, and using it as the key, we can unlock the Privacy contract. This can be done either directly with a script that reads storage or through a separate exploit contract.

### GatekeeperOne Challenge Summary

The GatekeeperOne challenge tests your understanding of gas manipulation, contract interactions, and bitwise operations. The goal is to pass three gates to become the entrant in the contract.

The solution involves three key elements:
1. Using an exploit contract as an intermediary to pass gate one (ensuring `msg.sender != tx.origin`)
2. Carefully controlling the gas sent with the transaction to pass gate two (making `gasleft() % 8191 == 0`)
3. Crafting a special bytes8 key using bitwise operations that satisfies multiple conditions to pass gate three

Multiple approaches are provided, with the `simple-exploit.ts` script being the most reliable solution. This challenge demonstrates the importance of understanding low-level Ethereum concepts including gas optimization, type conversions, and memory layout.

### GatekeeperTwo Challenge Summary

The GatekeeperTwo challenge also has three gates but with different mechanics. The solution exploits the fact that during a contract's constructor execution, its code size is zero. It also requires crafting a key using XOR operations to pass the third gate. This challenge demonstrates understanding of contract lifecycle, assembly operations, and bitwise manipulation.

### NaughtCoin Challenge Summary

The NaughtCoin challenge involves a custom ERC20 token with a timelock that prevents the token holder from transferring tokens for 10 years. The vulnerability stems from the incomplete access control implementation. While the contract overrides the `transfer` function with a timelock modifier, it doesn't restrict other token movement functions like `transferFrom`. The solution demonstrates the importance of understanding inheritance patterns and implementing comprehensive access controls across all related functions in a contract. The exploit contract uses the `transferFrom` function to move tokens from the player to itself, effectively bypassing the timelock restriction.

### Preservation Challenge Summary

The Preservation challenge focuses on the security implications of using `delegatecall` in Ethereum smart contracts. The vulnerability arises from a storage layout mismatch between the Preservation contract and the library contracts it calls via `delegatecall`. Since `delegatecall` preserves the storage context of the calling contract, this mismatch allows an attacker to overwrite critical storage variables including the contract's owner. The solution involves creating a malicious library with a matching storage layout and exploiting the delegatecall to modify the owner variable. This challenge highlights the importance of understanding storage layout when using delegatecall and the risks associated with upgradeable contract patterns.

### Recovery Challenge Summary

The Recovery challenge tests your understanding of how contract addresses are generated in Ethereum. After a token factory contract creates a token and someone sends it 0.001 ETH, the address of the token contract is lost. The challenge is to recover the lost ETH by computing the address of the token contract based on the deterministic contract creation formula in Ethereum (using the creator's address and nonce). Once the address is calculated, you can call the token's self-destruct function to recover the ETH. This challenge demonstrates the importance of understanding Ethereum's deterministic address generation and the implications of having permissionless destruction functions in contracts.

### MagicNum Challenge Summary

The MagicNum challenge requires deploying a contract that returns 42 (0x2a) with bytecode size <= 10 bytes. The solution involves understanding EVM opcodes and crafting minimal bytecode that can return 42 when called. The `MagicNumSolver` contract deploys this minimal bytecode contract using low-level assembly. This challenge teaches about EVM bytecode optimization and contract creation mechanics.

### AlienCodex Challenge Summary

The AlienCodex challenge requires claiming ownership of an alien contract. The vulnerability lies in the array length underflow in Solidity 0.5.0 (which doesn't have overflow protection). By causing the array length to underflow, we can access any storage slot in the contract. The solution exploits this to overwrite the owner address stored in slot 0. This challenge demonstrates the importance of understanding contract storage layout and the risks of unchecked arithmetic operations in older Solidity versions.

### Denial Challenge Summary

The Denial challenge requires preventing the owner from withdrawing funds by performing a Denial of Service (DoS) attack. The vulnerability lies in the `withdraw()` function which uses `.call()` to send ETH to a partner contract, forwarding all available gas. By becoming a malicious withdraw partner with a gas-consuming `receive()` function (infinite loop), we can consume all gas and prevent the subsequent `owner.transfer()` from executing. This challenge demonstrates the dangers of forwarding all gas to untrusted contracts and the importance of using the pull-over-push pattern for payments.

### Shop Challenge Summary

The Shop challenge requires buying an item for less than the asking price. The vulnerability lies in the `buy()` function calling `_buyer.price()` twice - once to check if the price is acceptable and once to set the final price. Between these calls, the `isSold` state changes. Our exploit implements a `view` function that reads the Shop's `isSold` state and returns different values accordingly: returning 100 on the first call to pass the check, and returning 1 on the second call to buy cheap. This challenge teaches that view functions can have state-dependent behavior by reading external contract state, and emphasizes the importance of caching external call results.

### DEX Challenge Summary

The DEX challenge requires draining the tokens from the Dex using price manuplation as the pric formulla is unaccurate. The DEX uses a simple linear pricing formula without any constant, making it vulnerable to price manipulation.

### DEX2 Challenge Summary

The DEX2 challenge requires draining the tokens from the Dex using milicios token, as there is no any check for tokens in the dex contract.

### PuzzleWallet Challenge Summary

The PuzzleWallet requires claiming ownership of the contract. The vulnerability lies in the `pendingAdmin` slot being writable by the owner, and the `admin` slot being writable by the pendingAdmin. By proposing a new admin and then exploiting the delegatecall vulnerability in the `setMaxBalance` function, we can overwrite the `admin` slot with our address, making us the owner.

### Motorbike Challenge Summary

The Motorbike challenge requires claiming ownership of the contract. The vulnerability lies in the `pendingAdmin` slot being writable by the owner, and the `admin` slot being writable by the pendingAdmin. By proposing a new admin and then exploiting the delegatecall vulnerability in the `setMaxBalance` function, we can overwrite the `admin` slot with our address, making us the owner.

### DoubleEntryPoint Challenge Summary

The DoubleEntryPoint challenge requires protecting a CryptoVault from being drained through a double entry point vulnerability. The vault holds DET tokens and checks that swept tokens aren't the underlying token. However, LegacyToken (LGT) delegates its transfers to DET, allowing someone to sweep LGT and drain DET from the vault. The solution involves creating a Forta detection bot that monitors `delegateTransfer` calls and raises an alert when the `origSender` is the CryptoVault, preventing the drain attack.

### Good Samaritan Challenge Summary

The Good Samaritan challenge requires draining all coins from a charitable wallet. The vulnerability lies in the error handling logic that catches `NotEnoughBalance()` errors and transfers all remaining funds. The GoodSamaritan tries to donate 10 coins, but if it catches a `NotEnoughBalance()` error, it assumes the wallet is empty and sends everything. Our exploit implements the `INotifyable` interface with a `notify()` callback that reverts with a fake `NotEnoughBalance()` error when receiving 10 coins, tricking the contract into transferring all 1,000,000 coins instead. This challenge demonstrates the risks of using custom error handling for control flow and trusting errors from external contracts.

### Gatekeeper Three Challenge Summary

The Gatekeeper Three challenge requires passing three gates to become the entrant. The vulnerabilities include: (1) A critical typo - `construct0r()` instead of `constructor()` - making it a callable public function that anyone can use to become owner, (2) Gate Two requires reading a "private" password from SimpleTrick's storage (slot 2), demonstrating that private storage variables are still publicly readable, (3) Gate Three requires the contract balance to be > 0.001 ETH and `owner.send()` to fail, which we achieve by making our attack contract the owner and reverting in its receive function. This challenge teaches about constructor naming vulnerabilities, storage visibility, low-level call return values, and the difference between msg.sender and tx.origin.

### Switch Challenge Summary

The Switch challenge requires flipping a switch to the "on" position by exploiting calldata manipulation. The contract has an `onlyOff` modifier that checks position 68 in calldata for the `turnSwitchOff()` selector, assuming standard ABI encoding. However, by manipulating the offset parameter in our calldata, we can place `turnSwitchOff()` at position 68 (to pass the check) while the actual data being called is `turnSwitchOn()` at position 96. This exploit works because the modifier uses a hardcoded position without validating the complete calldata structure. The challenge demonstrates the dangers of hardcoded calldata positions, the importance of understanding ABI encoding, and why assembly operations that bypass Solidity's type system can be risky.

### HigherOrder Challenge Summary

The HigherOrder challenge requires becoming the Commander by setting the treasury value to greater than 255. The vulnerability lies in a type mismatch between the function signature and assembly implementation. The `registerTreasury(uint8)` function signature suggests values are limited to 0-255, but the assembly code uses `calldataload(4)` which reads a full 32 bytes (uint256). By crafting raw calldata with a value > 255 and making a low-level call, we bypass ABI encoding and type checking. The assembly reads all 32 bytes and stores it in the treasury, allowing us to set treasury = 256 and claim leadership. This demonstrates how assembly operations bypass Solidity's type safety and why function signatures must match their implementations.

### Stake Challenge Summary

The Stake challenge requires draining the contract while meeting specific conditions: contract balance > 0, totalStaked > balance, you're a staker, and your stake = 0. The vulnerability is an accounting mismatch between ETH and WETH staking. The `StakeWETH()` function receives WETH tokens (ERC20) and increases `totalStaked`, but doesn't add to the contract's ETH balance. Meanwhile, `Unstake()` always sends native ETH regardless of what was staked. By staking WETH (increases totalStaked, no ETH added), then staking ETH (both increase), then unstaking everything (drains ETH), we create a mismatch where totalStaked > ETH balance. This teaches the critical lesson that different asset types must have separate accounting, and withdrawal logic must match what was deposited.

### Impersonator Challenge Summary

The Impersonator challenge requires opening an ECLocker door without being the authorized controller. The vulnerability lies in ECDSA signature malleability. For any valid ECDSA signature `(v, r, s)`, there exists a malleable signature `(v', r, n-s)` where `v' = v XOR 1` and `n` is the secp256k1 curve order. Both signatures recover to the same address! The ECLocker tracks used signatures by hashing `(r, s, v)`, but since the malleable signature has different `s` and `v` values, it has a different hash and bypasses the replay protection. The solution computes the malleable signature from the original one used during initialization and calls `open()` with it. This teaches the importance of using normalized signatures (requiring `s` to be in the lower half of the curve) or using audited libraries like OpenZeppelin's ECDSA which handles this automatically.

### Magic Animal Carousel Challenge Summary

The Magic Animal Carousel challenge requires breaking the rule that "the same animal must be there" after joining the carousel. Multiple vulnerabilities exist: (1) An operator precedence bug where `a << 160 + 16` evaluates as `(a << 160) + 16` instead of `a << 176`, causing animal bits to overlap with the nextId field, (2) An encoding inconsistency where `setAnimalAndSpin` applies an extra `>> 16` shift that `changeAnimal` doesn't, resulting in different encodings for the same animal name, (3) An owner bypass where calling `changeAnimal("", crateId)` clears the owner, allowing anyone to subsequently modify the animal, and (4) NextId manipulation where 12-character animal names can corrupt the carousel's nextId pointer via OR operations. The solution exploits the owner bypass: add an animal, clear the owner with an empty string, then change the animal. This teaches the importance of operator precedence awareness (always use parentheses!), consistent encoding across functions, and complete access control that doesn't allow unauthorized ownership clearing.

### Bet House Challenge Summary

The Bet House challenge requires becoming a bettor with only 5 PDT (Pool Deposit Tokens) when 20 wrapped tokens are required. The vulnerability is a cross-function reentrancy in Pool's `withdrawAll()` function. While the function uses `nonReentrant` modifier, it burns wrapped tokens AFTER the external ETH transfer via `.call()`. During the ETH callback, the attacker still has their wrapped token balance intact and can: (1) Re-deposit the returned PDT to increase their balance to 20 tokens, (2) Lock their deposits, and (3) Call `makeBet()` to become a bettor. After the callback returns, the tokens are burned, but the bettor status persists. This teaches that `nonReentrant` only protects against calling the same function again - other functions can still be called during reentrancy. The fix is to follow the checks-effects-interactions pattern and burn tokens BEFORE any external calls.

## Other Useful Commands

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
