# Level 5: Token Challenge

## Challenge Description

This level introduces the concept of integer underflow, a common vulnerability in older versions of Solidity. The goal is to gain a large number of tokens by exploiting this vulnerability.

## Contract Location

The challenge contract is located at:
```
/contracts/level-05-token/Token.sol
```

## Understanding the Challenge

The `Token` contract has a `transfer` function that contains a subtle flaw:

```solidity
function transfer(address _to, uint256 _value) public returns (bool) {
    require(balances[msg.sender] - _value >= 0);
    balances[msg.sender] -= _value;
    balances[_to] += _value;
    return true;
}
```

### The Vulnerability

The vulnerability lies in the line `require(balances[msg.sender] - _value >= 0);`. In Solidity versions before 0.8.0, arithmetic operations do not revert on overflow or underflow. If `balances[msg.sender]` is less than `_value`, the subtraction will underflow, resulting in a very large positive number, which will pass the `require` check. This allows a user to transfer more tokens than they actually own.

## Winning Strategy

To win this challenge, you need to:

1.  Start with a small or zero balance of tokens.
2.  Call the `transfer` function with a `_value` greater than your current balance.
3.  This will cause an underflow, giving your address a very large token balance.

## Hint for Thinking

Ask yourself:

*   What happens when you subtract a larger number from a smaller number in an unsigned integer?
*   How did Solidity versions before 0.8.0 handle integer underflow?
*   How can you exploit this behavior to manipulate your token balance?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves calling the `transfer` function with a value greater than your balance, which will cause an underflow and grant you a large number of tokens.

### Solution Contract

A solution contract is not strictly necessary for this challenge, as it can be completed by calling the `transfer` function directly. However, a contract can be used to automate the process. The provided solution uses a script to execute the attack.

## Step-by-Step Solution Guide

### 1. Deploy the Token Contract

If you're testing locally, deploy the Token contract first:

```shell
npx hardhat deploy --tags token
```


### 2. Deploy the Solution Contract

Deploy the TokenOverFlowHack contract, passing the address of the Token contract:

```shell
# Using the deployment script with tags
npx hardhat deploy --tags token-solution --network sepolia

# Or specifying a custom target address
TARGET_ADDRESS=0xYourTokenAddress npx hardhat deploy --tags token-solution --network sepolia
```

### 3. Execute the Solution

Run the provided script to execute the underflow attack:

```shell
npx hardhat run scripts/level-05-token/execute-token-claim.ts --network sepolia
```

This script will call the `transfer` function with a value of 1, even if your balance is 0. This will cause the underflow and give you a large number of tokens.

### 3. Verify Your Success

After executing the solution, check your token balance in the `Token` contract:

```shell
# You can use Etherscan or a similar block explorer to check your balance
# Or write a script to read the public mapping `balances`
```

If your balance is a very large number, congratulations! You've completed the challenge.

## Lessons Learned

This challenge teaches important lessons about integer overflow/underflow vulnerabilities:

1.  **Integer Underflow**: Understand how unsigned integer subtraction can lead to unexpected results.
2.  **Solidity Versions**: Be aware of the changes in Solidity's arithmetic operations. Versions 0.8.0 and later have built-in overflow and underflow protection.
3.  **SafeMath**: For older Solidity versions, always use a library like `SafeMath` to prevent these vulnerabilities.
