import { ethers, run, network } from "hardhat";
import { isVerificationEnabled, getNetworkName } from "../utils/network-config";

/**
 * Verify a contract on Etherscan or similar block explorer
 * 
 * Usage:
 * npx hardhat run scripts/verify.ts --network sepolia -- --address 0xContractAddress --constructor-args arg1,arg2
 * 
 * Options:
 * --address: The contract address to verify
 * --constructor-args: Comma-separated list of constructor arguments (optional)
 */
async function main() {
  const chainId = network.config.chainId || 31337;
  
  // Check if verification is enabled for this network
  if (!isVerificationEnabled(chainId)) {
    console.log(`Verification is not enabled for network ${getNetworkName(chainId)} (chainId: ${chainId})`);
    console.log("If this is incorrect, update the network configuration in utils/network-config.ts");
    return;
  }
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let contractAddress = "";
  let constructorArgs: any[] = [];
  
  // Extract contract address
  const addressIndex = args.findIndex(arg => arg === "--address");
  if (addressIndex !== -1 && args.length > addressIndex + 1) {
    contractAddress = args[addressIndex + 1];
  } else {
    console.error("Error: Contract address is required. Use --address flag.");
    process.exit(1);
  }
  
  // Extract constructor arguments if provided
  const argsIndex = args.findIndex(arg => arg === "--constructor-args");
  if (argsIndex !== -1 && args.length > argsIndex + 1) {
    constructorArgs = args[argsIndex + 1].split(",");
    
    // Convert string numbers to actual numbers if needed
    constructorArgs = constructorArgs.map(arg => {
      // Check if the argument is a number
      if (/^-?\d+(\.\d+)?$/.test(arg)) {
        return Number(arg);
      }
      // Check if it's a boolean
      if (arg.toLowerCase() === "true") return true;
      if (arg.toLowerCase() === "false") return false;
      // Otherwise keep as string
      return arg;
    });
  }
  
  console.log(`Verifying contract at address: ${contractAddress}`);
  console.log(`Network: ${getNetworkName(chainId)} (chainId: ${chainId})`);
  if (constructorArgs.length > 0) {
    console.log(`Constructor arguments: ${constructorArgs}`);
  } else {
    console.log("No constructor arguments provided");
  }
  
  try {
    // Attempt to verify the contract
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    
    console.log("Contract verification successful!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Verification failed:", error);
      process.exitCode = 1;
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
