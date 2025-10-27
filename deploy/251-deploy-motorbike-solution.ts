import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the MotorbikeExploit solution for Ethernaut level 25
 * 
 * To deploy with a specific target Motorbike address:
 * TARGET_ADDRESS=OxTRAGET_ADDRESS npx hardhat deploy --tags motorbike-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployMotorbikeSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  
  console.log("Deploying MotorbikeExploit solution contract with account:", deployer);

  // Deploy the MotorbikeExploit contract
  const exploit = await deploy("MotorbikeExploit", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("MotorbikeExploit deployed to:", exploit.address);

    
  // // If engine address is zero, we need to read it from storage
  // if (engineAddress === ethers.ZeroAddress) {
  //   console.log("Reading engine address from proxy storage...");
  //   const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  //   const implFromStorage = await ethers.provider.getStorage(targetAddress, IMPLEMENTATION_SLOT);
  //   const implAddress = "0x" + implFromStorage.slice(-40);
  //   console.log(`Engine address from storage: ${implAddress}`);
    
  //   // Set the engine address in the exploit contract
  //   const setEngineTx = await exploitContract.setEngine(implAddress);
  //   await setEngineTx.wait();
  //   console.log(`Engine address set in exploit contract`);
  // }

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying MotorbikeExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: exploit.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", exploit.address, "--constructor-args", []);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
  console.log("\n📝 Next Steps:");
  console.log("1. Execute the exploit using:");
  console.log(`   EXPLOIT_ADDRESS=${exploit.address} TARGET_ADDRESS=0xTARGET_ADDRESS npx hardhat run scripts/level-25-motorbike/execute-motorbike-exploit.ts --network ${network.name}`);
  console.log("\n⚠️  WARNING: This will permanently destroy the Engine implementation!");
};

export default deployMotorbikeSolution;

// Tags help to select which deploy script to run
deployMotorbikeSolution.tags = ["level-25", "motorbike-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Motorbike contract being deployed first
  deployMotorbikeSolution.dependencies = ["motorbike"];
}
