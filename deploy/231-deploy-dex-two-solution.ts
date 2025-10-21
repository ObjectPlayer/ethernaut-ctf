import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the DexTwoExploit solution for Ethernaut level 23
 * 
 * To deploy with a specific target DexTwo address:
 * TARGET_ADDRESS=0xYourDexTwoAddress npx hardhat deploy --tags dex-two-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDexTwoSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Get the target address from environment or use the deployed contract
  let targetAddress = process.env.TARGET_ADDRESS;
  if (!targetAddress) {
    try {
      const dexTwoDeployment = await deployments.get("DexTwo");
      targetAddress = dexTwoDeployment.address;
      console.log(`Using deployed DexTwo address: ${targetAddress}`);
    } catch (error) {
      console.log("DexTwo contract not found. You need to provide TARGET_ADDRESS environment variable.");
      return;
    }
  }
  
  console.log("Deploying DexTwoExploit solution contract with account:", deployer);

  // Deploy the DexTwoExploit contract
  const dexTwoExploit = await deploy("DexTwoExploit", {
    from: deployer,
    args: [targetAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("DexTwoExploit deployed to:", dexTwoExploit.address);

  // Get the malicious token address
  const exploitContract = await ethers.getContractAt("DexTwoExploit", dexTwoExploit.address);
  const maliciousTokenAddress = await exploitContract.getMaliciousToken();
  console.log("Malicious token deployed at:", maliciousTokenAddress);

  // Transfer initial tokens to the exploit contract (10 of each)
  // This simulates the player starting with 10 tokens of each type
  try {
    const token1Deployment = await deployments.get("SwappableTokenTwo1");
    const token2Deployment = await deployments.get("SwappableTokenTwo2");
    
    const token1Contract = await ethers.getContractAt("SwappableTokenTwo", token1Deployment.address);
    const token2Contract = await ethers.getContractAt("SwappableTokenTwo", token2Deployment.address);
    
    console.log("\nTransferring initial tokens to DexTwoExploit contract...");
    const transfer1Tx = await token1Contract.transfer(dexTwoExploit.address, ethers.parseEther("10"));
    await transfer1Tx.wait();
    console.log("Transferred 10 token1 to DexTwoExploit");
    
    const transfer2Tx = await token2Contract.transfer(dexTwoExploit.address, ethers.parseEther("10"));
    await transfer2Tx.wait();
    console.log("Transferred 10 token2 to DexTwoExploit");

    // Check balances
    const exploitToken1Balance = await token1Contract.balanceOf(dexTwoExploit.address);
    const exploitToken2Balance = await token2Contract.balanceOf(dexTwoExploit.address);
    const maliciousToken = await ethers.getContractAt("MaliciousToken", maliciousTokenAddress);
    const exploitMaliciousBalance = await maliciousToken.balanceOf(dexTwoExploit.address);
    
    console.log(`\nDexTwoExploit balances:`);
    console.log(`  Token1: ${ethers.formatEther(exploitToken1Balance)}`);
    console.log(`  Token2: ${ethers.formatEther(exploitToken2Balance)}`);
    console.log(`  Malicious: ${ethers.formatEther(exploitMaliciousBalance)}`);
  } catch (error) {
    console.log("Note: Could not transfer initial tokens. You may need to do this manually.");
  }

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying DexTwoExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: dexTwoExploit.address,
        constructorArguments: [targetAddress],
      });
      console.log("DexTwoExploit contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", dexTwoExploit.address, "--constructor-args", [targetAddress]);
      } else {
        console.error("Verification failed:", error);
      }
    }

    console.log("Verifying MaliciousToken contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: maliciousTokenAddress,
        constructorArguments: [],
      });
      console.log("MaliciousToken contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("MaliciousToken is already verified!");
      } else {
        console.error("MaliciousToken verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
};

export default deployDexTwoSolution;

// Tags help to select which deploy script to run
deployDexTwoSolution.tags = ["level-23", "dex-two-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the DexTwo contract being deployed first
  deployDexTwoSolution.dependencies = ["dex-two"];
}
