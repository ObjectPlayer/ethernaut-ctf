# Level 2: Fallout Challenge

## Challenge Description

This level introduces the concept of constructor naming and the importance of careful code review. The goal is to claim ownership of the contract by exploiting a naming error in what was intended to be the constructor function. This challenge teaches important lessons about legacy constructor patterns and the dangers of typos in critical contract code.

## Contract Location

The challenge contract is located at:
```
/contracts/level-02-fallout/fallout.sol
```

## Understanding the Challenge

The `Fallout` contract has the following key components:

1. **Ownership**: The contract has an `owner` variable that should be set during contract creation.
2. **Allocations**: A mapping that tracks ETH allocations from different addresses.
3. **CollectAllocations Function**: A function that allows the owner to withdraw all funds.
4. **Constructor Function**: What appears to be a constructor but has a critical typo.

```solidity
/* constructor */
function Fal1out() public payable {
    owner = payable(msg.sender);
    allocations[owner] = msg.value;
}
```

The vulnerability lies in the `Fal1out()` function, which was intended to be a constructor (as indicated by the comment) but has two critical issues:
1. It uses the old pre-Solidity 0.4.22 constructor syntax (function with the same name as the contract)
2. There's a typo in the function name (`Fal1out` instead of `Fallout`) - note the digit "1" instead of letter "l"

This makes it a regular public function that can be called by anyone at any time to claim ownership.

## Winning Strategy

To win this challenge, you need to:

1. Call the `Fal1out()` function to become the owner of the contract
2. Optionally, call the `collectAllocations()` function to withdraw any funds

## Hint for Thinking

Ask yourself:
- How are constructors defined in different Solidity versions?
- What happens when there's a typo in a function that's meant to be a constructor?
- How can you identify naming discrepancies in contract code?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution exploits the typo in the constructor function name to take ownership of the contract:

1. Call the `Fal1out()` function, which was intended to be a constructor but is actually a regular function due to the typo
2. Once ownership is transferred, you can optionally call `collectAllocations()` to withdraw any funds

### Solution Script

The solution script is located at:
```
/scripts/level-02-fallout/solve-fallout.ts
```

## Step-by-Step Solution Guide

### 1. Deploy the Fallout Contract

If you're testing locally, deploy the Fallout contract first:

```shell
npx hardhat deploy --tags fallout
```

### 2. Execute the Solution

Run the solution script to automatically solve the challenge:

```shell
# Using the default address
npx hardhat run scripts/level-02-fallout/solve-fallout.ts --network sepolia

# Or specifying a custom address
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/level-02-fallout/solve-fallout.ts --network sepolia
```

### 3. Solution Walkthrough

The script performs the following steps:

1. **Initial Check**: Displays the current owner and contract balance
2. **Call Fal1out**: Calls the `Fal1out()` function to take ownership
3. **Ownership Check**: Verifies that you've successfully taken ownership
4. **Withdraw Funds**: Optionally calls the `collectAllocations()` function to drain any funds
5. **Final Check**: Confirms the contract balance is zero

### 4. Verify Your Success

After running the script, it will check if you've become the owner:

```shell
# The script will output:
New owner: 0xYourAddress
✅ Ownership successfully taken!
```

If it shows this message, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about smart contract security:

1. **Constructor Naming**: In older Solidity versions (<0.4.22), constructors were defined as functions with the same name as the contract, which could lead to dangerous typos
2. **Code Review Importance**: A simple typo in a critical function can lead to catastrophic security vulnerabilities
3. **Modern Syntax**: Modern Solidity uses the explicit `constructor` keyword, which prevents this specific vulnerability
4. **Documentation vs. Code**: Comments (like `/* constructor */`) don't affect code execution - the actual code implementation is what matters
5. **Legacy Code Risks**: When working with older Solidity code, be extra vigilant about constructor definitions

For secure contract development, always use modern Solidity patterns, conduct thorough code reviews, and consider using automated tools to detect common vulnerabilities.
