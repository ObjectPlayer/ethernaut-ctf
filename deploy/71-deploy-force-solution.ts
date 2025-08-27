import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Force solution for Ethernaut level 7
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployForceSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let forceAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    forceAddress = targetAddress;
    console.log("Using provided Force address:", forceAddress);
  } else {
    try {
      // Try to get the deployed Force contract
      const force = await get("Force");
      forceAddress = force.address;
      console.log("Using deployed Force at address:", forceAddress);
    } catch (error) {
      console.error("Error: Force contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Force contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags force-solution");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying ForceExploit solution contract with account:", deployer);

  // Deploy the ForceExploit contract
  const forceExploit = await deploy("ForceExploit", {
    from: deployer,
    args: [forceAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("ForceExploit deployed to:", forceExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying ForceExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: forceExploit.address,
        constructorArguments: [forceAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", forceExploit.address, "--constructor-args", forceAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployForceSolution;

// Tags help to select which deploy script to run
deployForceSolution.tags = ["level-07", "force-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Force contract being deployed first
  deployForceSolution.dependencies = ["force"];
}
