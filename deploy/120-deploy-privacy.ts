import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the Privacy contract from Ethernaut level 12
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployPrivacy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Privacy contract with account:", deployer);

  // Generate random data for the Privacy contract
  const data: string[] = [];
  for (let i = 0; i < 3; i++) {
    const randomBytes = ethers.randomBytes(32);
    const randomBytesHex = ethers.hexlify(randomBytes);
    data.push(randomBytesHex);
  }

  console.log("Generated data for Privacy contract:");
  console.log("Data[0]:", data[0]);
  console.log("Data[1]:", data[1]);
  console.log("Data[2]:", data[2]); // This is what we'll need for the exploit

  // Deploy the Privacy contract
  const privacy = await deploy("Privacy", {
    from: deployer,
    args: [data],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log(`Privacy contract deployed at: ${privacy.address}`);
  console.log(`Remember to save the data[2] value for the exploit: ${data[2]}`);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: privacy.address,
        constructorArguments: [data],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", privacy.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployPrivacy;

// Tags help to select which deploy script to run
deployPrivacy.tags = ["level-12", "privacy"];
