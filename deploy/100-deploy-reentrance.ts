import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the Reentrance contract from Ethernaut level 10
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployReentrance: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Reentrance contract with account:", deployer);

  // Deploy the Reentrance contract with some initial ETH
  const initialFunding = ethers.parseEther("1");

  // Deploy the Reentrance contract
  const reentrance = await deploy("Reentrance", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log(`Reentrance contract deployed at: ${reentrance.address}`);

  // Once deployed, donate some ETH to create a balance
  const reentranceContract = await ethers.getContractAt("Reentrance", reentrance.address);
  console.log("Creating a balance in the contract for testing...");
  const tx = await reentranceContract.donate(deployer, {
    value: ethers.parseEther("0.5")
  });
  await tx.wait();
  console.log(`Added ${ethers.formatEther(ethers.parseEther("0.5"))} ETH to deployer's balance`);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: reentrance.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", reentrance.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployReentrance;

// Tags help to select which deploy script to run
deployReentrance.tags = ["level-10", "reentrance"];
