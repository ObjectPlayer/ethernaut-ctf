import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the NaughtCoin contract from Ethernaut level 15
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployNaughtCoin: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying NaughtCoin contract with account:", deployer);

  // Deploy the NaughtCoin contract
  const naughtCoin = await deploy("NaughtCoin", {
    from: deployer,
    args: [deployer], // The player address is set to the deployer
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log(`NaughtCoin contract deployed at: ${naughtCoin.address}`);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: naughtCoin.address,
        constructorArguments: [deployer],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", naughtCoin.address, "--constructor-args", deployer);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployNaughtCoin;

// Tags help to select which deploy script to run
deployNaughtCoin.tags = ["level-15", "naught-coin"];
