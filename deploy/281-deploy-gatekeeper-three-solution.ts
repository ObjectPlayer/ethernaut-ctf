import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GatekeeperThreeAttack solution for Ethernaut level 28
 * 
 * To deploy with a specific GatekeeperThree address:
 * GATEKEEPER_THREE_ADDRESS=0xYourAddress npx hardhat deploy --tags gatekeeper-three-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployGatekeeperThreeSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying GatekeeperThreeAttack solution contract with account:", deployer);

  // Get GatekeeperThree address from environment or from previous deployment
  let gatekeeperThreeAddress = process.env.GATEKEEPER_THREE_ADDRESS;

  if (!gatekeeperThreeAddress) {
    console.log("GATEKEEPER_THREE_ADDRESS not provided, fetching from deployments...");
    
    const gatekeeperThreeDeployment = await deployments.getOrNull("GatekeeperThree");

    if (gatekeeperThreeDeployment) {
      gatekeeperThreeAddress = gatekeeperThreeDeployment.address;
      console.log(`  GatekeeperThree: ${gatekeeperThreeAddress}`);
    } else {
      throw new Error("Please provide GATEKEEPER_THREE_ADDRESS environment variable or deploy the instance contract first");
    }
  }

  // Deploy the GatekeeperThreeAttack contract
  const attackContract = await deploy("GatekeeperThreeAttack", {
    from: deployer,
    args: [gatekeeperThreeAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("GatekeeperThreeAttack deployed to:", attackContract.address);
  console.log("  Target GatekeeperThree:", gatekeeperThreeAddress);

  // Get contract instances to display current state
  const gatekeeperThree = await ethers.getContractAt("GatekeeperThree", gatekeeperThreeAddress);
  const attackContractInstance = await ethers.getContractAt("GatekeeperThreeAttack", attackContract.address);
  
  const owner = await gatekeeperThree.owner();
  const allowEntrance = await gatekeeperThree.allowEntrance();
  const entrant = await gatekeeperThree.entrant();

  console.log("\n=== Current State ===");
  console.log(`GatekeeperThree: ${gatekeeperThreeAddress}`);
  console.log(`Owner: ${owner}`);
  console.log(`Allow Entrance: ${allowEntrance}`);
  console.log(`Entrant: ${entrant}`);
  console.log(`Attack Contract: ${attackContract.address}`);

  console.log("\n=== Attack Strategy ===");
  console.log("1. Call becomeOwner() to exploit construct0r() typo");
  console.log("2. Call setupTrick() to create SimpleTrick instance");
  console.log("3. Read password from SimpleTrick storage slot 2");
  console.log("4. Call passGateTwo(password) to set allowEntrance = true");
  console.log("5. Call fundTarget() with > 0.001 ETH");
  console.log("6. Call attack() to pass all gates and become entrant!");
  console.log("\nOR use completeAttack(password) with 0.002 ETH to do everything at once");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GatekeeperThreeAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [gatekeeperThreeAddress],
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
  console.log(`   ATTACK_CONTRACT_ADDRESS=${attackContract.address} TARGET_ADDRESS=${gatekeeperThreeAddress} npx hardhat run scripts/level-28-gatekeeper-three/attack.ts --network ${network.name}`);
  console.log("\n2. This will pass all three gates and become the entrant!");
  console.log("----------------------------------------------------");
};

export default deployGatekeeperThreeSolution;

// Tags help to select which deploy script to run
deployGatekeeperThreeSolution.tags = ["level-28", "gatekeeper-three-solution"];

// Only add dependency if we're not using provided address
if (!process.env.GATEKEEPER_THREE_ADDRESS) {
  // This script depends on the GatekeeperThree contract being deployed first
  deployGatekeeperThreeSolution.dependencies = ["gatekeeper-three"];
}
