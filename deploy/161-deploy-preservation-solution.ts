import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the PreservationExploit solution for Ethernaut level 16
 * 
 * To deploy with a specific target Preservation address:
 * TARGET_ADDRESS=0xYourPreservationAddress npx hardhat deploy --tags preservation-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployPreservationSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let preservationAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    preservationAddress = targetAddress;
    console.log("Using provided Preservation address:", preservationAddress);
  } else {
    try {
      // Try to get the deployed Preservation contract
      const preservation = await get("Preservation");
      preservationAddress = preservation.address;
      console.log("Using deployed Preservation at address:", preservationAddress);
    } catch (error) {
      console.error("Error: Preservation contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Preservation contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags preservation-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying PreservationExploit solution contract with account:", deployer);

  // Deploy the PreservationExploit contract
  const preservationExploit = await deploy("PreservationExploit", {
    from: deployer,
    args: [preservationAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("PreservationExploit deployed to:", preservationExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying PreservationExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: preservationExploit.address,
        constructorArguments: [preservationAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", preservationExploit.address, "--constructor-args", preservationAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployPreservationSolution;

// Tags help to select which deploy script to run
deployPreservationSolution.tags = ["level-16", "preservation-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Preservation contract being deployed first
  deployPreservationSolution.dependencies = ["preservation"];
}
