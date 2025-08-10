# Level 4: Telephone Challenge

## Challenge Description

This level introduces the concept of transaction origin and message sender in Ethereum. The goal is to claim ownership of the contract by exploiting the difference between `tx.origin` and `msg.sender`.

## Contract Location

The challenge contract is located at:
```
/contracts/level-04-telephone/Telephone.sol
```

## Understanding the Challenge

The `Telephone` contract has a simple ownership mechanism and a function to change the owner:

```solidity
function changeOwner(address _owner) public {
    if (tx.origin != msg.sender) {
        owner = _owner;
    }
}
```

### The Vulnerability

The contract checks if `tx.origin` is different from `msg.sender` before allowing ownership change. This is a security vulnerability because:

- `tx.origin` is the original external account (EOA) that initiated the transaction
- `msg.sender` is the immediate account (EOA or contract) that called the function

When a user interacts with a contract directly, `tx.origin` and `msg.sender` are the same. However, when the interaction happens through an intermediary contract, they differ.

## Winning Strategy

To win this challenge, you need to:

1. Create an intermediary contract that calls the `changeOwner()` function
2. Call your intermediary contract from your EOA, making `tx.origin` your address and `msg.sender` your contract's address
3. Pass your address as the new owner parameter

## Hint for Thinking

Ask yourself:
- What's the difference between `tx.origin` and `msg.sender`?
- How can you make these values different when calling a function?
- Why might using `tx.origin` for authentication be dangerous?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves creating an intermediary contract that calls the Telephone contract:

1. Create a contract that takes the Telephone contract address as a constructor parameter
2. Implement a function that calls `changeOwner()` on the Telephone contract
3. When you call this function from your EOA, the condition `tx.origin != msg.sender` will be true

### Solution Contract

The solution contract (`TelephoneCall`) is located at:
```
/contracts/level-04-telephone/solution/TelephoneCall.sol
```

This contract:
- Takes the address of the Telephone contract as a constructor parameter
- Implements a `claimOwnership()` function that calls the target contract's `changeOwner()` function with your address

## Step-by-Step Solution Guide

### 1. Deploy the Telephone Contract

If you're testing locally, deploy the Telephone contract first:

```shell
npx hardhat deploy --tags telephone
```

### 2. Deploy the Solution Contract

Deploy the TelephoneCall contract, passing the address of the Telephone contract:

```shell
# Using the deployment script with tags
npx hardhat deploy --tags telephone-solution --network sepolia

# Or specifying a custom target address
TARGET_ADDRESS=0xYourTelephoneAddress npx hardhat deploy --tags telephone-solution --network sepolia
```

### 3. Execute the Solution

Call the `claimOwnership()` function to take ownership of the Telephone contract:

```shell
# Using the provided script
npx hardhat run scripts/level-04-telephone/execute-telephone-call.ts --network sepolia

# Or with a custom contract address
CONTRACT_ADDRESS=0xYourTelephoneCallAddress npx hardhat run scripts/level-04-telephone/execute-telephone-call.ts --network sepolia
```

### 4. Verify Your Success

After executing the solution, check the owner of the Telephone contract:

```shell
# You can use Etherscan or a similar block explorer to check the owner
# Or write a script to read the public variable
```

If the owner is now your address, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about contract security:

1. **tx.origin vs. msg.sender**: Understanding the difference between these two values is crucial for secure contract development
2. **Phishing with tx.origin**: Using `tx.origin` for authentication is vulnerable to phishing attacks where a malicious contract can trick users into performing actions on their behalf
3. **Proper Authentication**: Always use `msg.sender` for authentication instead of `tx.origin`
4. **Contract Interactions**: Be aware of how contracts interact with each other and the security implications

For secure contract development, avoid using `tx.origin` for authentication purposes, as it can lead to phishing vulnerabilities where a malicious contract can trick users into performing unwanted actions.
