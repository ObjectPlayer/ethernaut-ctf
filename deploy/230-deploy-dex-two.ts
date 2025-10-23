import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the DexTwo contract and SwappableTokenTwo contracts for Ethernaut level 23
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDexTwo: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying DexTwo contracts with account:", deployer);

  // Deploy the DexTwo contract
  const dexTwo = await deploy("DexTwo", {
    contract: "DexTwo",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`DexTwo contract deployed at: ${dexTwo.address}`);

  // Get the DexTwo contract instance
  const dexTwoContract = await ethers.getContractAt("DexTwo", dexTwo.address);

  // Deploy token1 (SwappableTokenTwo)
  const token1 = await deploy("SwappableTokenTwo1", {
    contract: "SwappableTokenTwo",
    from: deployer,
    args: [dexTwo.address, "Token 1", "TK1", ethers.parseEther("110")],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Token1 deployed at: ${token1.address}`);

  // Deploy token2 (SwappableTokenTwo)
  const token2 = await deploy("SwappableTokenTwo2", {
    contract: "SwappableTokenTwo",
    from: deployer,
    args: [dexTwo.address, "Token 2", "TK2", ethers.parseEther("110")],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Token2 deployed at: ${token2.address}`);

  // Set tokens in DexTwo
  console.log("Setting tokens in DexTwo...");
  const setTokensTx = await dexTwoContract.setTokens(token1.address, token2.address);
  await setTokensTx.wait();
  console.log("Tokens set in DexTwo");

  // Get token contract instances
  const token1Contract = await ethers.getContractAt("SwappableTokenTwo", token1.address);
  const token2Contract = await ethers.getContractAt("SwappableTokenTwo", token2.address);

  // Approve DexTwo to spend tokens
  console.log("Approving DexTwo to spend tokens...");
  const approve1Tx = await token1Contract.approve(dexTwo.address, ethers.parseEther("100"));
  await approve1Tx.wait();
  const approve2Tx = await token2Contract.approve(dexTwo.address, ethers.parseEther("100"));
  await approve2Tx.wait();

  // Add liquidity to DexTwo
  console.log("Adding liquidity to DexTwo...");
  const addLiq1Tx = await dexTwoContract.add_liquidity(token1.address, ethers.parseEther("100"));
  await addLiq1Tx.wait();
  const addLiq2Tx = await dexTwoContract.add_liquidity(token2.address, ethers.parseEther("100"));
  await addLiq2Tx.wait();
  console.log("Liquidity added to DexTwo (100 of each token)");

  // Log final balances
  const dexToken1Balance = await token1Contract.balanceOf(dexTwo.address);
  const dexToken2Balance = await token2Contract.balanceOf(dexTwo.address);
  const deployerToken1Balance = await token1Contract.balanceOf(deployer);
  const deployerToken2Balance = await token2Contract.balanceOf(deployer);

  console.log("\nFinal balances:");
  console.log(`  DexTwo token1: ${ethers.formatEther(dexToken1Balance)}`);
  console.log(`  DexTwo token2: ${ethers.formatEther(dexToken2Balance)}`);
  console.log(`  Deployer token1: ${ethers.formatEther(deployerToken1Balance)}`);
  console.log(`  Deployer token2: ${ethers.formatEther(deployerToken2Balance)}`);

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying DexTwo contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: dexTwo.address,
        constructorArguments: [],
      });
      console.log("DexTwo contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("DexTwo contract is already verified!");
      } else {
        console.error("DexTwo verification failed:", error);
      }
    }

    console.log("Verifying Token1 contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: token1.address,
        constructorArguments: [dexTwo.address, "Token 1", "TK1", ethers.parseEther("110")],
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
        constructorArguments: [dexTwo.address, "Token 2", "TK2", ethers.parseEther("110")],
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


export default deployDexTwo;

// Tags help to select which deploy script to run
deployDexTwo.tags = ["level-23", "dex-two"];
