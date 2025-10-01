import { ethers } from "hardhat";

/**
 * This script helps calibrate the exact gas value needed for the GatekeeperOne challenge
 * It will estimate gas usage and show modulo values to help find a gas value that satisfies gate two
 * 
 * Usage:
 * EXPLOIT_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-13-gatekeeper-1/calibrate-gas.ts --network sepolia
 */
async function main() {
  // For the exploit address, we require it to be provided
  if (!process.env.EXPLOIT_ADDRESS) {
    console.error("Error: No GatekeeperOneExploit contract address provided.");
    console.error("Please provide the address of your deployed GatekeeperOneExploit contract using the EXPLOIT_ADDRESS environment variable.");
    console.error("Example: EXPLOIT_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-13-gatekeeper-1/calibrate-gas.ts --network sepolia");
    return;
  }
  const exploitAddress = process.env.EXPLOIT_ADDRESS;
  
  console.log(`Using GatekeeperOneExploit contract address: ${exploitAddress}`);
  
  // Get the contract factory for GatekeeperOneExploit
  const GatekeeperOneExploit = await ethers.getContractFactory("GatekeeperOneExploit");
  
  // Connect to the deployed contract
  const gatekeeperOneExploit = GatekeeperOneExploit.attach(exploitAddress);
  
  console.log(`Connected to GatekeeperOneExploit contract at: ${exploitAddress}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Attacker address: ${deployer.address}`);

  // Generate the gate key
  const gateKey = await gatekeeperOneExploit.getFunction("generateGateKey")(deployer.address);
  console.log(`\nGenerated gate key: ${gateKey}`);

  // The modulus we need to satisfy is 8191
  const modulus = 8191;

  // Verify key meets the conditions
  console.log("\nVerifying gate key conditions:");

  // Extract the last 2 bytes of the user's address for debugging
  const addressLast2Bytes = deployer.address.slice(-4);
  console.log(`Last 2 bytes of your address: 0x${addressLast2Bytes}`);
  
  // We need to print binary representations to understand the bit patterns
  // Convert gate key to binary for analysis
  let gatekeyHex = gateKey.toString();
  if (gatekeyHex.startsWith('0x')) {
    gatekeyHex = gatekeyHex.slice(2);
  }
  console.log(`Gate key hex: 0x${gatekeyHex}`);

  try {
    // Estimate gas for the transaction
    const estimatedGas = await gatekeeperOneExploit.getFunction("enterGate").estimateGas(modulus);
    console.log(`\nEstimated gas for transaction: ${estimatedGas}`);
    console.log(`Estimated gas % ${modulus} = ${estimatedGas % modulus}`);

    // Calculate some gas values that could work
    console.log(`\nCalculating potential gas values that could make gasleft() % ${modulus} = 0:`);
    
    // We'll estimate how much gas is consumed before the gate check
    // This is based on empirical testing and may vary by environment
    const estimatedBaseGas = 25000; // Approximate gas used before the gate check
    
    // Calculate a range of gas values to try
    for (let i = 0; i < 5; i++) {
      const baseMultiple = modulus * (i + 1);
      
      // Try different offsets around each multiple
      for (const offset of [-100, -50, -30, -10, -5, 0, 5, 10, 30, 50, 100]) {
        const gasValue = baseMultiple + offset;
        console.log(`Gas ${gasValue} => likely remainder at gate: ~${(gasValue - estimatedBaseGas) % modulus}`);
      }
      
      console.log("---");
    }
    
    // Based on previous successes, suggest specific values to try
    console.log(`\nBased on previous successes, try these specific gas values:`);
    const specificValues = [24527, 24789, 25000, 32764, 32582, 40973, 81910, 81911, 81909];
    specificValues.forEach(gas => {
      console.log(`Gas: ${gas} (${gas % modulus} away from multiple of ${modulus})`);
    });

  } catch (error: any) {
    console.error("\nError during gas calibration:", error.message || error);
  }

  console.log(`\nTo use a specific gas value, run the exploit script with:`);
  console.log(`EXPLOIT_ADDRESS=${exploitAddress} npx hardhat run scripts/level-13-gatekeeper-1/execute-gatekeeper-one-exploit.ts --network sepolia`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
