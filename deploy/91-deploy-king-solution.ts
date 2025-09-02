import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the King solution for Ethernaut level 9
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployKingSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let kingAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    kingAddress = targetAddress;
    console.log("Using provided King address:", kingAddress);
  } else {
    try {
      // Try to get the deployed King contract
      const king = await get("King");
      kingAddress = king.address;
      console.log("Using deployed King at address:", kingAddress);
    } catch (error) {
      console.error("Error: King contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the King contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags king-solution");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying KingExploit solution contract with account:", deployer);

  // Deploy the KingExploit contract
  const kingExploit = await deploy("KingExploit", {
    from: deployer,
    args: [kingAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("KingExploit deployed to:", kingExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying KingExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: kingExploit.address,
        constructorArguments: [kingAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", kingExploit.address, "--constructor-args", kingAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployKingSolution;

// Tags help to select which deploy script to run
deployKingSolution.tags = ["level-09", "king-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the King contract being deployed first
  deployKingSolution.dependencies = ["king"];
}
