import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the RecoveryExploit solution for Ethernaut level 17
 * 
 * To deploy with a specific target Recovery address:
 * TARGET_ADDRESS=0xYourRecoveryAddress npx hardhat deploy --tags recovery-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployRecoverySolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let recoveryAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    recoveryAddress = targetAddress;
    console.log("Using provided Recovery address:", recoveryAddress);
  } else {
    try {
      // Try to get the deployed Recovery contract
      const recovery = await get("Recovery");
      recoveryAddress = recovery.address;
      console.log("Using deployed Recovery at address:", recoveryAddress);
    } catch (error) {
      console.error("Error: Recovery contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Recovery contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags recovery-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying RecoveryExploit solution contract with account:", deployer);

  // Deploy the RecoveryExploit contract
  const recoveryExploit = await deploy("RecoveryExploit", {
    from: deployer,
    args: [recoveryAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("RecoveryExploit deployed to:", recoveryExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying RecoveryExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: recoveryExploit.address,
        constructorArguments: [recoveryAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", recoveryExploit.address, "--constructor-args", recoveryAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
  console.log(`Set RECOVERY_SOLUTION_ADDRESS=${recoveryExploit.address} to use in execution script`);
};

export default deployRecoverySolution;

// Tags help to select which deploy script to run
deployRecoverySolution.tags = ["level-17", "recovery-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Recovery contract being deployed first
  deployRecoverySolution.dependencies = ["recovery"];
}
