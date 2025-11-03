# Level 26: Double Entry Point Challenge

## Challenge Description

This level features a CryptoVault with special functionality, the `sweepToken` function. This is a common function used to retrieve tokens stuck in a contract. The CryptoVault operates with an underlying token that can't be swept, as it is an important core logic component of the CryptoVault. Any other tokens can be swept.

The underlying token is an instance of the DET token implemented in the `DoubleEntryPoint` contract definition and the CryptoVault holds 100 units of it. Additionally the CryptoVault also holds 100 of `LegacyToken` LGT.

In this level you should figure out where the bug is in CryptoVault and protect it from being drained out of tokens.

The contract features a Forta contract where any user can register its own detection bot contract. Forta is a decentralized, community-based monitoring network to detect threats and anomalies on DeFi, NFT, governance, bridges and other Web3 systems as quickly as possible. Your job is to implement a detection bot and register it in the Forta contract. The bot's implementation will need to raise correct alerts to prevent potential attacks or bug exploits.

**Things that might help:**
- How does a double entry point work for a token contract?

## Contract Location

The challenge contracts are located at:
```
/contracts/level-26-double-entry-point/Double_Entry.sol
```

## Understanding the Challenge

This level involves FOUR contracts that interact in a complex way:

### 1. CryptoVault

```solidity
contract CryptoVault {
    address public sweptTokensRecipient;
    IERC20 public underlying;

    function sweepToken(IERC20 token) public {
        require(token != underlying, "Can't transfer underlying token");
        token.transfer(sweptTokensRecipient, token.balanceOf(address(this)));
    }
}
```

The vault has a protection mechanism: it checks that `token != underlying` before sweeping. The underlying token is DET (DoubleEntryPoint).

### 2. LegacyToken (LGT)

```solidity
contract LegacyToken is ERC20, Ownable {
    DelegateERC20 public delegate;

    function delegateToNewContract(DelegateERC20 newContract) public onlyOwner {
        delegate = newContract;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        if (address(delegate) == address(0)) {
            return super.transfer(to, value);
        } else {
            return delegate.delegateTransfer(to, value, msg.sender);
        }
    }
}
```

LegacyToken can delegate its transfer calls to another contract. When a delegate is set, calling `transfer()` on LGT actually calls `delegateTransfer()` on the delegate contract.

### 3. DoubleEntryPoint (DET)

```solidity
contract DoubleEntryPoint is ERC20, DelegateERC20, Ownable {
    address public cryptoVault;
    address public player;
    address public delegatedFrom;
    Forta public forta;

    modifier fortaNotify() {
        address detectionBot = address(forta.usersDetectionBots(player));
        uint256 previousValue = forta.botRaisedAlerts(detectionBot);
        forta.notify(player, msg.data);
        _;
        if (forta.botRaisedAlerts(detectionBot) > previousValue) 
            revert("Alert has been triggered, reverting");
    }

    function delegateTransfer(address to, uint256 value, address origSender)
        public
        override
        onlyDelegateFrom
        fortaNotify
        returns (bool)
    {
        _transfer(origSender, to, value);
        return true;
    }
}
```

DET implements `delegateTransfer()` which:
- Can only be called by the `delegatedFrom` address (LGT)
- Has a `fortaNotify` modifier that calls the detection bot
- Transfers tokens from `origSender` to `to`

### 4. Forta

```solidity
contract Forta is IForta {
    mapping(address => IDetectionBot) public usersDetectionBots;
    mapping(address => uint256) public botRaisedAlerts;

    function setDetectionBot(address detectionBotAddress) external override {
        usersDetectionBots[msg.sender] = IDetectionBot(detectionBotAddress);
    }

    function notify(address user, bytes calldata msgData) external override {
        if (address(usersDetectionBots[user]) == address(0)) return;
        try usersDetectionBots[user].handleTransaction(user, msgData) {
            return;
        } catch {}
    }

    function raiseAlert(address user) external override {
        if (address(usersDetectionBots[user]) != msg.sender) return;
        botRaisedAlerts[msg.sender] += 1;
    }
}
```

Forta allows users to register detection bots and raises alerts when bots detect suspicious activity.

## The Vulnerability: Double Entry Point Bypass

### The Attack Flow

