import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GuessCoinFlip solution contract for Ethernaut level 3
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployCoinFlipSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Check if a target address was provided via command line arguments
  const targetAddress = process.env.TARGET_ADDRESS;
  
  let coinFlipAddress: string;
  
  if (targetAddress) {
    // Use the provided address
    coinFlipAddress = targetAddress;
    console.log("Using provided CoinFlip address:", coinFlipAddress);
  } else {
    try {
      // Try to get the deployed CoinFlip contract
      const coinFlip = await get("CoinFlip");
      coinFlipAddress = coinFlip.address;
      console.log("Using deployed CoinFlip at address:", coinFlipAddress);
    } catch (error) {
      console.error("Error: CoinFlip contract not found and no TARGET_ADDRESS provided.");
      console.error("Please either deploy the CoinFlip contract first or provide a TARGET_ADDRESS environment variable.");
      console.error("Example: TARGET_ADDRESS=0xYourContractAddress npx hardhat deploy --tags coin-flip-solution");
      return; // Exit the deployment function
    }
  }
  
  console.log("Deploying GuessCoinFlip solution contract with account:", deployer);

  const guessCoinFlip = await deploy("GuessCoinFlip", {
    from: deployer,
    args: [coinFlipAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("GuessCoinFlip solution deployed to:", guessCoinFlip.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GuessCoinFlip contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: guessCoinFlip.address,
        constructorArguments: [coinFlipAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", guessCoinFlip.address, "--constructor-args", coinFlipAddress);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployCoinFlipSolution;

// Tags help to select which deploy script to run
deployCoinFlipSolution.tags = ["level-03", "coin-flip-solution"];
// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the CoinFlip contract being deployed first
  deployCoinFlipSolution.dependencies = ["coin-flip"];
}
