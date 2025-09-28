import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the BuildingExploit solution for Ethernaut level 11
 * 
 * To deploy with a specific target Elevator address:
 * TARGET_ADDRESS=0xYourElevatorAddress npx hardhat deploy --tags elevator-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployElevatorSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let elevatorAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    elevatorAddress = targetAddress;
    console.log("Using provided Elevator address:", elevatorAddress);
  } else {
    try {
      // Try to get the deployed Elevator contract
      const elevator = await get("Elevator");
      elevatorAddress = elevator.address;
      console.log("Using deployed Elevator at address:", elevatorAddress);
    } catch (error) {
      console.error("Error: Elevator contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Elevator contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags elevator-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying BuildingExploit solution contract with account:", deployer);

  // Deploy the BuildingExploit contract
  const buildingExploit = await deploy("BuildingExploit", {
    from: deployer,
    args: [elevatorAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("BuildingExploit deployed to:", buildingExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying BuildingExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: buildingExploit.address,
        constructorArguments: [elevatorAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", buildingExploit.address, "--constructor-args", elevatorAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployElevatorSolution;

// Tags help to select which deploy script to run
deployElevatorSolution.tags = ["level-11", "elevator-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Elevator contract being deployed first
  deployElevatorSolution.dependencies = ["elevator"];
}
