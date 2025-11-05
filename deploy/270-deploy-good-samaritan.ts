import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GoodSamaritan challenge contracts for Ethernaut level 27
 * This includes: GoodSamaritan (which creates Wallet and Coin internally)
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployGoodSamaritan: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying GoodSamaritan contracts with account:", deployer);

  // Deploy GoodSamaritan contract (creates Wallet and Coin internally)
  const goodSamaritan = await deploy("GoodSamaritan", {
    contract: "GoodSamaritan",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`GoodSamaritan deployed at: ${goodSamaritan.address}`);

  // Get contract instance to read state
  const goodSamaritanContract = await ethers.getContractAt("GoodSamaritan", goodSamaritan.address);
  const walletAddress = await goodSamaritanContract.wallet();
  const coinAddress = await goodSamaritanContract.coin();

  console.log("\n=== Deployed Contracts ===");
  console.log(`GoodSamaritan: ${goodSamaritan.address}`);
  console.log(`Wallet: ${walletAddress}`);
  console.log(`Coin: ${coinAddress}`);

  // Get Coin contract to check balance
  const coinContract = await ethers.getContractAt("Coin", coinAddress);
  const walletBalance = await coinContract.balances(walletAddress);

  console.log("\n=== Current State ===");
  console.log(`Wallet Balance: ${walletBalance.toString()} coins (${ethers.formatUnits(walletBalance, 0)})`);

  console.log("\n⚠️  VULNERABILITY:");
  console.log("  The GoodSamaritan has a flaw in error handling:");
  console.log("  1. requestDonation() tries to donate 10 coins");
  console.log("  2. If it catches NotEnoughBalance() error, it sends ALL remaining coins");
  console.log("  3. Coin.transfer() calls notify() on contract recipients");
  console.log("  4. An attacker can fake the NotEnoughBalance() error in notify()");
  console.log("\n💡 SOLUTION:");
  console.log("  Create a contract that implements INotifyable");
  console.log("  In notify(), revert with NotEnoughBalance() when amount == 10");
  console.log("  This tricks GoodSamaritan into sending all coins!");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GoodSamaritan on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: goodSamaritan.address,
        constructorArguments: [],
      });
      console.log("GoodSamaritan verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("GoodSamaritan is already verified!");
      } else {
        console.error("GoodSamaritan verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployGoodSamaritan;

// Tags help to select which deploy script to run
deployGoodSamaritan.tags = ["level-27", "good-samaritan"];
