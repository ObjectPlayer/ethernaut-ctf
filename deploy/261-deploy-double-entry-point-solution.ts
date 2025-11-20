import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the DoubleEntryPointDetectionBot solution for Ethernaut level 26
 * 
 * To deploy with specific addresses:
 * VAULT_ADDRESS=0xVaultAddress FORTA_ADDRESS=0xFortaAddress npx hardhat deploy --tags double-entry-point-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDoubleEntryPointSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying DoubleEntryPointDetectionBot solution contract with account:", deployer);

  // Get addresses from environment or from previous deployment
  let cryptoVaultAddress = process.env.VAULT_ADDRESS;
  let fortaAddress = process.env.FORTA_ADDRESS;

  if (!cryptoVaultAddress || !fortaAddress) {
    console.log("VAULT_ADDRESS or FORTA_ADDRESS not provided, fetching from deployments...");
    
    const cryptoVaultDeployment = await deployments.getOrNull("CryptoVault");
    const fortaDeployment = await deployments.getOrNull("Forta");

    if (cryptoVaultDeployment && fortaDeployment) {
      cryptoVaultAddress = cryptoVaultDeployment.address;
      fortaAddress = fortaDeployment.address;
      console.log(`  CryptoVault: ${cryptoVaultAddress}`);
      console.log(`  Forta: ${fortaAddress}`);
    } else {
      throw new Error("Please provide VAULT_ADDRESS and FORTA_ADDRESS environment variables or deploy the instance contracts first");
    }
  }

  // Deploy the DoubleEntryPointDetectionBot contract
  const detectionBot = await deploy("DoubleEntryPointDetectionBot", {
    from: deployer,
    args: [cryptoVaultAddress, fortaAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("DoubleEntryPointDetectionBot deployed to:", detectionBot.address);
  console.log("  CryptoVault:", cryptoVaultAddress);
  console.log("  Forta:", fortaAddress);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying DoubleEntryPointDetectionBot contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: detectionBot.address,
        constructorArguments: [cryptoVaultAddress, fortaAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", detectionBot.address, "--constructor-args", [cryptoVaultAddress, fortaAddress]);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
  console.log("\n📝 Next Steps:");
  console.log("1. Register the detection bot using:");
  console.log(`   DETECTION_BOT_ADDRESS=${detectionBot.address} FORTA_ADDRESS=${fortaAddress} DET_ADDRESS=0xDET_ADDRESS npx hardhat run scripts/level-26-double-entry-point/register-detection-bot.ts --network ${network.name}`);
  console.log("\n2. Then test the protection by attempting to sweep tokens:");
  console.log(`   VAULT_ADDRESS=${cryptoVaultAddress} LGT_ADDRESS=0xLGT_ADDRESS npx hardhat run scripts/level-26-double-entry-point/test-sweep.ts --network ${network.name}`);
};

export default deployDoubleEntryPointSolution;

// Tags help to select which deploy script to run
deployDoubleEntryPointSolution.tags = ["level-26", "double-entry-point-solution"];

// Only add dependency if we're not using provided addresses
if (!process.env.VAULT_ADDRESS || !process.env.FORTA_ADDRESS) {
  // This script depends on the DoubleEntryPoint contracts being deployed first
  deployDoubleEntryPointSolution.dependencies = ["double-entry-point"];
}
