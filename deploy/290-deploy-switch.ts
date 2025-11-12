import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Switch challenge contract for Ethernaut level 29
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deploySwitch: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Switch contract with account:", deployer);

  // Deploy Switch contract
  const switchContract = await deploy("Switch", {
    contract: "Switch",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Switch deployed at: ${switchContract.address}`);

  // Get contract instance to read state
  const switchInstance = await ethers.getContractAt("Switch", switchContract.address);
  
  const switchOn = await switchInstance.switchOn();
  const offSelector = await switchInstance.offSelector();

  console.log("\n=== Deployed Contract ===");
  console.log(`Switch: ${switchContract.address}`);
  console.log(`Switch On: ${switchOn}`);
  console.log(`Off Selector: ${offSelector}`);

  console.log("\n⚠️  VULNERABILITY:");
  console.log("  The onlyOff modifier checks calldata at HARDCODED position 68");
  console.log("  for the turnSwitchOff() selector.");
  
  console.log("\n  Normal calldata structure for flipSwitch(bytes):");
  console.log("  ┌─────────────┬──────────────────────────────┐");
  console.log("  │ Position    │ Content                      │");
  console.log("  ├─────────────┼──────────────────────────────┤");
  console.log("  │ 0-3         │ flipSwitch selector          │");
  console.log("  │ 4-35        │ Offset to data (typically 32)│");
  console.log("  │ 36-67       │ Length of data               │");
  console.log("  │ 68+         │ Actual data (function call)  │");
  console.log("  └─────────────┴──────────────────────────────┘");
  
  console.log("\n  The vulnerability:");
  console.log("  - Modifier reads position 68 expecting it to be the function selector");
  console.log("  - But position 68's meaning depends on the offset value!");
  console.log("  - We can manipulate the offset to put turnSwitchOff at position 68");
  console.log("  - While the actual data (at the real offset) contains turnSwitchOn");
  
  console.log("\n💡 SOLUTION:");
  console.log("  1. Craft calldata with offset = 0x60 (96) instead of 0x20 (32)");
  console.log("  2. Put turnSwitchOff() selector at position 68 (passes check)");
  console.log("  3. Put turnSwitchOn() selector at position 96 (actual data)");
  console.log("  4. When flipSwitch executes, it calls turnSwitchOn()!");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying Switch on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: switchContract.address,
        constructorArguments: [],
      });
      console.log("Switch verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Switch is already verified!");
      } else {
        console.error("Switch verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deploySwitch;

// Tags help to select which deploy script to run
deploySwitch.tags = ["level-29", "switch"];
