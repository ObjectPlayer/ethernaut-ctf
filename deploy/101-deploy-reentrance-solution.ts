import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the ReentranceExploit solution for Ethernaut level 10
 * 
 * To deploy with a specific target Reentrance address:
 * TARGET_ADDRESS=0xYourReentranceAddress npx hardhat deploy --tags reentrance-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployReentranceSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let reentranceAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    reentranceAddress = targetAddress;
    console.log("Using provided Reentrance address:", reentranceAddress);
  } else {
    try {
      // Try to get the deployed Reentrance contract
      const reentrance = await get("Reentrance");
      reentranceAddress = reentrance.address;
      console.log("Using deployed Reentrance at address:", reentranceAddress);
    } catch (error) {
      console.error("Error: Reentrance contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Reentrance contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags reentrance-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying ReentranceExploit solution contract with account:", deployer);

  // Deploy the ReentranceExploit contract
  const reentranceExploit = await deploy("ReentranceExploit", {
    from: deployer,
    args: [reentranceAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("ReentranceExploit deployed to:", reentranceExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying ReentranceExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: reentranceExploit.address,
        constructorArguments: [reentranceAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", reentranceExploit.address, "--constructor-args", reentranceAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployReentranceSolution;

// Tags help to select which deploy script to run
deployReentranceSolution.tags = ["level-10", "reentrance-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Reentrance contract being deployed first
  deployReentranceSolution.dependencies = ["reentrance"];
}
