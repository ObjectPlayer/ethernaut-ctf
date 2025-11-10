import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the MotorbikeOneShot solution for Ethernaut level 25
 * 
 * This is the EIP-6780 compliant one-shot exploit that:
 * 1. Calls Ethernaut to create instance
 * 2. Destroys Engine in the SAME transaction
 * 
 * Usage:
 * ETHERNAUT_ADDRESS=0x... LEVEL_ADDRESS=0x... ENGINE_ADDRESS=0x... npx hardhat deploy --tags motorbike-oneshot --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployMotorbikeOneShot: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying MotorbikeOneShot solution contract with account:", deployer);
  console.log("\n⚠️  NOTE: This is the EIP-6780 compliant one-shot solution");
  console.log("It creates and destroys Engine in a SINGLE transaction!");

  // Deploy the MotorbikeOneShot contract
  const oneShot = await deploy("MotorbikeOneShot", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("MotorbikeOneShot deployed to:", oneShot.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying MotorbikeOneShot contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: oneShot.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
  console.log("\n📝 How to use:");
  console.log("\n1. Find the Engine implementation address:");
  console.log("   - Check Ethernaut's level factory contract");
  console.log("   - Or create a test instance and read from storage slot");
  console.log("   - Slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");
  console.log("\n2. Execute the one-shot exploit:");
  console.log(`   ONESHOT_ADDRESS=${oneShot.address} \\`);
  console.log("   ETHERNAUT_ADDRESS=0x... \\");
  console.log("   LEVEL_ADDRESS=0x... \\");
  console.log("   ENGINE_ADDRESS=0x... \\");
  console.log(`   npx hardhat run scripts/level-25-motorbike/execute-oneshot.ts --network ${network.name}`);
  console.log("\n3. Everything happens in ONE transaction!");
  console.log("   ✅ EIP-6780 compliant");
  console.log("   ✅ Engine created and destroyed in same tx");
};

export default deployMotorbikeOneShot;

deployMotorbikeOneShot.tags = ["level-25", "motorbike-oneshot"];
