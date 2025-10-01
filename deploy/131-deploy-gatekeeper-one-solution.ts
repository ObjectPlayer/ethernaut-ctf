import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GatekeeperOneExploit solution for Ethernaut level 13
 * 
 * To deploy with a specific target GatekeeperOne address:
 * TARGET_ADDRESS=0xYourGatekeeperOneAddress npx hardhat deploy --tags gatekeeper-one-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployGatekeeperOneSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let gatekeeperOneAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    gatekeeperOneAddress = targetAddress;
    console.log("Using provided GatekeeperOne address:", gatekeeperOneAddress);
  } else {
    try {
      // Try to get the deployed GatekeeperOne contract
      const gatekeeperOne = await get("GatekeeperOne");
      gatekeeperOneAddress = gatekeeperOne.address;
      console.log("Using deployed GatekeeperOne at address:", gatekeeperOneAddress);
    } catch (error) {
      console.error("Error: GatekeeperOne contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the GatekeeperOne contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags gatekeeper-one-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying GatekeeperOneExploit solution contract with account:", deployer);

  // Deploy the GatekeeperOneExploit contract
  const gatekeeperOneExploit = await deploy("GatekeeperOneExploit", {
    from: deployer,
    args: [gatekeeperOneAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("GatekeeperOneExploit deployed to:", gatekeeperOneExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GatekeeperOneExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: gatekeeperOneExploit.address,
        constructorArguments: [gatekeeperOneAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", gatekeeperOneExploit.address, "--constructor-args", gatekeeperOneAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployGatekeeperOneSolution;

// Tags help to select which deploy script to run
deployGatekeeperOneSolution.tags = ["level-13", "gatekeeper-one-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the GatekeeperOne contract being deployed first
  deployGatekeeperOneSolution.dependencies = ["gatekeeper-one"];
}
