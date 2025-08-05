# Level 3: CoinFlip Challenge

## Challenge Description

This level introduces the concept of randomness in the blockchain. The goal is to correctly guess the outcome of a coin flip 10 times in a row. At first glance, this seems nearly impossible with a 1/1024 probability, but there's a vulnerability in how the randomness is generated.

## Contract Location

The challenge contract is located at:
```
/contracts/level-03-coin-flip/CoinFlip.sol
```

## Understanding the Challenge

The `CoinFlip` contract uses the following logic to determine the flip result:

```solidity
uint256 blockValue = uint256(blockhash(block.number - 1));
uint256 coinFlip = blockValue / FACTOR;
bool side = coinFlip == 1 ? true : false;
```

### The Vulnerability

The contract uses the previous block's hash as a source of randomness. However, in Ethereum, this value is accessible to all contracts within the same block, making it predictable. This is a common mistake in smart contract development - using blockchain data as a source of randomness when it's actually deterministic.

## Winning Strategy

To win this challenge, you need to:

1. Predict the outcome of the coin flip by using the same algorithm as the contract
2. Call the contract's `flip()` function with your prediction
3. Repeat this process 10 times in a row

## Hint for Thinking

Ask yourself:
- Is `blockhash(block.number - 1)` truly random?
- Can another contract access and use this same value?
- What happens if you replicate the exact same calculation in your own contract?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves creating a contract that:
1. Uses the same algorithm to calculate the expected outcome
2. Calls the target contract with the predicted result

### Solution Contract

The solution contract (`GuessCoinFlip`) is located at:
```
/contracts/level-03-coin-flip/solution/CoinFlipGues.sol
```

This contract:
- Takes the address of the CoinFlip contract as a constructor parameter
- Implements a `getCoinFlip()` function that:
  - Calculates the expected flip result using the same algorithm
  - Calls the target contract's `flip()` function with the predicted value

## Step-by-Step Solution Guide

### 1. Deploy the CoinFlip Contract

If you're testing locally, deploy the CoinFlip contract first:

```shell
npx hardhat deploy --tags coin-flip
```

### 2. Deploy the Solution Contract

Deploy the GuessCoinFlip contract, passing the address of the CoinFlip contract:

```shell
# Using the deployment script with tags
npx hardhat deploy --tags coin-flip-solution --network sepolia
```

### 3. Execute the Solution

Call the `getCoinFlip()` function 10 times to win the challenge. You can use the Hardhat console to interact with the contract:

```shell
# Start the Hardhat console
npx hardhat console --network sepolia

# Then in the console:
const GuessCoinFlip = await ethers.getContractFactory("GuessCoinFlip")
const guessCoinFlip = await GuessCoinFlip.attach("0xYourContractAddress")
const tx = await guessCoinFlip.getCoinFlip()
const receipt = await tx.wait()
console.log("Transaction successful:", receipt.hash)
```

**Note**: You need to call this function 10 times, but you must wait for a new block between each call. In Ethereum mainnet or testnets like Sepolia, this happens naturally as blocks are mined approximately every 12-15 seconds. You can run the above code in the console multiple times (waiting between calls) until you reach 10 consecutive wins.

### 4. Verify Your Success

After calling the function 10 times successfully, check the `consecutiveWins` counter in the CoinFlip contract:

```shell
# You can use Etherscan or a similar block explorer to check the value
# Or write a script to read the public variable
```

If the value is 10, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about randomness in blockchain:

1. **Blockchain Determinism**: All data on the blockchain is deterministic and publicly accessible
2. **Pseudo-randomness Vulnerabilities**: Using blockchain data like block hashes for randomness is insecure
3. **Proper Randomness Sources**: For true randomness, consider using oracles like Chainlink VRF

For secure random number generation in production contracts, always use a verifiable random function (VRF) from a trusted oracle service.