```
1. Attacker calls: cryptoVault.sweepToken(LegacyToken)
   ↓
2. CryptoVault checks: LegacyToken != DoubleEntryPoint ✅ PASSES
   ↓
3. CryptoVault calls: LegacyToken.transfer(recipient, balance)
   ↓
4. LegacyToken has delegate set, so it calls: 
   DoubleEntryPoint.delegateTransfer(recipient, balance, cryptoVault)
   ↓
5. DET transfers from origSender (cryptoVault) to recipient
   ↓
6. Result: DET tokens drained from vault! 💥
```

### Why This Works

The key issue is the **double entry point**:
- The vault holds DET tokens
- But you can transfer those DET tokens through TWO different entry points:
  1. Calling `DET.transfer()` directly ❌ (blocked by vault's check)
  2. Calling `LGT.transfer()` which delegates to `DET.delegateTransfer()` ✅ (bypasses the check!)

The vault's protection only checks if the token address is different, but doesn't realize that LGT is just a proxy to DET.

### Visual Representation

```
CryptoVault State:
┌──────────────────────┐
│   CryptoVault        │
│                      │
│  Underlying: DET     │
│                      │
│  Balances:           │
│  - 100 DET ⚠️        │
│  - 100 LGT           │
└──────────────────────┘

Attack Vector:
sweepToken(LGT) 
  → LGT != DET ✅ 
  → LGT.transfer() 
  → delegate to DET.delegateTransfer() 
  → transfers DET from vault! 💥
```

## The Solution: Forta Detection Bot

We need to create a detection bot that monitors `delegateTransfer` calls and raises an alert when the `origSender` is the CryptoVault.

### Detection Bot Implementation

```solidity
contract DoubleEntryPointDetectionBot is IDetectionBot {
    address public cryptoVault;
    IForta public forta;
    
    constructor(address _cryptoVault, address _forta) {
        cryptoVault = _cryptoVault;
        forta = IForta(_forta);
    }
    
    function handleTransaction(address user, bytes calldata msgData) external override {
        // Decode the origSender from msgData
        // delegateTransfer(address to, uint256 value, address origSender)
        // origSender is the 3rd parameter, at byte position 68
        address origSender;
        
        assembly {
            origSender := calldataload(0x44) // 0x44 = 68 in decimal
        }
        
        // If the origSender is the CryptoVault, raise an alert
        if (origSender == cryptoVault) {
            forta.raiseAlert(user);
        }
    }
}
```

### How It Works

1. **fortaNotify Modifier**: When `delegateTransfer` is called, the modifier:
   - Gets the player's registered detection bot
   - Calls `forta.notify(player, msg.data)`
   - Forta calls `detectionBot.handleTransaction(player, msg.data)`
   - After execution, checks if alerts increased
   - If alerts increased, reverts the transaction

2. **Detection Logic**: The bot:
   - Receives the calldata of `delegateTransfer`
   - Extracts the `origSender` parameter (3rd argument)
   - Checks if `origSender == cryptoVault`
   - If yes, calls `forta.raiseAlert(user)`

3. **Protection**: When an alert is raised:
   - The `fortaNotify` modifier detects the increased alert count
   - It reverts with "Alert has been triggered, reverting"
   - The sweep transaction fails, protecting the vault

### Calldata Structure

Understanding the calldata structure is crucial:

```
delegateTransfer(address to, uint256 value, address origSender)

Calldata Layout:
Bytes  0-3:   Function selector (4 bytes)
Bytes  4-35:  'to' address (32 bytes)
Bytes 36-67:  'value' uint256 (32 bytes)
Bytes 68-99:  'origSender' address (32 bytes)

To extract origSender:
- Position: 4 (selector) + 32 (to) + 32 (value) = 68 bytes = 0x44 hex
- Use: calldataload(0x44)
```

## Exploitation Steps

### Step 1: Deploy Detection Bot

```bash
npx hardhat deploy --tags double-entry-point-solution --network sepolia
```

Or with specific addresses:
```bash
VAULT_ADDRESS=0xVault FORTA_ADDRESS=0xForta npx hardhat deploy --tags double-entry-point-solution --network sepolia
```

### Step 2: Register Detection Bot

```bash
DETECTION_BOT_ADDRESS=0xBot FORTA_ADDRESS=0xForta DET_ADDRESS=0xDET npx hardhat run scripts/level-26-double-entry-point/register-detection-bot.ts --network sepolia
```

### Step 3: Test the Protection

```bash
VAULT_ADDRESS=0xVault LGT_ADDRESS=0xLGT DET_ADDRESS=0xDET npx hardhat run scripts/level-26-double-entry-point/test-sweep.ts --network sepolia
```

Expected result: The sweep attempt should fail with "Alert has been triggered, reverting"

## Key Concepts

### 1. Double Entry Point Pattern

A double entry point exists when the same asset can be accessed through multiple interfaces:
- **Direct Access**: `DET.transfer()` - blocked by vault
- **Delegated Access**: `LGT.transfer()` → `DET.delegateTransfer()` - bypasses protection

### 2. Delegated Transfers

Legacy tokens sometimes delegate to new implementations:
```solidity
// Old token delegates to new token
function transfer(address to, uint256 value) public override returns (bool) {
    if (address(delegate) == address(0)) {
        return super.transfer(to, value);  // Original behavior
    } else {
        return delegate.delegateTransfer(to, value, msg.sender);  // Delegate
    }
}
```

### 3. Monitoring and Detection

The Forta pattern demonstrates:
- **Proactive Monitoring**: Check transactions before they complete
- **Alert System**: Raise alerts when suspicious patterns detected
- **Transaction Reverting**: Block malicious transactions

### 4. Calldata Decoding

Understanding calldata structure is essential for monitoring:
```solidity
// Extract function arguments from calldata
assembly {
    argValue := calldataload(offset)
}
```

## Security Lessons

1. **Check All Entry Points**: When protecting an asset, consider ALL ways it can be accessed
   - Direct calls
   - Delegated calls
   - Proxy patterns
   - Multiple token interfaces

2. **Token Delegation Risks**: Be cautious with tokens that delegate transfers
   - They may bypass access controls
   - The actual transfer may happen in a different contract
   - Original checks may not apply

3. **Defense in Depth**: Multiple layers of protection:
   - Access control (vault's `token != underlying` check)
   - Monitoring (Forta detection bot)
   - Automated response (alert-triggered revert)

4. **Monitoring Patterns**: Implement robust monitoring:
   - Monitor critical functions
   - Check transaction context (who initiated?)
   - Raise alerts for suspicious patterns
   - Automatically block malicious transactions

## Common Pitfalls

1. **Not Understanding Delegation**: Failing to recognize that LGT.transfer() delegates to DET
2. **Incorrect Calldata Parsing**: Getting the wrong offset for origSender
3. **Not Registering Bot**: Forgetting to call `forta.setDetectionBot()`
4. **Wrong Alert Logic**: Raising alerts for normal transfers instead of just vault transfers

## Prevention in Real Contracts

To prevent this vulnerability:

1. **Check Effective Sender**: Don't just check the token address, verify who's actually transferring
2. **Blacklist Problematic Tokens**: Maintain a list of tokens known to delegate
3. **Monitor All Transfer Patterns**: Use detection bots to catch unusual transfer flows
4. **Token Whitelisting**: Only allow sweeping explicitly approved tokens
5. **Comprehensive Testing**: Test with tokens that have delegation mechanisms

## References

- [Forta Network](https://forta.org/) - Decentralized monitoring network
- [ERC20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Proxy Patterns in Solidity](https://docs.openzeppelin.com/contracts/4.x/api/proxy)
- [Calldata Layout](https://docs.soliditylang.org/en/latest/abi-spec.html)

## Deployment

Deploy the challenge contracts:
```bash
npx hardhat deploy --tags level-26 --network sepolia
```

Deploy the solution:
```bash
npx hardhat deploy --tags double-entry-point-solution --network sepolia
```

Register the bot and test:
```bash
# Register
DETECTION_BOT_ADDRESS=0xBot FORTA_ADDRESS=0xForta DET_ADDRESS=0xDET \
  npx hardhat run scripts/level-26-double-entry-point/register-detection-bot.ts --network sepolia

# Test
VAULT_ADDRESS=0xVault LGT_ADDRESS=0xLGT DET_ADDRESS=0xDET \
  npx hardhat run scripts/level-26-double-entry-point/test-sweep.ts --network sepolia
```
