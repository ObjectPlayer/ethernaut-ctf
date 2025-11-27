import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the ImpersonatorAttack solution for Ethernaut level 32
 * 
 * To deploy with a specific ECLocker address:
 * LOCKER_ADDRESS=0xYourAddress npx hardhat deploy --tags impersonator-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployImpersonatorSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying ImpersonatorAttack solution contract with account:", deployer);

  // Get ECLocker address from environment or from previous deployment
  let lockerAddress = process.env.LOCKER_ADDRESS;

  if (!lockerAddress) {
    console.log("LOCKER_ADDRESS not provided, fetching from deployments...");
    
    const impersonatorDeployment = await deployments.getOrNull("Impersonator");

    if (impersonatorDeployment) {
      const impersonatorInstance = await ethers.getContractAt("Impersonator", impersonatorDeployment.address);
      lockerAddress = await impersonatorInstance.lockers(0);
      console.log(`  ECLocker: ${lockerAddress}`);
    } else {
      throw new Error("Please provide LOCKER_ADDRESS environment variable or deploy the instance contract first");
    }
  }

  // Deploy the ImpersonatorAttack contract
  const attackContract = await deploy("ImpersonatorAttack", {
    from: deployer,
    args: [lockerAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("ImpersonatorAttack deployed to:", attackContract.address);
  console.log("  Target ECLocker:", lockerAddress);

  // Get contract instances to display current state
  const lockerContract = await ethers.getContractAt("ECLocker", lockerAddress!);
  const attackContractInstance = await ethers.getContractAt("ImpersonatorAttack", attackContract.address);
  
  const controller = await lockerContract.controller();
  const msgHash = await lockerContract.msgHash();
  const lockId = await lockerContract.lockId();

  console.log("\n=== Current State ===");
  console.log(`ECLocker Address: ${lockerAddress}`);
  console.log(`Lock ID: ${lockId}`);
  console.log(`Controller: ${controller}`);
  console.log(`Message Hash: ${msgHash}`);
  console.log(`Attack Contract: ${attackContract.address}`);

  console.log("\n=== Win Conditions ===");
  console.log("To pass this level, you must:");
  console.log("1. Emit an Open event from the ECLocker");
  console.log("2. Do this without being the authorized controller");
  console.log("   (i.e., anyone can open the door)");

  console.log("\n=== Attack Strategy ===");
  console.log("Exploit ECDSA Signature Malleability:\n");
  
  console.log("1. The Vulnerability:");
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log("   │ For any valid ECDSA signature (v, r, s):               │");
  console.log("   │                                                        │");
  console.log("   │ There exists a malleable signature (v', r, s') where:  │");
  console.log("   │   v' = v XOR 1  (27 ↔ 28)                              │");
  console.log("   │   s' = secp256k1.n - s                                 │");
  console.log("   │                                                        │");
  console.log("   │ Both signatures recover to the SAME address!           │");
  console.log("   └────────────────────────────────────────────────────────┘");
  
  console.log("\n2. The Bug in ECLocker:");
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log("   │ signatureHash = keccak256(abi.encode([r, s, v]))       │");
  console.log("   │                                                        │");
  console.log("   │ Original sig:   (v, r, s)   → hash1 → marked used      │");
  console.log("   │ Malleable sig:  (v', r, s') → hash2 → NOT marked!      │");
  console.log("   │                                                        │");
  console.log("   │ hash1 ≠ hash2, so replay protection is bypassed!       │");
  console.log("   └────────────────────────────────────────────────────────┘");

  console.log("\n3. Attack Steps:");
  console.log("   Step 1: Get original signature from NewLock event");
  console.log("   Step 2: Compute malleable signature:");
  console.log("           v' = (v == 27) ? 28 : 27");
  console.log("           s' = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE");
  console.log("                BAAEDCE6AF48A03BBFD25E8CD0364141 - s");
  console.log("   Step 3: Call attack(v, r, s) on ImpersonatorAttack");
  console.log("   Step 4: Open event emitted - door unlocked!");

  console.log("\n=== secp256k1 Curve Order ===");
  console.log("n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log("Verifying ImpersonatorAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [lockerAddress],
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
  console.log("1. Get the original signature from the NewLock event (or Ethernaut)");
  console.log("2. Execute the attack using:");
  console.log(`   LOCKER_ADDRESS=${lockerAddress} ATTACK_ADDRESS=${attackContract.address} \\`);
  console.log(`   V=<original_v> R=<original_r> S=<original_s> \\`);
  console.log(`   npx hardhat run scripts/level-32-impersonator/attack.ts --network ${network.name}`);
  console.log("----------------------------------------------------");
};

export default deployImpersonatorSolution;

deployImpersonatorSolution.tags = ["level-32", "impersonator-solution"];

if (!process.env.LOCKER_ADDRESS) {
  deployImpersonatorSolution.dependencies = ["impersonator"];
}
