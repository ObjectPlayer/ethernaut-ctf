import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Delegation contract from Ethernaut level 6
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDelegation: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Delegate contract with account:", deployer);

  // First, deploy the Delegate contract
  const delegateContract = await deploy("Delegate", {
    from: deployer,
    args: [deployer], // Pass the deployer as the owner
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("Delegate deployed to:", delegateContract.address);

  console.log("Deploying Delegation contract with account:", deployer);

  // Then, deploy the Delegation contract with the Delegate address
  const delegationContract = await deploy("Delegation", {
    from: deployer,
    args: [delegateContract.address], // Pass the Delegate contract address
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("Delegation deployed to:", delegationContract.address);

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contracts
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    // Verify Delegate contract
    console.log("Verifying Delegate contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: delegateContract.address,
        constructorArguments: [deployer],
      });
      console.log("Delegate contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Delegate contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Delegate contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", delegateContract.address, "--constructor-args", deployer);
      } else {
        console.error("Delegate verification failed:", error);
      }
    }

    // Verify Delegation contract
    console.log("Verifying Delegation contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: delegationContract.address,
        constructorArguments: [delegateContract.address],
      });
      console.log("Delegation contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Delegation contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Delegation contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", delegationContract.address, "--constructor-args", delegateContract.address);
      } else {
        console.error("Delegation verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployDelegation;

// Tags help to select which deploy script to run
deployDelegation.tags = ["level-06", "delegation"];
