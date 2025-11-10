import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Motorbike contracts (Proxy + Engine Implementation) for Ethernaut level 25
 * Note: This uses Solidity 0.6.x
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployMotorbike: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Motorbike contracts with account:", deployer);

  // Deploy the Engine implementation contract
  const engine = await deploy("Engine", {
    contract: "Engine",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Engine implementation deployed at: ${engine.address}`);

  // Deploy the Motorbike proxy
  const motorbike = await deploy("Motorbike", {
    contract: "Motorbike",
    from: deployer,
    args: [engine.address], // Pass implementation address
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Motorbike proxy deployed at: ${motorbike.address}`);

  // Log current state
  const engineContract = await ethers.getContractAt("Engine", engine.address);
  const motorbikeAsEngine = await ethers.getContractAt("Engine", motorbike.address);

  console.log("\n=== Current State ===");
  
  // Check proxy state (initialized via delegatecall)
  try {
    const proxyUpgrader = await motorbikeAsEngine.upgrader();
    const proxyHorsePower = await motorbikeAsEngine.horsePower();
    console.log(`Proxy (via Engine interface):`);
    console.log(`  Upgrader: ${proxyUpgrader}`);
    console.log(`  Horse Power: ${proxyHorsePower}`);
  } catch (e) {
    console.log(`Proxy state check failed (expected)`);
  }

  // Check implementation state (should be uninitialized!)
  try {
    const implUpgrader = await engineContract.upgrader();
    const implHorsePower = await engineContract.horsePower();
    console.log(`\nEngine Implementation (DIRECT):`);
    console.log(`  Upgrader: ${implUpgrader}`);
    console.log(`  Horse Power: ${implHorsePower}`);
    
    if (implUpgrader === ethers.ZeroAddress) {
      console.log(`  ⚠️  VULNERABILITY: Implementation is UNINITIALIZED!`);
      console.log(`  ⚠️  Anyone can call initialize() directly on the implementation!`);
    }
  } catch (e) {
    console.log(`Implementation state check failed`);
  }

  // Read implementation slot from proxy storage
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const implFromStorage = await ethers.provider.getStorage(motorbike.address, IMPLEMENTATION_SLOT);
  const implAddress = "0x" + implFromStorage.slice(-40);
  
  console.log(`\nImplementation slot verification:`);
  console.log(`  Slot: ${IMPLEMENTATION_SLOT}`);
  console.log(`  Value: ${implFromStorage}`);
  console.log(`  Address: ${implAddress}`);
  console.log(`  Matches deployed: ${implAddress.toLowerCase() === engine.address.toLowerCase()}`);

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying Engine implementation on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: engine.address,
        constructorArguments: [],
      });
      console.log("Engine implementation verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Engine implementation is already verified!");
      } else {
        console.error("Engine implementation verification failed:", error);
      }
    }

    console.log("Verifying Motorbike proxy on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: motorbike.address,
        constructorArguments: [engine.address],
      });
      console.log("Motorbike proxy verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Motorbike proxy is already verified!");
      } else {
        console.error("Motorbike proxy verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployMotorbike;

// Tags help to select which deploy script to run
deployMotorbike.tags = ["level-25", "motorbike"];
