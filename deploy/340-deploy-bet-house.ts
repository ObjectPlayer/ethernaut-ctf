import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deployment script for Ethernaut Level 34: Bet House
 *
 * VULNERABILITY: Cross-function reentrancy in Pool.withdrawAll()
 *
 * The withdrawAll() function has a critical flaw in its execution order:
 * 1. Sends PDT tokens back to user
 * 2. Sends ETH back to user via .call() - EXTERNAL CALL
 * 3. Burns wrapped tokens - HAPPENS AFTER EXTERNAL CALL
 *
 * This ordering allows an attacker to re-enter during the ETH callback
 * while still having their wrapped token balance intact.
 *
 * ATTACK FLOW:
 * 1. Attacker has 5 PDT (given at start)
 * 2. Deposit 5 PDT + 0.001 ETH → get 15 wrapped tokens
 * 3. Call withdrawAll():
 *    - PDT sent back (5 PDT returned)
 *    - ETH callback triggers receive()
 *    - In receive(): still have 15 wrapped tokens!
 *      - Re-deposit 5 PDT → now have 20 wrapped tokens
 *      - Lock deposits
 *      - Call makeBet() - SUCCESS!
 *    - After callback: tokens burned, but already registered as bettor!
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n=== Deploying Ethernaut Level 34: Bet House ===\n");
  console.log(`Deployer: ${deployer}`);

  // Step 1: Deploy Wrapped Token (Pool Token - the wrapped token users receive)
  console.log("\n1. Deploying Wrapped Token (WT)...");
  const wrappedToken = await deploy("WrappedToken", {
    contract: "PoolToken",
    from: deployer,
    args: ["Wrapped Token", "WT"],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   Wrapped Token deployed at: ${wrappedToken.address}`);

  // Step 2: Deploy Pool Deposit Token (PDT)
  console.log("\n2. Deploying Pool Deposit Token (PDT)...");
  const depositToken = await deploy("PoolDepositToken", {
    contract: "PoolToken",
    from: deployer,
    args: ["Pool Deposit Token", "PDT"],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   PDT deployed at: ${depositToken.address}`);

  // Step 3: Deploy Pool
  console.log("\n3. Deploying Pool...");
  const pool = await deploy("Pool", {
    from: deployer,
    args: [wrappedToken.address, depositToken.address],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   Pool deployed at: ${pool.address}`);

  // Step 4: Transfer ownership of Wrapped Token to Pool
  console.log("\n4. Transferring Wrapped Token ownership to Pool...");
  const wrappedTokenContract = await ethers.getContractAt("PoolToken", wrappedToken.address);
  const transferOwnershipTx = await wrappedTokenContract.transferOwnership(pool.address);
  await transferOwnershipTx.wait();
  console.log(`   Wrapped Token ownership transferred to Pool`);

  // Step 5: Deploy BetHouse
  console.log("\n5. Deploying BetHouse...");
  const betHouse = await deploy("BetHouse", {
    from: deployer,
    args: [pool.address],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   BetHouse deployed at: ${betHouse.address}`);

  // Step 6: Mint 5 PDT to player (simulating challenge start)
  console.log("\n6. Minting 5 PDT to deployer (player)...");
  const pdtContract = await ethers.getContractAt("PoolToken", depositToken.address);
  const mintTx = await pdtContract.mint(deployer, 5);
  await mintTx.wait();
  console.log(`   Minted 5 PDT to ${deployer}`);

  // Verify deployments
  console.log("\n=== Deployment Summary ===");
  console.log(`Wrapped Token: ${wrappedToken.address}`);
  console.log(`Pool Deposit Token (PDT): ${depositToken.address}`);
  console.log(`Pool: ${pool.address}`);
  console.log(`BetHouse: ${betHouse.address}`);

  console.log("\n=== Vulnerability Details ===");
  console.log("1. Pool.withdrawAll() burns tokens AFTER external ETH call");
  console.log("2. During ETH callback, attacker still has wrapped token balance");
  console.log("3. Attacker can re-deposit PDT, lock deposits, and call makeBet()");
  console.log("4. After callback, tokens burned but bettor status already set!");

  console.log("\n=== Challenge Info ===");
  console.log("Player starts with: 5 PDT");
  console.log("Goal: Become a bettor (requires 20 wrapped tokens + locked deposits)");
  console.log("Hint: Exploit the reentrancy in withdrawAll()");

  // Verify on Etherscan if not local
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n=== Verifying Contracts on Etherscan ===");
    try {
      await hre.run("verify:verify", {
        address: wrappedToken.address,
        constructorArguments: ["Wrapped Token", "WT"],
      });
      await hre.run("verify:verify", {
        address: depositToken.address,
        constructorArguments: ["Pool Deposit Token", "PDT"],
      });
      await hre.run("verify:verify", {
        address: pool.address,
        constructorArguments: [wrappedToken.address, depositToken.address],
      });
      await hre.run("verify:verify", {
        address: betHouse.address,
        constructorArguments: [pool.address],
      });
    } catch (e) {
      console.log("Verification failed:", e);
    }
  }
};

export default func;
func.tags = ["BetHouse", "Level34"];
