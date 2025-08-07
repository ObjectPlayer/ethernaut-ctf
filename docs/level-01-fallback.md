# Level 1: Fallback Challenge

## Challenge Description

This level introduces the concept of contract ownership and fallback functions in Solidity. The goal is to claim ownership of the contract and then drain its funds. The challenge teaches important lessons about contract security, particularly around fallback functions and ownership control.

## Contract Location

The challenge contract is located at:
```
/contracts/level-01-fallback/fallback.sol
```

## Understanding the Challenge

The `Fallback` contract has the following key components:

1. **Ownership**: The contract has an `owner` variable that initially points to the deployer.
2. **Contributions**: A mapping that tracks ETH contributions from different addresses.
3. **Withdraw Function**: A function that allows the owner to withdraw all funds.
4. **Receive Function**: A fallback function that gets triggered when ETH is sent directly to the contract.

```solidity
// Key vulnerability in the receive function
receive() external payable {
    require(msg.value > 0 && contributions[msg.sender] > 0);
    owner = msg.sender;
}
```

The vulnerability lies in the `receive()` function, which allows anyone who has made a contribution (no matter how small) to become the owner by sending ETH directly to the contract.

## Winning Strategy

To win this challenge, you need to:

1. Make a small contribution to satisfy the `contributions[msg.sender] > 0` requirement
2. Send ETH directly to the contract to trigger the `receive()` function and become the owner
3. Call the `withdraw()` function to drain all funds from the contract

## Hint for Thinking

Ask yourself:
- How can I interact with a contract's fallback function?
- What conditions need to be met to trigger ownership transfer?
- How can I exploit a poorly designed ownership transfer mechanism?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution exploits the vulnerability in the `receive()` function to take ownership of the contract and then withdraw all funds:

1. Make a small contribution using the `contribute()` function (less than 0.001 ETH)
2. Send ETH directly to the contract to trigger the `receive()` function
3. Once ownership is transferred, call the `withdraw()` function to drain all funds

### Solution Script

The solution script is located at:
```
/scripts/level-01-fallback/solve-fallback.ts
```

## Step-by-Step Solution Guide

### 1. Deploy the Fallback Contract

If you're testing locally, deploy the Fallback contract first:

```shell
npx hardhat deploy --tags fallback
```

### 2. Execute the Solution

Run the solution script to automatically solve the challenge:

```shell
# Using the default address
npx hardhat run scripts/level-01-fallback/solve-fallback.ts --network sepolia

# Or specifying a custom address
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/level-01-fallback/solve-fallback.ts --network sepolia
```

### 3. Solution Walkthrough

The script performs the following steps:

1. **Initial Check**: Displays the current owner, your contribution, and contract balance
2. **Make Contribution**: Sends a small amount (10 wei) via the `contribute()` function
3. **Trigger Fallback**: Sends ETH directly to the contract to trigger the `receive()` function
4. **Ownership Check**: Verifies that you've successfully taken ownership
5. **Withdraw Funds**: Calls the `withdraw()` function to drain all funds
6. **Final Check**: Confirms the contract balance is zero

### 4. Verify Your Success

After running the script, it will check if the contract balance is zero:

```shell
# The script will output:
Contract balance after withdrawal: 0.0 ETH
🎉 Congratulations! You've completed the Fallback challenge! 🎉
```

If it shows this message, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about smart contract security:

1. **Fallback Function Security**: Fallback functions should be carefully designed and have proper access controls
2. **Ownership Control**: Critical functions like ownership transfer should have robust security checks
3. **Multiple Attack Vectors**: Attackers can combine multiple small vulnerabilities to achieve a significant exploit
4. **Value Checks**: Always validate the logic in conditions that control important state changes
5. **Economic Incentives**: Consider the economic incentives that might motivate an attacker

For secure contract development, always ensure that ownership transfers and fund withdrawals have proper access controls and validation checks.
