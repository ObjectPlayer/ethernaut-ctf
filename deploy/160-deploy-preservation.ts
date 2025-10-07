import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Preservation contract and library dependencies for Ethernaut level 16
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployPreservation: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying LibraryContract contracts with account:", deployer);

  // First, deploy the LibraryContract instances (we need two of them)
  const timeZone1Library = await deploy("LibraryContract", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
    contract: "LibraryContract"
  });

  const timeZone2Library = await deploy("LibraryContract", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
    contract: "LibraryContract"
  });

  console.log(`TimeZone1Library deployed at: ${timeZone1Library.address}`);
  console.log(`TimeZone2Library deployed at: ${timeZone2Library.address}`);

  console.log("Deploying Preservation contract with account:", deployer);

  // Now deploy the Preservation contract with the library addresses
  const preservation = await deploy("Preservation", {
    from: deployer,
    args: [timeZone1Library.address, timeZone2Library.address],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Preservation contract deployed at: ${preservation.address}`);

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contracts
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    // Verify LibraryContract 1
    console.log("Verifying TimeZone1Library contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: timeZone1Library.address,
        constructorArguments: [],
      });
      console.log("TimeZone1Library verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("TimeZone1Library is already verified!");
      } else {
        console.error("TimeZone1Library verification failed:", error);
      }
    }

    // Verify LibraryContract 2
    console.log("Verifying TimeZone2Library contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: timeZone2Library.address,
        constructorArguments: [],
      });
      console.log("TimeZone2Library verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("TimeZone2Library is already verified!");
      } else {
        console.error("TimeZone2Library verification failed:", error);
      }
    }
    
    // Verify Preservation contract
    console.log("Verifying Preservation contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: preservation.address,
        constructorArguments: [timeZone1Library.address, timeZone2Library.address],
      });
      console.log("Preservation contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Preservation contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", preservation.address, "--constructor-args", timeZone1Library.address, timeZone2Library.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployPreservation;

// Tags help to select which deploy script to run
deployPreservation.tags = ["level-16", "preservation"];
