import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the CoinFlip contract from Ethernaut level 3
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying CoinFlip contract with account:", deployer);

  const coinFlip = await deploy("CoinFlip", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  console.log("CoinFlip deployed to:", coinFlip.address);
  console.log("----------------------------------------------------");
};

export default func;

// Tags help to select which deploy script to run
func.tags = ["level-03", "coin-flip"];
