import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the Dex contract and SwappableToken contracts for Ethernaut level 22
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDex: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Dex contracts with account:", deployer);

  // Deploy the Dex contract
  const dex = await deploy("Dex", {
    contract: "Dex",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Dex contract deployed at: ${dex.address}`);

  // Get the Dex contract instance
  const dexContract = await ethers.getContractAt("Dex", dex.address);

  // Deploy token1 (SwappableToken)
  const token1 = await deploy("SwappableToken1", {
    contract: "SwappableToken",
    from: deployer,
    args: [dex.address, "Token 1", "TK1", ethers.parseEther("110")],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Token1 deployed at: ${token1.address}`);

  // Deploy token2 (SwappableToken)
  const token2 = await deploy("SwappableToken2", {
    contract: "SwappableToken",
    from: deployer,
    args: [dex.address, "Token 2", "TK2", ethers.parseEther("110")],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Token2 deployed at: ${token2.address}`);

  // Set tokens in Dex
  console.log("Setting tokens in Dex...");
  const setTokensTx = await dexContract.setTokens(token1.address, token2.address);
  await setTokensTx.wait();
  console.log("Tokens set in Dex");

  // Get token contract instances
  const token1Contract = await ethers.getContractAt("SwappableToken", token1.address);
  const token2Contract = await ethers.getContractAt("SwappableToken", token2.address);

  // Approve Dex to spend tokens
  console.log("Approving Dex to spend tokens...");
  const approve1Tx = await token1Contract.approve(dex.address, ethers.parseEther("100"));
  await approve1Tx.wait();
  const approve2Tx = await token2Contract.approve(dex.address, ethers.parseEther("100"));
  await approve2Tx.wait();

  // Add liquidity to Dex
  console.log("Adding liquidity to Dex...");
  const addLiq1Tx = await dexContract.addLiquidity(token1.address, ethers.parseEther("100"));
  await addLiq1Tx.wait();
  const addLiq2Tx = await dexContract.addLiquidity(token2.address, ethers.parseEther("100"));
  await addLiq2Tx.wait();
  console.log("Liquidity added to Dex (100 of each token)");

  // Log final balances
  const dexToken1Balance = await token1Contract.balanceOf(dex.address);
  const dexToken2Balance = await token2Contract.balanceOf(dex.address);
  const deployerToken1Balance = await token1Contract.balanceOf(deployer);
  const deployerToken2Balance = await token2Contract.balanceOf(deployer);

  console.log("\nFinal balances:");
  console.log(`  Dex token1: ${ethers.formatEther(dexToken1Balance)}`);
  console.log(`  Dex token2: ${ethers.formatEther(dexToken2Balance)}`);
  console.log(`  Deployer token1: ${ethers.formatEther(deployerToken1Balance)}`);
  console.log(`  Deployer token2: ${ethers.formatEther(deployerToken2Balance)}`);

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying Dex contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: dex.address,
        constructorArguments: [],
      });
      console.log("Dex contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Dex contract is already verified!");
      } else {
        console.error("Dex verification failed:", error);
      }
    }

    console.log("Verifying Token1 contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: token1.address,
        constructorArguments: [dex.address, "Token 1", "TK1", ethers.parseEther("110")],
      });
      console.log("Token1 contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Token1 contract is already verified!");
      } else {
        console.error("Token1 verification failed:", error);
      }
    }

    console.log("Verifying Token2 contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: token2.address,
        constructorArguments: [dex.address, "Token 2", "TK2", ethers.parseEther("110")],
      });
      console.log("Token2 contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Token2 contract is already verified!");
      } else {
        console.error("Token2 verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};


export default deployDex;

// Tags help to select which deploy script to run
deployDex.tags = ["level-22", "dex"];
