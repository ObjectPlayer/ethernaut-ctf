# Level 6: Delegation Challenge

## Challenge Description

This level introduces the concept of `delegatecall` and how it can be exploited when used improperly. The goal is to claim ownership of the Delegation contract by exploiting the delegatecall functionality.

## Contract Location

The challenge contract is located at:
```
/contracts/level-06-delegation/Delegation.sol
```

## Understanding the Challenge

The challenge consists of two contracts:

1. `Delegate`: A simple contract with an `owner` variable and a `pwn()` function that sets the owner to `msg.sender`.
   
2. `Delegation`: A contract that delegates calls to the `Delegate` contract using `delegatecall` in its fallback function.

```solidity
// Delegate Contract
contract Delegate {
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }

    function pwn() public {
        owner = msg.sender;
    }
}

// Delegation Contract
contract Delegation {
    address public owner;
    Delegate delegate;

    constructor(address _delegateAddress) {
        delegate = Delegate(_delegateAddress);
        owner = msg.sender;
    }

    fallback() external {
        (bool result,) = address(delegate).delegatecall(msg.data);
        if (result) {
            this;
        }
    }
}
```

### The Vulnerability

The vulnerability lies in the use of `delegatecall` in the fallback function. When a function is called via `delegatecall`, it executes in the context of the calling contract, not the contract where the code is defined. This means:

1. The code of the called contract (`Delegate`) runs in the context of the calling contract (`Delegation`)
2. Storage layout must be identical between the two contracts for delegatecall to work as expected
3. State variables like `owner` in the `Delegate` contract will modify the `owner` in the `Delegation` contract

## Winning Strategy

To win this challenge, you need to:

1. Call the Delegation contract with the function signature for `pwn()` to trigger the fallback function
2. The fallback function will use `delegatecall` to execute the `pwn()` function in the context of the Delegation contract
3. This will change the `owner` of the Delegation contract to your address

## Hint for Thinking

Ask yourself:

* What happens when a function is executed via `delegatecall`?
* How can you trigger the fallback function with specific data?
* How do you generate a function signature in Ethereum?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves calling the Delegation contract with the function signature of `pwn()`, which will trigger the fallback function and execute the `pwn()` function via delegatecall.

### Solution Approach

We'll directly call the Delegation contract with the function signature of `pwn()` as the transaction data. This will:

1. Trigger the fallback function of the Delegation contract
2. Execute the `pwn()` function via delegatecall in the context of the Delegation contract
3. Change the owner of the Delegation contract to our address

## Step-by-Step Solution Guide

### 1. Deploy the Delegation Contract

If you're testing locally, deploy the Delegation contract:

```shell
npx hardhat deploy --tags delegation
```

### 2. Execute the Exploit

Run the provided script to exploit the delegatecall vulnerability:

```shell
npx hardhat run scripts/level-06-delegation/execute-delegation-exploit.ts --network sepolia
```

Or specify a custom target address:

```shell
CONTRACT_ADDRESS=0xYourDelegationAddress npx hardhat run scripts/level-06-delegation/execute-delegation-exploit.ts --network sepolia
```

The script will:
1. Calculate the function signature for `pwn()`
2. Send a transaction to the Delegation contract with this signature as data
3. This will trigger the fallback function and execute the `pwn()` function via delegatecall
4. Check if the owner has been changed to your address

### 3. Verify Your Success

After executing the solution, the script will check if the owner of the Delegation contract has been changed to your address.

If you've successfully claimed ownership, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about `delegatecall` and contract security:

1. **delegatecall Context**: When using `delegatecall`, the code is executed in the context of the calling contract, not the contract where the code is defined.

2. **Storage Layout**: Both contracts must have the same storage layout for `delegatecall` to work as expected. In this case, both contracts have `address public owner` as their first state variable.

3. **Function Signatures**: Ethereum calls are identified by the first 4 bytes of the keccak256 hash of the function signature. This is how the contract knows which function to execute.

4. **Fallback Functions**: Fallback functions are executed when a contract is called with data that doesn't match any function signature, making them powerful but potentially dangerous.

5. **Secure Delegatecall**: Always be extremely careful when using `delegatecall` and ensure that the called contract is trusted and has compatible storage layout.
