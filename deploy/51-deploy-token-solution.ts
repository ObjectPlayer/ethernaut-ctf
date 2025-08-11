import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Token solution contract for Ethernaut level 5
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployTokenSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let tokenAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    tokenAddress = targetAddress;
    console.log("Using provided Token address:", tokenAddress);
  } else {
    try {
      // Try to get the deployed Token contract
      const token = await get("Token");
      tokenAddress = token.address;
      console.log("Using deployed Token at address:", tokenAddress);
    } catch (error) {
      console.error("Error: Token contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the Token contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags token-solution");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying Token solution contract with account:", deployer);

  const tokenSolution = await deploy("TokenOverFlowHack", {
    from: deployer,
    args: [tokenAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("Token solution deployed to:", tokenSolution.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying Token contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: tokenSolution.address,
        constructorArguments: [tokenAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", telephoneCall.address, "--constructor-args", telephoneAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployTokenSolution;

// Tags help to select which deploy script to run
deployTokenSolution.tags = ["level-05", "token-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Token contract being deployed first
  deployTokenSolution.dependencies = ["token"];
}
