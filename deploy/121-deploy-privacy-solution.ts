import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the PrivacyExploit solution for Ethernaut level 12
 * 
 * To deploy with a specific target Privacy address:
 * TARGET_ADDRESS=0xYourPrivacyAddress npx hardhat deploy --tags privacy-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployPrivacySolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let privacyAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    privacyAddress = targetAddress;
    console.log("Using provided Privacy address:", privacyAddress);
  } else {
    try {
      // Try to get the deployed Privacy contract
      const privacy = await get("Privacy");
      privacyAddress = privacy.address;
      console.log("Using deployed Privacy at address:", privacyAddress);
    } catch (error) {
      console.error("Error: Privacy contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Privacy contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags privacy-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying PrivacyExploit solution contract with account:", deployer);

  // Deploy the PrivacyExploit contract
  const privacyExploit = await deploy("PrivacyExploit", {
    from: deployer,
    args: [privacyAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("PrivacyExploit deployed to:", privacyExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying PrivacyExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: privacyExploit.address,
        constructorArguments: [privacyAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", privacyExploit.address, "--constructor-args", privacyAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployPrivacySolution;

// Tags help to select which deploy script to run
deployPrivacySolution.tags = ["level-12", "privacy-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Privacy contract being deployed first
  deployPrivacySolution.dependencies = ["privacy"];
}
