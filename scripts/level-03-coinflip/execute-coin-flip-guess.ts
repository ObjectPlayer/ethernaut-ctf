import { ethers } from "hardhat";

/**
 * Execute the getCoinFlip method on a deployed GuessCoinFlip contract
 * 
 * Usage: 
 * npx hardhat run scripts/execute-coin-flip-guess.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/execute-coin-flip-guess.ts --network sepolia
 */
async function main() {
  // Get contract address from environment variable or use default
  const defaultAddress = "0x946D0852932CFCA49879d3490bA90bfa417B6319";
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Using contract address: ${contractAddress}`);
  
  // Get the contract factory for GuessCoinFlip
  const GuessCoinFlip = await ethers.getContractFactory("GuessCoinFlip");
  
  // Connect to the deployed contract
  const guessCoinFlip = GuessCoinFlip.attach(contractAddress);
  
  console.log(`Connected to GuessCoinFlip contract at: ${contractAddress}`);
  
  try {
    // Call the getCoinFlip method
    console.log("Executing getCoinFlip method...");
    // Use the function interface to avoid TypeScript errors
    const tx = await guessCoinFlip.getFunction("getCoinFlip")();
    
    // Wait for the transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await tx.wait();
    
    console.log(`\nTransaction successful!`);
    console.log(`Hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Block number: ${receipt.blockNumber}`);
  } catch (error) {
    console.error("\nError calling getCoinFlip method:", error);
    process.exitCode = 1;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
