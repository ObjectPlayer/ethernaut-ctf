import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the Impersonator challenge contracts for Ethernaut level 32
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployImpersonator: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Impersonator contracts with account:", deployer);

  // For local testing, we'll create a signature
  // In Ethernaut, this would be provided by the level
  const lockId = 1;
  
  // Create a wallet for signing (in real Ethernaut, this is the controller)
  const controllerWallet = ethers.Wallet.createRandom();
  console.log(`\n📝 Controller address: ${controllerWallet.address}`);
  
  // Compute the message hash the same way the contract does:
  // assembly {
  //   mstore(0x00, "\x19Ethereum Signed Message:\n32") // 28 bytes
  //   mstore(0x1C, _lockId) // 32 bytes at offset 28
  //   _msgHash := keccak256(0x00, 0x3c) // hash 60 bytes
  // }
  const prefix = ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32");
  const lockIdBytes = ethers.zeroPadValue(ethers.toBeHex(lockId), 32);
  const msgHashInput = ethers.concat([prefix, lockIdBytes]);
  const msgHash = ethers.keccak256(msgHashInput);
  console.log(`📝 Message hash: ${msgHash}`);
  
  // Sign the hash directly (raw ECDSA signature, not signMessage which adds another prefix)
  const sig = controllerWallet.signingKey.sign(msgHash);
  console.log(`   v: ${sig.v}`);
  console.log(`   r: ${sig.r}`);
  console.log(`   s: ${sig.s}`);
  
  // Create 96-byte signature: r (32 bytes) + s (32 bytes) + v (32 bytes as uint256)
  // The ECLocker reads:
  //   mload(add(_signature, 0x20)) -> r (bytes 0-31)
  //   mload(add(_signature, 0x40)) -> s (bytes 32-63)
  //   mload(add(_signature, 0x60)) -> v (bytes 64-95)
  const vPadded = ethers.zeroPadValue(ethers.toBeHex(sig.v), 32);
  const signature = ethers.concat([sig.r, sig.s, vPadded]);
  console.log(`📝 Signature (96 bytes): ${signature}`);

  // Step 1: Deploy Impersonator factory
  console.log("\n📝 Step 1: Deploying Impersonator factory...");
  const impersonatorContract = await deploy("Impersonator", {
    contract: "Impersonator",
    from: deployer,
    args: [0], // lockCounter starts at 0
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Impersonator factory deployed at: ${impersonatorContract.address}`);

  // Step 2: Deploy a new ECLocker via the factory
  console.log("\n📝 Step 2: Deploying ECLocker via factory...");
  const impersonatorInstance = await ethers.getContractAt("Impersonator", impersonatorContract.address);
  
  const deployLockTx = await impersonatorInstance.deployNewLock(signature);
  await deployLockTx.wait();
  
  // Get the deployed locker address
  const lockerAddress = await impersonatorInstance.lockers(0);
  console.log(`ECLocker deployed at: ${lockerAddress}`);
  
  // Get locker instance
  const lockerInstance = await ethers.getContractAt("ECLocker", lockerAddress);
  const controller = await lockerInstance.controller();
  const storedMsgHash = await lockerInstance.msgHash();
  
  console.log("\n=== Deployed Contracts ===");
  console.log(`Impersonator Factory: ${impersonatorContract.address}`);
  console.log(`ECLocker: ${lockerAddress}`);
  console.log(`Controller: ${controller}`);
  console.log(`Stored msgHash: ${storedMsgHash}`);

  console.log("\n⚠️  VULNERABILITY: ECDSA Signature Malleability");
  console.log("  The ECLocker contract has a critical signature replay vulnerability!");
  
  console.log("\n  The Problem:");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │ ECDSA Signature Malleability                                    │");
  console.log("  │                                                                 │");
  console.log("  │ For any valid signature (v, r, s), there exists another valid   │");
  console.log("  │ signature (v', r, s') that recovers to the SAME address:        │");
  console.log("  │                                                                 │");
  console.log("  │   v' = v XOR 1  (flips between 27 and 28)                       │");
  console.log("  │   s' = secp256k1.n - s                                          │");
  console.log("  │                                                                 │");
  console.log("  │ Where n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE...0364141          │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");

  console.log("\n  The Signature Tracking Bug:");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │ signatureHash = keccak256(abi.encode([r, s, v]))                │");
  console.log("  │                                                                 │");
  console.log("  │ Original:   hash(r, s, v)   → marked as used                    │");
  console.log("  │ Malleable:  hash(r, s', v') → DIFFERENT hash, not marked!       │");
  console.log("  │                                                                 │");
  console.log("  │ Both signatures recover to the same address, but have           │");
  console.log("  │ different hashes, bypassing the replay protection!              │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");

  console.log("\n💡 THE EXPLOIT:");
  console.log("  1. Get the original signature (v, r, s) from the NewLock event");
  console.log("  2. Compute malleable signature:");
  console.log("     - v' = (v == 27) ? 28 : 27");
  console.log("     - s' = secp256k1.n - s");
  console.log("  3. Call open(v', r, s') - bypasses replay check!");
  
  console.log("\n📝 Original Signature for Attack:");
  console.log(`  v: ${sig.v}`);
  console.log(`  r: ${sig.r}`);
  console.log(`  s: ${sig.s}`);

  // Verify contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log("Verifying Impersonator on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: impersonatorContract.address,
        constructorArguments: [0],
      });
      console.log("Impersonator verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Impersonator is already verified!");
      } else {
        console.error("Impersonator verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployImpersonator;

deployImpersonator.tags = ["level-32", "impersonator"];
