import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the ShopExploit solution for Ethernaut level 21
 * 
 * To deploy with a specific target Shop address:
 * TARGET_ADDRESS=0xYourShopAddress npx hardhat deploy --tags shop-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployShopSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Get the target address from environment or use the deployed contract
  let targetAddress = process.env.TARGET_ADDRESS;
  if (!targetAddress) {
    try {
      const shopDeployment = await deployments.get("Shop");
      targetAddress = shopDeployment.address;
      console.log(`Using deployed Shop address: ${targetAddress}`);
    } catch (error) {
      console.log("Shop contract not found. You need to provide TARGET_ADDRESS environment variable.");
      return;
    }
  }
  
  console.log("Deploying ShopExploit solution contract with account:", deployer);

  // Deploy the ShopExploit contract
  const shopExploit = await deploy("ShopExploit", {
    from: deployer,
    args: [targetAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("ShopExploit deployed to:", shopExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying ShopExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: shopExploit.address,
        constructorArguments: [targetAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", shopExploit.address, "--constructor-args", [targetAddress]);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployShopSolution;

// Tags help to select which deploy script to run
deployShopSolution.tags = ["level-21", "shop-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Shop contract being deployed first
  deployShopSolution.dependencies = ["shop"];
}
