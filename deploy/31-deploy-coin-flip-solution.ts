import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the GuessCoinFlip solution contract for Ethernaut level 3
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get the deployed CoinFlip contract
  const coinFlip = await get("CoinFlip");
  
  console.log("Deploying GuessCoinFlip solution contract with account:", deployer);
  console.log("Using CoinFlip at address:", coinFlip.address);

  const guessCoinFlip = await deploy("GuessCoinFlip", {
    from: deployer,
    args: [coinFlip.address],
    log: true,
    autoMine: true,
  });

  console.log("GuessCoinFlip solution deployed to:", guessCoinFlip.address);
  console.log("----------------------------------------------------");
};

export default func;

// Tags help to select which deploy script to run
func.tags = ["level-03", "coin-flip-solution"];
// This script depends on the CoinFlip contract being deployed first
func.dependencies = ["coin-flip"];
