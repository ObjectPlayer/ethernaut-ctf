import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GoodSamaritanAttack solution for Ethernaut level 27
 * 
 * To deploy with a specific GoodSamaritan address:
 * GOOD_SAMARITAN_ADDRESS=0xYourAddress npx hardhat deploy --tags good-samaritan-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployGoodSamaritanSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying GoodSamaritanAttack solution contract with account:", deployer);

  // Get GoodSamaritan address from environment or from previous deployment
  let goodSamaritanAddress = process.env.GOOD_SAMARITAN_ADDRESS;

  if (!goodSamaritanAddress) {
    console.log("GOOD_SAMARITAN_ADDRESS not provided, fetching from deployments...");
    
    const goodSamaritanDeployment = await deployments.getOrNull("GoodSamaritan");

    if (goodSamaritanDeployment) {
      goodSamaritanAddress = goodSamaritanDeployment.address;
      console.log(`  GoodSamaritan: ${goodSamaritanAddress}`);
    } else {
      throw new Error("Please provide GOOD_SAMARITAN_ADDRESS environment variable or deploy the instance contract first");
    }
  }

  // Deploy the GoodSamaritanAttack contract
  const attackContract = await deploy("GoodSamaritanAttack", {
    from: deployer,
    args: [goodSamaritanAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("GoodSamaritanAttack deployed to:", attackContract.address);
  console.log("  Target GoodSamaritan:", goodSamaritanAddress);

  // Get contract instances to display current state
  const goodSamaritan = await ethers.getContractAt("GoodSamaritan", goodSamaritanAddress);
  const attackContractInstance = await ethers.getContractAt("GoodSamaritanAttack", attackContract.address);
  
  const coinAddress = await goodSamaritan.coin();
  const walletAddress = await goodSamaritan.wallet();
  
  const coinContract = await ethers.getContractAt("Coin", coinAddress);
  const walletBalance = await coinContract.balances(walletAddress);
  const attackerBalance = await attackContractInstance.getBalance();

  console.log("\n=== Current State ===");
  console.log(`GoodSamaritan: ${goodSamaritanAddress}`);
  console.log(`Wallet: ${walletAddress}`);
  console.log(`Coin: ${coinAddress}`);
  console.log(`Wallet Balance: ${walletBalance.toString()} coins`);
  console.log(`Attacker Balance: ${attackerBalance.toString()} coins`);

  console.log("\n=== Attack Strategy ===");
  console.log("1. Call attack() on GoodSamaritanAttack");
  console.log("2. This calls requestDonation() on GoodSamaritan");
  console.log("3. GoodSamaritan tries to donate 10 coins");
  console.log("4. Our notify() function reverts with NotEnoughBalance()");
  console.log("5. GoodSamaritan thinks wallet is empty");
  console.log("6. GoodSamaritan calls transferRemainder() sending ALL coins!");
  console.log("7. Our notify() allows the full transfer to succeed");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GoodSamaritanAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [goodSamaritanAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later.");
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("\n----------------------------------------------------");
  console.log("📝 Next Steps:");
  console.log("1. Execute the attack using:");
  console.log(`   ATTACK_CONTRACT_ADDRESS=${attackContract.address} npx hardhat run scripts/level-27-good-samaritan/attack.ts --network ${network.name}`);
  console.log("\n2. This will drain all coins from the GoodSamaritan's wallet!");
  console.log("----------------------------------------------------");
};

export default deployGoodSamaritanSolution;

// Tags help to select which deploy script to run
deployGoodSamaritanSolution.tags = ["level-27", "good-samaritan-solution"];

// Only add dependency if we're not using provided address
if (!process.env.GOOD_SAMARITAN_ADDRESS) {
  // This script depends on the GoodSamaritan contract being deployed first
  deployGoodSamaritanSolution.dependencies = ["good-samaritan"];
}
