// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDetectionBot {
    function handleTransaction(address user, bytes calldata msgData) external;
}

interface IForta {
    function setDetectionBot(address detectionBotAddress) external;
    function notify(address user, bytes calldata msgData) external;
    function raiseAlert(address user) external;
}


/**
 * @title DoubleEntryPointDetectionBot
 * @dev Detection bot to protect CryptoVault from being drained via LegacyToken
 * 
 * The vulnerability:
 * - CryptoVault.sweepToken() checks: token != underlying (DET)
 * - LegacyToken passes this check (LGT != DET)
 * - But LegacyToken.transfer() delegates to DET.delegateTransfer()
 * - This drains DET from vault, bypassing the protection!
 * 
 * The solution:
 * - Monitor delegateTransfer calls
 * - Check if origSender is the CryptoVault
 * - If so, raise alert to prevent the drain
 */
contract DoubleEntryPointDetectionBot is IDetectionBot {
    address public cryptoVault;
    IForta public forta;
    
    /**
     * @dev Constructor to set the CryptoVault and Forta addresses
     * @param _cryptoVault Address of the CryptoVault to protect
     * @param _forta Address of the Forta contract
     */
    constructor(address _cryptoVault, address _forta) {
        cryptoVault = _cryptoVault;
        forta = IForta(_forta);
    }
    
    /**
     * @dev Handle transaction callback from Forta
     * @param user The user who triggered the transaction (player)
     * @param msgData The calldata of the delegateTransfer function
     * 
     * msgData structure for delegateTransfer(address to, uint256 value, address origSender):
     * - bytes 0-3: function selector (4 bytes)
     * - bytes 4-35: to address (32 bytes)
     * - bytes 36-67: value (32 bytes)
     * - bytes 68-99: origSender address (32 bytes)
     */
    function handleTransaction(address user, bytes calldata msgData) external override {
        // Decode the origSender from msgData
        // delegateTransfer(address to, uint256 value, address origSender)
        // origSender is the 3rd parameter, starting at byte 68
        address origSender;
        
        // Extract origSender from calldata (bytes 68-99, but address is last 20 bytes)
        assembly {
            // Load the word at position 68 (skip 4 bytes selector + 32 bytes 'to' + 32 bytes 'value')
            origSender := calldataload(0x44) // 0x44 = 68 in decimal
        }
        
        // If the origSender is the CryptoVault, raise an alert
        // This means someone is trying to drain DET via the LegacyToken trick!
        if (origSender == cryptoVault) {
            forta.raiseAlert(user);
        }
    }
}
