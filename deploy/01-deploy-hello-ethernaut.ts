import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Instance contract from Ethernaut level 0 (Hello Ethernaut)
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployHelloEthernaut: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("----------------------------------------------------");
  console.log("Deploying Hello Ethernaut (Instance) contract with account:", deployer);

  // The password for the Instance contract - this would typically be a secret
  // For educational purposes, we're using a simple password
  const password = "ethernaut0";

  // Deploy the Instance contract
  const instance = await deploy("Instance", {
    from: deployer,
    args: [password],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("Instance deployed to:", instance.address);
  console.log(`Password used: ${password} (remember this to solve the challenge)`);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: instance.address,
        constructorArguments: [password],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", instance.address, "--constructor-args", password);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployHelloEthernaut;

// Tags help to select which deploy script to run
deployHelloEthernaut.tags = ["level-00", "hello-ethernaut"];
