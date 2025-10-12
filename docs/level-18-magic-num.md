# Level 18: MagicNum Challenge

## Challenge Description

To solve this level, you need to provide the Ethernaut with a contract that responds to `whatIsTheMeaningOfLife()` with the right number.

The contract should be as simple as possible:
- Your solver contract's code needs to be at most 10 opcodes long (bytecode size ≤ 10 bytes)
- The function should return the number 42 (0x2a)

## Contract Location

The challenge contract is located at:
```
/contracts/level-18-magic-num/MagicNum.sol
```

## Understanding the Challenge

The `MagicNum` contract is extremely simple:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MagicNum {
    address public solver;

    constructor() {}

    function setSolver(address _solver) public {
        solver = _solver;
    }
}
```

At first glance, this seems trivial - just create a contract with a function that returns 42. However, the real challenge is the size constraint: our contract bytecode must be at most 10 bytes. 

A normal Solidity contract, even one that simply returns 42, would have far more than 10 bytes of bytecode when compiled due to the EVM's initialization code, function dispatching mechanisms, and other overhead.

### Key Observations

1. The `MagicNum` contract has a `solver` variable that needs to point to our solution contract.
2. Our solution contract needs to respond to `whatIsTheMeaningOfLife()` by returning 42.
3. The solution contract's runtime bytecode must be at most 10 bytes.
4. We can't write this using normal Solidity since the compiler will generate too much bytecode.

## Winning Strategy

To solve this challenge, we need to understand how EVM bytecode works and how to manually craft our own minimal contract. There are two main parts to a contract's bytecode:

1. **Initialization Code**: This runs only during contract creation and returns the runtime bytecode.
2. **Runtime Code**: This is the actual code that gets stored on the blockchain and runs when the contract is called.

We need to create a contract whose runtime code is at most 10 bytes and returns 42 when called with any function (including `whatIsTheMeaningOfLife()`).

## Hint for Thinking

Ask yourself:
* What's the simplest way to return a constant value in EVM bytecode?
* How can we return 42 without caring about what function was called?
* What EVM opcodes are needed to store and return a value?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Understanding EVM Opcodes

The solution requires knowledge of EVM opcodes to craft a minimal contract. Here are the opcodes we need:

1. `PUSH1 0x2a` (2 bytes): Pushes the value 42 (0x2a) onto the stack
2. `PUSH1 0x00` (2 bytes): Pushes 0 onto the stack (memory position)
3. `MSTORE` (1 byte): Stores the value 42 at memory position 0
4. `PUSH1 0x20` (2 bytes): Pushes 32 (0x20) onto the stack (return size in bytes)
5. `PUSH1 0x00` (2 bytes): Pushes 0 onto the stack (memory position to return from)
6. `RETURN` (1 byte): Returns 32 bytes starting from memory position 0

This totals exactly 10 bytes for our runtime code: `602a60005260206000f3`. This will return 42 for any function call.

### Implementation Details

The `MagicNumSolver` contract implements the logic to deploy our minimal bytecode contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MagicNumSolver {
    // This contract deploys a bytecode contract with size <= 10 bytes that returns 42 (0x2a)
    address public solver;
    
    function deploy() public {
        // Runtime code (10 bytes): returns 42 (0x2a) when whatIsTheMeaningOfLife() is called
        // PUSH1 0x2a (the answer, 42): 602a
        // PUSH1 0x00 (memory position): 6000
        // MSTORE (store 0x2a at memory position 0): 52
        // PUSH1 0x20 (return 32 bytes): 6020
        // PUSH1 0x00 (from memory position 0): 6000
        // RETURN (return memory from position 0, size 32 bytes): f3
        // Full runtime code: 602a60005260206000f3 (10 bytes)

        // Initialization code: copy runtime code to memory and return it
        // PUSH10 0x602a60005260206000f3 (runtime code): 69602a60005260206000f3
        // PUSH1 0x00 (memory position): 6000
        // MSTORE (store runtime code at memory position 0): 52
        // PUSH1 0x0a (return 10 bytes): 600a
        // PUSH1 0x16 (from memory position 22, as the runtime code is right-padded): 6016
        // RETURN (return memory from position 22, size 10 bytes): f3
        
        bytes memory bytecode = hex"69602a60005260206000f3600052600a6016f3";
        address _solver;

        assembly {
            _solver := create(0, add(bytecode, 0x20), mload(bytecode))
        }

        require(_solver != address(0), "Failed to deploy contract");
        solver = _solver;
    }

    // This function will help us verify that the deployed contract works correctly
    function verify(address _solver) public view returns (uint256) {
        (bool success, bytes memory data) = _solver.staticcall(abi.encodeWithSignature("whatIsTheMeaningOfLife()"));
        require(success, "Call failed");
        return abi.decode(data, (uint256));
    }
}
```

### Bytecode Explanation

Let's break down our bytecode solution:

1. **Runtime Code (10 bytes)**: `602a60005260206000f3`
   - `602a`: PUSH1 0x2a (pushes 42 onto the stack)
   - `6000`: PUSH1 0x00 (pushes 0 onto the stack - the memory position)
   - `52`: MSTORE (stores 42 at memory position 0)
   - `6020`: PUSH1 0x20 (pushes 32 onto the stack - size to return in bytes)
   - `6000`: PUSH1 0x00 (pushes 0 onto the stack - the memory position to return from)
   - `f3`: RETURN (returns 32 bytes from memory position 0)

2. **Initialization Code**: `69602a60005260206000f3600052600a6016f3`
   - This code is used during contract creation to place our runtime code on the blockchain
   - It stores our 10-byte runtime code in memory and returns it

### Execution Steps

1. **Deploy the MagicNum Contract**:
   ```shell
   npx hardhat deploy --tags magic-num --network sepolia
   ```

2. **Deploy the MagicNumSolver Contract**:
   ```shell
   npx hardhat deploy --tags magicnum-solution --network sepolia
   ```

3. **Execute the Solution**:
   ```shell
   MAGICNUM_SOLUTION_ADDRESS=0xYourSolverAddress TARGET_ADDRESS=0xYourMagicNumAddress npx hardhat run scripts/level-18-magic-num/execute-magic-num-exploit.ts --network sepolia
   ```

## Key Insights

1. **Low-Level EVM Knowledge**: This challenge demonstrates the importance of understanding the EVM at the bytecode level. While high-level languages like Solidity abstract away many details, sometimes you need to work at a lower level for optimization.

2. **Contract Size Optimization**: The EVM charges gas based on the amount of computation and storage used. Smaller contracts use less gas for deployment and may use less gas for execution.

3. **Creation vs. Runtime Code**: Every smart contract has both creation code (run once during deployment) and runtime code (stored on the blockchain). Understanding this distinction is crucial for advanced contract development.

4. **EVM Memory Model**: The challenge demonstrates how EVM uses memory for temporary storage and how to return data from a contract call.

5. **Assembly in Solidity**: The solution uses Solidity's inline assembly to create the contract using raw bytecode, showcasing how Solidity can interact with the EVM at a low level.
