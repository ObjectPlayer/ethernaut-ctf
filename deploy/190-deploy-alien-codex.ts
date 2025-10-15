import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { parseEther } from "ethers";

/**
 * Deploys the AlienCodex contract for Ethernaut level 19
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployAlienCodex: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying AlienCodex contract with account:", deployer);

  // Deploy the AlienCodex contract
  const alienCodex = await deploy("AlienCodex", {
    contract: "AlienCodex",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`AlienCodex contract deployed at: ${alienCodex.address}`);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying AlienCodex contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: alienCodex.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address",  alienCodex.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};


export default deployAlienCodex;

// Tags help to select which deploy script to run
deployAlienCodex.tags = ["level-19", "alien-codex"];
