import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the TelephoneCall solution contract for Ethernaut level 4
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployTelephoneCall: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Get the deployed Telephone contract
  const telephone = await get("Telephone");
  
  console.log("Deploying TelephoneCall solution contract with account:", deployer);
  console.log("Using Telephone at address:", telephone.address);

  const telephoneCall = await deploy("TelephoneCall", {
    from: deployer,
    args: [telephone.address],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("TelephoneCall solution deployed to:", telephoneCall.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying TelephoneCall contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: telephoneCall.address,
        constructorArguments: [telephone.address],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", guessCoinFlip.address, "--constructor-args", coinFlip.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployTelephoneCall;

// Tags help to select which deploy script to run
deployTelephoneCall.tags = ["level-04", "telephone-solution"];
// This script depends on the Telephone contract being deployed first
deployTelephoneCall.dependencies = ["telephone"];
