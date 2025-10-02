import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GatekeeperTwoExploit solution for Ethernaut level 14
 * 
 * To deploy with a specific target GatekeeperTwo address:
 * TARGET_ADDRESS=0xYourGatekeeperTwoAddress npx hardhat deploy --tags gatekeeper-two-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployGatekeeperTwoSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let gatekeeperTwoAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    gatekeeperTwoAddress = targetAddress;
    console.log("Using provided GatekeeperTwo address:", gatekeeperTwoAddress);
  } else {
    try {
      // Try to get the deployed GatekeeperTwo contract
      const gatekeeperTwo = await get("GatekeeperTwo");
      gatekeeperTwoAddress = gatekeeperTwo.address;
      console.log("Using deployed GatekeeperTwo at address:", gatekeeperTwoAddress);
    } catch (error) {
      console.error("Error: GatekeeperTwo contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the GatekeeperTwo contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags gatekeeper-two-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying GatekeeperTwoExploit solution contract with account:", deployer);
  console.log("This contract will automatically attempt to become the entrant upon deployment");

  // Deploy the GatekeeperTwoExploit contract
  const gatekeeperTwoExploit = await deploy("GatekeeperTwoExploit", {
    from: deployer,
    args: [gatekeeperTwoAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("GatekeeperTwoExploit deployed to:", gatekeeperTwoExploit.address);

  // Check if we successfully became the entrant
  const GatekeeperTwoExploit = await hre.ethers.getContractFactory("GatekeeperTwoExploit");
  const exploitContract = GatekeeperTwoExploit.attach(gatekeeperTwoExploit.address);
  
  const success = await exploitContract.getFunction("checkSuccess")();
  
  if (success) {
    console.log("✅ Success! We successfully became the entrant of the GatekeeperTwo contract.");
  } else {
    console.log("❌ Failed to become the entrant of the GatekeeperTwo contract.");
    console.log("This could be due to an issue with the key generation or other factors.");
  }

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GatekeeperTwoExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: gatekeeperTwoExploit.address,
        constructorArguments: [gatekeeperTwoAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", gatekeeperTwoExploit.address, "--constructor-args", gatekeeperTwoAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployGatekeeperTwoSolution;

// Tags help to select which deploy script to run
deployGatekeeperTwoSolution.tags = ["level-14", "gatekeeper-two-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the GatekeeperTwo contract being deployed first
  deployGatekeeperTwoSolution.dependencies = ["gatekeeper-two"];
}
