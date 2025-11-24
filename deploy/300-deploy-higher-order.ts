import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the HigherOrder challenge contract for Ethernaut level 30
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployHigherOrder: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying HigherOrder contract with account:", deployer);

  // Deploy HigherOrder contract
  const higherOrderContract = await deploy("HigherOrder", {
    contract: "HigherOrder",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`HigherOrder deployed at: ${higherOrderContract.address}`);

  // Get contract instance to read state
  const higherOrderInstance = await ethers.getContractAt("HigherOrder", higherOrderContract.address);
  
  const treasury = await higherOrderInstance.treasury();
  const commander = await higherOrderInstance.commander();

  console.log("\n=== Deployed Contract ===");
  console.log(`HigherOrder: ${higherOrderContract.address}`);
  console.log(`Treasury: ${treasury}`);
  console.log(`Commander: ${commander}`);

  console.log("\n⚠️  VULNERABILITY:");
  console.log("  The registerTreasury function has a type mismatch between its");
  console.log("  signature and its assembly implementation!");
  
  console.log("\n  Function signature:");
  console.log("  function registerTreasury(uint8) public");
  console.log("  ├─ uint8 can only hold values 0-255");
  console.log("  └─ ABI encoding would normally enforce this");
  
  console.log("\n  Assembly implementation:");
  console.log("  assembly {");
  console.log("      sstore(treasury_slot, calldataload(4))");
  console.log("  }");
  console.log("  ├─ calldataload(4) reads 32 bytes (full uint256!)");
  console.log("  └─ No validation that value fits in uint8");
  
  console.log("\n  To become Commander:");
  console.log("  if (treasury > 255) commander = msg.sender;");
  console.log("  └─ Treasury must be greater than 255");
  
  console.log("\n💡 THE EXPLOIT:");
  console.log("  1. Normal call: registerTreasury(255)");
  console.log("     └─ ABI encodes uint8, max value is 255");
  console.log("  ");
  console.log("  2. Malicious call: Low-level call with crafted calldata");
  console.log("     ├─ Selector: registerTreasury(uint8) = 0x211c85ab");
  console.log("     ├─ Data: Full 32 bytes with value > 255 (e.g., 256)");
  console.log("     └─ Assembly reads all 32 bytes, ignoring uint8 limit!");
  console.log("  ");
  console.log("  3. Result:");
  console.log("     ├─ treasury gets set to value > 255");
  console.log("     └─ Can call claimLeadership() to become Commander!");

  console.log("\n📋 CALLDATA COMPARISON:");
  console.log("  Normal Call (registerTreasury(255)):");
  console.log("  ┌────────────┬─────────────────────────────────┐");
  console.log("  │ Position   │ Value                           │");
  console.log("  ├────────────┼─────────────────────────────────┤");
  console.log("  │ 0x00-0x03  │ 0x211c85ab (selector)           │");
  console.log("  │ 0x04-0x23  │ 0x0000...00ff (255 as uint256)  │");
  console.log("  └────────────┴─────────────────────────────────┘");
  console.log("  Result: treasury = 255 (NOT > 255) ❌");
  console.log("");
  console.log("  Malicious Call (crafted calldata with 256):");
  console.log("  ┌────────────┬─────────────────────────────────┐");
  console.log("  │ Position   │ Value                           │");
  console.log("  ├────────────┼─────────────────────────────────┤");
  console.log("  │ 0x00-0x03  │ 0x211c85ab (selector)           │");
  console.log("  │ 0x04-0x23  │ 0x0000...0100 (256 as uint256)  │");
  console.log("  └────────────┴─────────────────────────────────┘");
  console.log("  Result: treasury = 256 (> 255!) ✅");

  console.log("\n🎯 SOLUTION:");
  console.log("  1. Craft calldata: selector + uint256(256)");
  console.log("  2. Make low-level call to bypass ABI encoding");
  console.log("  3. Assembly reads full 32 bytes, sets treasury = 256");
  console.log("  4. Call claimLeadership() to become Commander!");

  console.log("\n🔍 KEY LESSON:");
  console.log("  Using assembly to read calldata bypasses Solidity's type safety!");
  console.log("  - Function parameters are just hints for ABI encoding");
  console.log("  - Assembly operates on raw bytes");
  console.log("  - Always validate data when using assembly");
  console.log("  - This vulnerability exists in Solidity 0.6.12");
  console.log("  - Newer compilers may have better safeguards");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying HigherOrder on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: higherOrderContract.address,
        constructorArguments: [],
      });
      console.log("HigherOrder verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("HigherOrder is already verified!");
      } else {
        console.error("HigherOrder verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployHigherOrder;

// Tags help to select which deploy script to run
deployHigherOrder.tags = ["level-30", "higher-order"];
