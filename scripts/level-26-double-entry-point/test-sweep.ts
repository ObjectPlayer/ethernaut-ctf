import { ethers } from "hardhat";

/**
 * Test the CryptoVault sweep protection
 * This script attempts to sweep LegacyToken from the vault
 * 
 * Usage:
 * VAULT_ADDRESS=0xVaultAddress LGT_ADDRESS=0xLGTAddress DET_ADDRESS=0xDETAddress npx hardhat run scripts/level-26-double-entry-point/test-sweep.ts --network sepolia
 */
async function main() {
  console.log("Testing CryptoVault sweep protection...\n");
  
  // Get addresses from environment
  const vaultAddress = process.env.VAULT_ADDRESS!;
  const lgtAddress = process.env.LGT_ADDRESS!;
  const detAddress = process.env.DET_ADDRESS!;
  
  if (!vaultAddress || !lgtAddress || !detAddress) {
    throw new Error("Environment variables VAULT_ADDRESS, LGT_ADDRESS, and DET_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}\n`);
  
  try {
    // Connect to contracts
    const vault = await ethers.getContractAt("CryptoVault", vaultAddress);
    const lgt = await ethers.getContractAt("LegacyToken", lgtAddress);
    const det = await ethers.getContractAt("DoubleEntryPoint", detAddress);
    
    console.log("=== Contract Addresses ===");
    console.log(`CryptoVault: ${vaultAddress}`);
    console.log(`LegacyToken: ${lgtAddress}`);
    console.log(`DoubleEntryPoint: ${detAddress}`);
    
    // Get initial balances
    console.log("\n=== Initial Balances ===");
    const vaultDETBalanceBefore = await det.balanceOf(vaultAddress);
    const vaultLGTBalanceBefore = await lgt.balanceOf(vaultAddress);
    const underlying = await vault.underlying();
    const sweptTokensRecipient = await vault.sweptTokensRecipient();
    
    console.log(`Vault DET Balance: ${ethers.formatEther(vaultDETBalanceBefore)} DET`);
    console.log(`Vault LGT Balance: ${ethers.formatEther(vaultLGTBalanceBefore)} LGT`);
    console.log(`Underlying Token: ${underlying}`);
    console.log(`Swept Tokens Recipient: ${sweptTokensRecipient}`);
    
    // Verify setup
    if (underlying.toLowerCase() !== detAddress.toLowerCase()) {
      console.log("\n⚠️  WARNING: Underlying token is not DET!");
    }
    
    // Attempt to sweep DET directly (should fail with "Can't transfer underlying token")
    console.log("\n=== Test 1: Attempt to sweep DET directly ===");
    console.log("This should fail with 'Can't transfer underlying token'...");
    try {
      await vault.sweepToken.staticCall(detAddress);
      console.log("❌ UNEXPECTED: Direct DET sweep was allowed!");
    } catch (error: any) {
      if (error.message.includes("Can't transfer underlying token")) {
        console.log("✓ Expected failure: Can't transfer underlying token");
      } else {
        console.log(`✓ Sweep failed with: ${error.message}`);
      }
    }
    
    // Attempt to sweep LGT (should fail if detection bot is registered)
    console.log("\n=== Test 2: Attempt to sweep LGT (the vulnerability) ===");
    console.log("Without detection bot: This would drain DET from vault!");
    console.log("With detection bot: This should fail with 'Alert has been triggered'...");
    
    try {
      // Use staticCall first to check without actually executing
      await vault.sweepToken.staticCall(lgtAddress);
      
      console.log("\n⚠️  WARNING: Sweep call succeeded in simulation!");
      console.log("This means the detection bot is NOT working or NOT registered.");
      console.log("\nAttempting actual sweep (this will drain DET if unprotected)...");
      
      const sweepTx = await vault.sweepToken(lgtAddress);
      console.log(`Transaction hash: ${sweepTx.hash}`);
      await sweepTx.wait();
      
      // Check balances after sweep
      const vaultDETBalanceAfter = await det.balanceOf(vaultAddress);
      const vaultLGTBalanceAfter = await lgt.balanceOf(vaultAddress);
      
      console.log("\n=== Balances After Sweep ===");
      console.log(`Vault DET Balance: ${ethers.formatEther(vaultDETBalanceAfter)} DET`);
      console.log(`Vault LGT Balance: ${ethers.formatEther(vaultLGTBalanceAfter)} LGT`);
      
      if (vaultDETBalanceAfter < vaultDETBalanceBefore) {
        console.log("\n❌ VULNERABILITY EXPLOITED!");
        console.log(`   DET drained: ${ethers.formatEther(vaultDETBalanceBefore - vaultDETBalanceAfter)} DET`);
        console.log("   The detection bot is not registered or not working!");
      }
      
    } catch (error: any) {
      if (error.message.includes("Alert has been triggered")) {
        console.log("\n✅ SUCCESS! Detection bot prevented the attack!");
        console.log("   Error: Alert has been triggered, reverting");
        console.log("\n🛡️  The vault is protected!");
        console.log("   The detection bot detected that:");
        console.log("   1. delegateTransfer was called");
        console.log("   2. origSender was the CryptoVault");
        console.log("   3. This indicates an attempt to drain DET via LGT");
        console.log("   4. Alert was raised and transaction was reverted!");
      } else {
        console.log(`\n⚠️  Sweep failed with unexpected error: ${error.message}`);
      }
    }
    
    // Final balances check
    console.log("\n=== Final Balances ===");
    const vaultDETBalanceFinal = await det.balanceOf(vaultAddress);
    const vaultLGTBalanceFinal = await lgt.balanceOf(vaultAddress);
    
    console.log(`Vault DET Balance: ${ethers.formatEther(vaultDETBalanceFinal)} DET`);
    console.log(`Vault LGT Balance: ${ethers.formatEther(vaultLGTBalanceFinal)} LGT`);
    
    if (vaultDETBalanceFinal.toString() === vaultDETBalanceBefore.toString()) {
      console.log("\n✅ DET balance unchanged - protection successful!");
    } else {
      console.log("\n❌ DET balance changed - vault was drained!");
    }
    
  } catch (error: any) {
    console.error("\n❌ Error testing sweep:");
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
