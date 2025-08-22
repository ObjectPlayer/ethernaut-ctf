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

  // Get the deployed CoinFlip contract
  const coinFlip = await get("CoinFlip");
  
  console.log("Deploying GuessCoinFlip solution contract with account:", deployer);
  console.log("Using CoinFlip at address:", coinFlip.address);

  const guessCoinFlip = await deploy("GuessCoinFlip", {
    from: deployer,
    args: [coinFlip.address],
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
        constructorArguments: [coinFlip.address],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", guessCoinFlip.address, "--constructor-args", coinFlip.address);
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
// This script depends on the CoinFlip contract being deployed first
deployCoinFlipSolution.dependencies = ["coin-flip"];
