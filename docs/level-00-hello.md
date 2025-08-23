# Level 0: Hello Ethernaut Challenge

## Challenge Description

This is the first level of the Ethernaut game. It's designed as a tutorial to get you familiar with how the game works and introduces basic smart contract interaction. The goal is to follow a series of clues by calling different functions on the contract, ultimately finding the password and using it to authenticate.

## Contract Location

The challenge contract is located at:
```
/contracts/level-00-hello/Instance.sol
```

## Understanding the Challenge

The `Instance` contract contains several functions that provide hints, leading you through a sequence of steps to find the password. The contract has a `cleared` boolean that you need to set to `true` by calling the `authenticate()` function with the correct password.

```solidity
function authenticate(string memory passkey) public {
    if (keccak256(abi.encodePacked(passkey)) == keccak256(abi.encodePacked(password))) {
        cleared = true;
    }
}
```

### The Challenge Flow

The contract is designed as a treasure hunt where each function gives you a clue about what to do next:

1. Start with `info()`
2. Follow the clue to call `info1()`
3. Follow the clue to call `info2("hello")`
4. Use the `infoNum` property to know which function to call next
5. Follow the clue from `theMethodName` to call the right method
6. Get the password and authenticate

## Winning Strategy

To win this challenge, you need to:

1. Call each function in the correct sequence
2. Extract the password from the contract
3. Call the `authenticate()` function with the correct password

## Hint for Thinking

Ask yourself:
- How can I interact with a contract's functions?
- How do I read public state variables from a contract?
- How do I pass parameters to contract functions?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves calling a series of functions in the correct order, following the clues provided by each function:

1. Call `info()` to get started
2. Call `info1()` as directed
3. Call `info2("hello")` with the parameter from the second hint
4. Read the `infoNum` value (42)
5. Call `info42()` based on the number from step 4
6. Read the `theMethodName` value
7. Call `method7123949()` as indicated by `theMethodName`
8. Retrieve the password from the contract
9. Call `authenticate()` with the retrieved password

### Solution Script

The solution script is located at:
```
/scripts/level-00-hello/solve-hello-ethernaut.ts
```

## Step-by-Step Solution Guide

### 1. Deploy the Instance Contract

If you're testing locally, deploy the Instance contract first:

```shell
npx hardhat deploy --tags hello-ethernaut
```

### 2. Execute the Solution

Run the solution script to automatically solve the challenge:

```shell
# Using the default address
npx hardhat run scripts/level-00-hello/solve-hello-ethernaut.ts --network sepolia

# Or specifying a custom address
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/level-00-hello/solve-hello-ethernaut.ts --network sepolia
```

### 3. Verify Your Success

After running the script, it will check if the challenge is cleared:

```shell
# The script will output:
Challenge cleared: true
```

If it shows `true`, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about smart contract interaction:

1. **Contract Interaction**: Understanding how to call functions and read state variables from smart contracts
2. **Function Parameters**: Learning how to pass parameters to contract functions
3. **Sequential Logic**: Following a logical sequence of steps to solve a problem
4. **Public vs Private Variables**: Understanding the difference between public and private variables in smart contracts
5. **String Comparison**: Learning how Solidity handles string comparisons using keccak256 hashing

This level serves as a gentle introduction to the Ethernaut game and basic smart contract interaction patterns that will be useful in more complex challenges.
