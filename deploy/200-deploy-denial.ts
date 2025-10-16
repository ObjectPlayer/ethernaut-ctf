import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { parseEther } from "ethers";

/**
 * Deploys the Denial contract for Ethernaut level 20
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDenial: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Denial contract with account:", deployer);

  // Deploy the Denial contract
  const denial = await deploy("Denial", {
    contract: "Denial",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Denial contract deployed at: ${denial.address}`);

  // Fund the Denial contract with some ETH for testing
  if (isLocalNetwork(chainId)) {
    const signer = await ethers.getSigner(deployer);
    const fundAmount = parseEther("0.001");
    
    console.log(`Funding Denial contract with ${ethers.formatEther(fundAmount)} ETH...`);
    const tx = await signer.sendTransaction({
      to: denial.address,
      value: fundAmount,
    });
    await tx.wait();
    console.log(`Denial contract funded successfully`);
  }

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying Denial contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: denial.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address",  denial.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};


export default deployDenial;

// Tags help to select which deploy script to run
deployDenial.tags = ["level-20", "denial"];
