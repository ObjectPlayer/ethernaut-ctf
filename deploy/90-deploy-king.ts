import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/**
 * Deploys the King contract with an initial prize
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying King contract with deployer:", deployer);

  // Deploy with 1 ether as the initial prize
  const initialPrize = ethers.parseEther("1");

  // Deploy the King contract
  const kingDeployment = await deploy("King", {
    from: deployer,
    args: [],
    log: true,
    value: initialPrize.toString(), // Send 1 ETH as the initial prize, convert BigNumber to string
  });

  console.log(`King contract deployed at: ${kingDeployment.address}`);
  console.log(`Initial prize: ${ethers.formatEther(initialPrize)} ETH`);
};

func.tags = ["King", "Level09"];

export default func;
