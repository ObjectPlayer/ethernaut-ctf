import { ethers } from "hardhat";

/**
 * Register the detection bot with Forta to protect the CryptoVault
 * 
 * Usage:
 * DETECTION_BOT_ADDRESS=0xYourBotAddress FORTA_ADDRESS=0xFortaAddress DET_ADDRESS=0xDETAddress npx hardhat run scripts/level-26-double-entry-point/register-detection-bot.ts --network sepolia
 * 
 * DETECTION_BOT_ADDRESS=0x65F93f68bd67aE0c3Dc6213A4851C6f245505c9A FORTA_ADDRESS=0x923003D15d0B29F8d1c9fF241f7AB36E4f81d2Ec DET_ADDRESS=0xC236630Fc1D4e5723883e81c14DD699297768Fcb npx hardhat run scripts/level-26-double-entry-point/register-detection-bot.ts --network sepolia
 */
async function main() {
  console.log("Registering detection bot with Forta...\n");
  
  // Get addresses from environment
  const detectionBotAddress = process.env.DETECTION_BOT_ADDRESS!;
  const fortaAddress = process.env.FORTA_ADDRESS!;
  const detAddress = process.env.DET_ADDRESS!;
  
  if (!detectionBotAddress || !fortaAddress || !detAddress) {
    throw new Error("Environment variables DETECTION_BOT_ADDRESS, FORTA_ADDRESS, and DET_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}\n`);
  
  try {
    // Connect to Forta contract
    const forta = await ethers.getContractAt("IIForta", fortaAddress);
    
    // Connect to DoubleEntryPoint to verify player
    const det = await ethers.getContractAt("DoubleEntryPoint", detAddress);
    const player = await det.player();
    
    console.log("=== Contract Addresses ===");
    console.log(`Forta: ${fortaAddress}`);
    console.log(`Detection Bot: ${detectionBotAddress}`);
    console.log(`DoubleEntryPoint: ${detAddress}`);
    console.log(`Player: ${player}`);
    
    // Verify the signer is the player
    if (signer.address.toLowerCase() !== player.toLowerCase()) {
      console.log(`\n⚠️  WARNING: Signer (${signer.address}) is not the player (${player})`);
      console.log("The detection bot should be registered by the player account.");
    }
    
    // Check current detection bot
    console.log("\n=== Current State ===");
    const currentBot = await forta.usersDetectionBots(player);
    console.log(`Current detection bot for player: ${currentBot}`);
    
    if (currentBot !== ethers.ZeroAddress && currentBot !== detectionBotAddress) {
      console.log(`⚠️  Player already has a different detection bot registered!`);
    }
    
    // Register the detection bot
    console.log("\n=== Registering Detection Bot ===");
    console.log(`Registering ${detectionBotAddress} for player ${player}...`);
    
    const tx = await forta.setDetectionBot(detectionBotAddress);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("✓ Transaction confirmed!");
    
    // Verify registration
    const newBot = await forta.usersDetectionBots(player);
    console.log(`\nNew detection bot for player: ${newBot}`);
    
    if (newBot.toLowerCase() === detectionBotAddress.toLowerCase()) {
      console.log("\n✅ SUCCESS! Detection bot registered successfully!");
      console.log("\n🛡️  The CryptoVault is now protected!");
      console.log("   Any attempt to sweep tokens via LegacyToken will be detected and blocked.");
    } else {
      console.log("\n❌ ERROR: Detection bot registration failed!");
      console.log(`Expected: ${detectionBotAddress}`);
      console.log(`Got: ${newBot}`);
    }
    
    // Get more details about the protection
    const detectionBot = await ethers.getContractAt("DoubleEntryPointDetectionBot", detectionBotAddress);
    const cryptoVault = await detectionBot.cryptoVault();
    
    console.log("\n=== Protection Details ===");
    console.log(`Protected Vault: ${cryptoVault}`);
    console.log(`Monitoring: delegateTransfer calls where origSender == CryptoVault`);
    console.log("\nHow it works:");
    console.log("1. When sweepToken(LegacyToken) is called:");
    console.log("2. LegacyToken.transfer() delegates to DoubleEntryPoint.delegateTransfer()");
    console.log("3. The fortaNotify modifier calls our detection bot");
    console.log("4. Our bot checks if origSender (CryptoVault) is trying to transfer");
    console.log("5. If yes, it raises an alert and the transaction reverts!");
    
  } catch (error: any) {
    console.error("\n❌ Error registering detection bot:");
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
