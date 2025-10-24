import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the PuzzleWalletExploit solution for Ethernaut level 24
 * 
 * To deploy with a specific target PuzzleProxy address:
 * TARGET_ADDRESS=0xYourProxyAddress ATTACKER=0xYourAttackerAddress npx hardhat deploy --tags puzzle-wallet-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployPuzzleWalletSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  // Get the target address from environment or use the deployed contract
  let targetAddress = process.env.TARGET_ADDRESS;
  let attackerAddress = process.env.ATTACKER;
  if (!targetAddress) {
    try {
      const proxyDeployment = await deployments.get("PuzzleProxy");
      targetAddress = proxyDeployment.address;
      console.log(`Using deployed PuzzleProxy address: ${targetAddress}`);
    } catch (error) {
      console.log("PuzzleProxy contract not found. You need to provide TARGET_ADDRESS environment variable.");
      return;
    }
  }
  if (!attackerAddress) {
    attackerAddress = deployer;
  }
  
  console.log("Deploying PuzzleWalletExploit solution contract with account:", deployer);

  // Deploy the PuzzleWalletExploit contract
  const exploit = await deploy("PuzzleWalletExploit", {
    from: deployer,
    args: [targetAddress, attackerAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("PuzzleWalletExploit deployed to:", exploit.address);

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying PuzzleWalletExploit contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: exploit.address,
        constructorArguments: [targetAddress, attackerAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later using: npx hardhat run scripts/verify.ts --network sepolia -- --address", exploit.address, "--constructor-args", [targetAddress]);
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("----------------------------------------------------");
  console.log("\n📝 Next Steps:");
  console.log("1. Execute the exploit using:");
  console.log(`   EXPLOIT_ADDRESS=${exploit.address} TARGET_ADDRESS=${targetAddress} npx hardhat run scripts/level-24-puzzle-wallet/execute-puzzle-wallet-exploit.ts --network ${network.name}`);
  console.log("\n2. Make sure to send some ETH (e.g., 0.001 ETH) with the exploit transaction");
};

export default deployPuzzleWalletSolution;

// Tags help to select which deploy script to run
deployPuzzleWalletSolution.tags = ["level-24", "puzzle-wallet-solution"];

// Only add dependency if we're not using a provided target address
if (!process.env.TARGET_ADDRESS) {
  // This script depends on the PuzzleProxy contract being deployed first
  deployPuzzleWalletSolution.dependencies = ["puzzle-wallet"];
}
