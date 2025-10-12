import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the MagicNumExploit solution for Ethernaut level 18
 * 
 * To deploy with a specific target MagicNum address:
 * npx hardhat deploy --tags magicnum-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployMagicnumSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  
  console.log("Deploying MagicNumExploit solution contract with account:", deployer);

  // Deploy the MagicNumExploit contract
  const magicnumExploit = await deploy("MagicNumSolver", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("MagicNumExploit deployed to:", magicnumExploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying MagicNumExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: magicnumExploit.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", magicnumExploit.address, "--constructor-args", []);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployMagicnumSolution;

// Tags help to select which deploy script to run
deployMagicnumSolution.tags = ["level-18", "magicnum-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the MagicNum contract being deployed first
  deployMagicnumSolution.dependencies = ["magicnum"];
}
