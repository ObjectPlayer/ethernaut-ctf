import { ethers } from "hardhat";

/**
 * Execute the claimOwnership method on a deployed TelephoneCall contract
 * 
 * Usage: 
 * npx hardhat run scripts/level-05-token/execute-token-claim.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-05-token/execute-token-claim.ts --network sepolia
 */
async function main() {
  // Get contract address from environment variable or use default
  const defaultAddress = "0xD404840fEB422d46BD63Cf2Cd748A488e78Ec390";
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Using contract address: ${contractAddress}`);
  
  // Get the contract factory for TokenOverFlowHack
  const TokenOverFlowHack = await ethers.getContractFactory("TokenOverFlowHack");
  
  // Connect to the deployed contract
  const tokenOverFlowHack = TokenOverFlowHack.attach(contractAddress);
  
  console.log(`Connected to TokenOverFlowHack contract at: ${contractAddress}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Attacker address: ${deployer.address}`);

  try {
    // Call the getToken method
    console.log("Executing getToken method...");
    // Use the function interface to avoid TypeScript errors
    const tx = await tokenOverFlowHack.getFunction("getToken")(deployer.address);
    
    // Wait for the transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await tx.wait();
    
    console.log(`\nTransaction successful!`);
    console.log(`Hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Block number: ${receipt.blockNumber}`);
  } catch (error) {
    console.error("\nError calling getToken method:", error);
    process.exitCode = 1;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
