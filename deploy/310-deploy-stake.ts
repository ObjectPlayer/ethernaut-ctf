import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the Stake challenge contract for Ethernaut level 31
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployStake: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Stake contract with account:", deployer);

  // Step 1: Deploy WETH contract first
  console.log("\n📝 Step 1: Deploying WETH contract...");
  const wethContract = await deploy("WETH", {
    contract: "WETH",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`WETH deployed at: ${wethContract.address}`);

  // Step 2: Deploy Stake contract with initial ETH
  console.log("\n📝 Step 2: Deploying Stake contract...");
  const initialStake = ethers.parseEther("0.001"); // 0.001 ETH initial stake
  
  const stakeContract = await deploy("Stake", {
    contract: "Stake",
    from: deployer,
    args: [wethContract.address],
    value: initialStake.toString(),
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Stake deployed at: ${stakeContract.address}`);

  // Get contract instances to read state
  const stakeInstance = await ethers.getContractAt("Stake", stakeContract.address);
  const wethInstance = await ethers.getContractAt("WETH", wethContract.address);
  
  const totalStaked = await stakeInstance.totalStaked();
  const contractBalance = await ethers.provider.getBalance(stakeContract.address);
  const wethAddress = await stakeInstance.WETH();

  console.log("\n=== Deployed Contracts ===");
  console.log(`WETH: ${wethContract.address}`);
  console.log(`Stake: ${stakeContract.address}`);
  console.log(`Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
  console.log(`Contract ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`WETH Address in Stake: ${wethAddress}`);

  console.log("\n⚠️  VULNERABILITY:");
  console.log("  The Stake contract has a CRITICAL accounting flaw!");
  
  console.log("\n  The Problem:");
  console.log("  ┌─────────────────────────────────────────────────────┐");
  console.log("  │ StakeWETH Function                                  │");
  console.log("  │ - Increases totalStaked by WETH amount              │");
  console.log("  │ - Receives WETH tokens (ERC20, not native ETH)      │");
  console.log("  │ - Does NOT increase contract's ETH balance          │");
  console.log("  └─────────────────────────────────────────────────────┘");
  console.log("  ┌─────────────────────────────────────────────────────┐");
  console.log("  │ Unstake Function                                    │");
  console.log("  │ - Decreases totalStaked                             │");
  console.log("  │ - Sends NATIVE ETH (not WETH tokens!)               │");
  console.log("  │ - Doesn't check if user staked ETH or WETH          │");
  console.log("  └─────────────────────────────────────────────────────┘");
  
  console.log("\n  The Accounting Mismatch:");
  console.log("  ┌──────────────┬─────────────┬─────────────┐");
  console.log("  │ Action       │ totalStaked │ ETH Balance │");
  console.log("  ├──────────────┼─────────────┼─────────────┤");
  console.log("  │ StakeETH(1)  │ +1          │ +1          │ ✓ Matched");
  console.log("  │ StakeWETH(1) │ +1          │  0          │ ⚠️ Mismatch!");
  console.log("  │ Unstake(1)   │ -1          │ -1          │ ⚠️ Drains ETH!");
  console.log("  └──────────────┴─────────────┴─────────────┘");

  console.log("\n💡 THE EXPLOIT:");
  console.log("  Goal: Meet these conditions:");
  console.log("  1. Contract ETH balance > 0");
  console.log("  2. totalStaked > Contract ETH balance");
  console.log("  3. You are a staker (Stakers[msg.sender] = true)");
  console.log("  4. Your stake balance = 0 (UserStake[msg.sender] = 0)");
  
  console.log("\n  Attack Steps:");
  console.log("  1️⃣  Get WETH tokens (deposit ETH to WETH contract)");
  console.log("     └─ WETH.deposit{value: 0.002 ether}()");
  console.log("");
  console.log("  2️⃣  Approve Stake contract to spend your WETH");
  console.log("     └─ WETH.approve(stakeAddress, amount)");
  console.log("");
  console.log("  3️⃣  Stake WETH (increases totalStaked, no ETH added)");
  console.log("     └─ Stake.StakeWETH(0.001 ether + 1)");
  console.log("     └─ totalStaked increases by 0.001 ether");
  console.log("     └─ Contract ETH balance: unchanged");
  console.log("");
  console.log("  4️⃣  Stake some ETH (ensures contract has ETH > 0)");
  console.log("     └─ Stake.StakeETH{value: 0.001 ether + 1}()");
  console.log("     └─ totalStaked increases by 0.001 ether");
  console.log("     └─ Contract ETH balance increases by 0.001 ether");
  console.log("");
  console.log("  5️⃣  Unstake everything (drains ETH)");
  console.log("     └─ Stake.Unstake(UserStake[msg.sender])");
  console.log("     └─ Sends 0.002 ether in ETH to you");
  console.log("     └─ totalStaked decreases by 0.002 ether");
  console.log("     └─ Contract ETH balance decreases by 0.002 ether");
  console.log("");
  console.log("  Result:");
  console.log("  ├─ Contract started with 0.001 ETH");
  console.log("  ├─ After step 4: balance = 0.002, totalStaked = 0.003");
  console.log("  ├─ After step 5: balance = 0.000, totalStaked = 0.001");
  console.log("  └─ BUT wait! Contract started with 0.001 ETH from deployment!");
  console.log("     └─ Final: balance = 0.001, totalStaked = 0.001 ❌");
  console.log("");
  console.log("  Better approach:");
  console.log("  └─ Only unstake part of your stake, leaving contract balance > 0");
  console.log("     └─ Unstake 0.001 ether instead of all 0.002");
  console.log("     └─ Final: balance ≈ 0.001, totalStaked = 0.002 ✅");

  console.log("\n📋 DETAILED ACCOUNTING:");
  console.log("  Initial state (from constructor):");
  console.log("  - totalStaked: 0.001 ETH (from msg.value)");
  console.log("  - Contract balance: 0.001 ETH");
  console.log("");
  console.log("  After StakeWETH(0.001001 ETH):");
  console.log("  - totalStaked: 0.002001 ETH");
  console.log("  - Contract balance: 0.001 ETH (unchanged!)");
  console.log("  - WETH balance of contract: 0.001001 WETH");
  console.log("");
  console.log("  After StakeETH(0.001001 ETH):");
  console.log("  - totalStaked: 0.003002 ETH");
  console.log("  - Contract balance: 0.002001 ETH");
  console.log("");
  console.log("  After Unstake(0.001001 ETH):");
  console.log("  - totalStaked: 0.002001 ETH");
  console.log("  - Contract balance: 0.001 ETH");
  console.log("  - Your stake: 0.001001 ETH remaining");
  console.log("");
  console.log("  After Unstake(0.001001 ETH) again:");
  console.log("  - totalStaked: 0.001 ETH");
  console.log("  - Contract balance: ~0 ETH (or small dust)");
  console.log("  - Your stake: 0 ETH ✅");
  console.log("  - You are still a staker ✅");
  console.log("  - totalStaked (0.001) > balance (~0) ✅");

  console.log("\n🔍 KEY VULNERABILITY:");
  console.log("  The contract treats WETH and ETH as interchangeable (1:1 value)");
  console.log("  BUT:");
  console.log("  - StakeWETH receives ERC20 tokens (not ETH)");
  console.log("  - Unstake sends native ETH (not ERC20 tokens)");
  console.log("  - No check for which type of asset was staked");
  console.log("  - This allows draining ETH while having staked WETH!");

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying WETH on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: wethContract.address,
        constructorArguments: [],
      });
      console.log("WETH verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("WETH is already verified!");
      } else {
        console.error("WETH verification failed:", error);
      }
    }

    console.log("Verifying Stake on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: stakeContract.address,
        constructorArguments: [wethContract.address],
      });
      console.log("Stake verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Stake is already verified!");
      } else {
        console.error("Stake verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployStake;

// Tags help to select which deploy script to run
deployStake.tags = ["level-31", "stake"];
