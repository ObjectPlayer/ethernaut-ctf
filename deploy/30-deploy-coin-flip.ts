import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the CoinFlip contract from Ethernaut level 3
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployCoinFlip: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying CoinFlip contract with account:", deployer);

  // Deploy the CoinFlip contract
  const coinFlip = await deploy("CoinFlip", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    waitConfirmations: !isLocalNetwork(chainId) ? 1 : 0, // wait for confirmation on non-local networks
  });

  console.log("CoinFlip deployed to:", coinFlip.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: coinFlip.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployCoinFlip;

// Tags help to select which deploy script to run
deployCoinFlip.tags = ["level-03", "coin-flip"];
