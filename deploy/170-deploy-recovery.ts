import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { parseEther, formatEther } from "ethers";

/**
 * Deploys the Recovery contract for Ethernaut level 17
 * and creates a token with initial supply, then sends ETH to it
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployRecovery: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying Recovery contract with account:", deployer);

  // Deploy the Recovery contract
  const recovery = await deploy("Recovery", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Recovery contract deployed at: ${recovery.address}`);

  // Create a token using the Recovery contract
  const tokenName = "InitialToken";
  const initialSupply = 1000000;

  const recoveryContract = await ethers.getContractAt("Recovery", recovery.address);
  const signers = await ethers.getSigners();
  const deployerSigner = signers[0];

  console.log(`Creating token "${tokenName}" with initial supply ${initialSupply}`);
  const tx = await recoveryContract.generateToken(tokenName, initialSupply);
  await tx.wait();

  // Calculate the token address (simplified version - not fully accurate in all environments)
  const tokenAddress = await calculateTokenAddress(ethers ,recovery.address);
  console.log(`Calculated token address: ${tokenAddress}`);

  // Send 0.001 ETH to the token contract
  const ethAmount = parseEther("0.001");
  console.log(`Sending ${formatEther(ethAmount)} ETH to token contract...`);
  
  await deployerSigner.sendTransaction({
    to: tokenAddress,
    value: ethAmount
  });

  // Store this information for later steps
  console.log(`
  Recovery Level Setup Complete:
  ------------------------------
  Recovery Contract: ${recovery.address}
  Created Token Name: ${tokenName}
  "Lost" Token Address: ${tokenAddress}
  ETH sent to token: 0.001 ETH
  
  Set RECOVERY_INSTANCE_ADDRESS=${recovery.address} to use in other scripts
  `);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying Recovery contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: recovery.address,
        constructorArguments: [],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", recovery.address);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

/**
 * Calculate token address created by a contract (simplified version)
 * Note: This is not 100% accurate for all environments, but works for this challenge
 * @param recoveryAddress The address of the Recovery contract
 * @returns The calculated address of the created token
 */
async function calculateTokenAddress(ethers:any,recoveryAddress: string): Promise<string> {
  
  // This calculation mimics how contract addresses are created
  // For a contract with nonce 1 (first created contract)
  const tokenAddressBytes = ethers.keccak256(
    ethers.encodeRlp([
      recoveryAddress,
      "0x01" // nonce 1
    ])
  );
  
  // Take the last 20 bytes as the address
  const tokenAddress = "0x" + tokenAddressBytes.slice(26);
  
  return tokenAddress;
}

export default deployRecovery;

// Tags help to select which deploy script to run
deployRecovery.tags = ["level-17", "recovery"];
