import { ethers } from "hardhat";

async function main() {
  // The address of the deployed GuessCoinFlip contract
  const guessCoinFlipAddress = "0x946D0852932CFCA49879d3490bA90bfa417B6319";
  
  // Get the contract factory for GuessCoinFlip
  const GuessCoinFlip = await ethers.getContractFactory("GuessCoinFlip");
  
  // Connect to the deployed contract
  const guessCoinFlip = GuessCoinFlip.attach(guessCoinFlipAddress);
  
  console.log(`Connected to GuessCoinFlip contract at: ${guessCoinFlipAddress}`);
  
  try {
    // Call the getCoinFlip method
    const tx = await guessCoinFlip.getCoinFlip();
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    console.log(`Transaction successful! Hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Block number: ${receipt.blockNumber}`);
  } catch (error) {
    console.error("Error calling getCoinFlip method:", error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
