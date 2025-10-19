import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the DexExploit solution for Ethernaut level 22
 * 
 * To deploy with a specific target Dex address:
 * TARGET_ADDRESS=0xYourDexAddress npx hardhat deploy --tags dex-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDexSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Get the target address from environment or use the deployed contract
  let targetAddress = process.env.TARGET_ADDRESS;
  if (!targetAddress) {
    try {
      const dexDeployment = await deployments.get("Dex");
      targetAddress = dexDeployment.address;
      console.log(`Using deployed Dex address: ${targetAddress}`);
    } catch (error) {
      console.log("Dex contract not found. You need to provide TARGET_ADDRESS environment variable.");
      return;
    }
  }
  
  console.log("Deploying DexExploit solution contract with account:", deployer);

  // Deploy the DexExploit contract
  const dexExploit = await deploy("DexExploit", {
    from: deployer,
    args: [targetAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0, // wait for 5 confirmations on non-local networks
  });

  console.log("DexExploit deployed to:", dexExploit.address);

  // Transfer initial tokens to the exploit contract (10 of each)
  // This simulates the player starting with 10 tokens of each type
  try {
    const token1Deployment = await deployments.get("SwappableToken1");
    const token2Deployment = await deployments.get("SwappableToken2");
    
    const token1Contract = await ethers.getContractAt("SwappableToken", token1Deployment.address);
    const token2Contract = await ethers.getContractAt("SwappableToken", token2Deployment.address);
    
    console.log("\nTransferring initial tokens to DexExploit contract...");
    const transfer1Tx = await token1Contract.transfer(dexExploit.address, 10);
    await transfer1Tx.wait();
    console.log("Transferred 10 token1 to DexExploit");
    
    const transfer2Tx = await token2Contract.transfer(dexExploit.address, 10);
    await transfer2Tx.wait();
    console.log("Transferred 10 token2 to DexExploit");

    // Check balances
    const exploitToken1Balance = await token1Contract.balanceOf(dexExploit.address);
    const exploitToken2Balance = await token2Contract.balanceOf(dexExploit.address);
    console.log(`\nDexExploit balances:`);
    console.log(`  Token1: ${ethers.formatEther(exploitToken1Balance)}`);
    console.log(`  Token2: ${ethers.formatEther(exploitToken2Balance)}`);
  } catch (error) {
    console.log("Note: Could not transfer initial tokens. You may need to do this manually.");
  }

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    // Add a delay to allow the blockchain explorer to index the contract
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying DexExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: dexExploit.address,
        constructorArguments: [targetAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", dexExploit.address, "--constructor-args", [targetAddress]);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployDexSolution;

// Tags help to select which deploy script to run
deployDexSolution.tags = ["level-22", "dex-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the Dex contract being deployed first
  deployDexSolution.dependencies = ["dex"];
}
