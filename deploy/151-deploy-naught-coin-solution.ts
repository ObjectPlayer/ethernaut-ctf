import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the NaughtCoinExploit solution for Ethernaut level 15
 * 
 * To deploy with a specific target NaughtCoin address:
 * TARGET_ADDRESS=0xYourNaughtCoinAddress npx hardhat deploy --tags naught-coin-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployNaughtCoinSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let naughtCoinAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    naughtCoinAddress = targetAddress;
    console.log("Using provided NaughtCoin address:", naughtCoinAddress);
  } else {
    try {
      // Try to get the deployed NaughtCoin contract
      const naughtCoin = await get("NaughtCoin");
      naughtCoinAddress = naughtCoin.address;
      console.log("Using deployed NaughtCoin at address:", naughtCoinAddress);
    } catch (error) {
      console.error("Error: NaughtCoin contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the NaughtCoin contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags naught-coin-solution --network sepolia");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying NaughtCoinExploit solution contract with account:", deployer);

  // Deploy the NaughtCoinExploit contract
  const naughtCoinExploit = await deploy("NaughtCoinExploit", {
    from: deployer,
    args: [naughtCoinAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("NaughtCoinExploit deployed to:", naughtCoinExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying NaughtCoinExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: naughtCoinExploit.address,
        constructorArguments: [naughtCoinAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", naughtCoinExploit.address, "--constructor-args", naughtCoinAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployNaughtCoinSolution;

// Tags help to select which deploy script to run
deployNaughtCoinSolution.tags = ["level-15", "naught-coin-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the NaughtCoin contract being deployed first
  deployNaughtCoinSolution.dependencies = ["naught-coin"];
}
