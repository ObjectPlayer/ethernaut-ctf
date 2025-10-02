import { ethers } from "hardhat";

/**
 * Deploy the GatekeeperTwo contract for Level 14 of Ethernaut
 * 
 * Usage:
 * npx hardhat run scripts/level-14-gatekeeper-2/deploy-gatekeeper-two.ts --network sepolia
 */
async function main() {
  console.log("Deploying GatekeeperTwo contract...");
  
  // Get the contract factory
  const GatekeeperTwo = await ethers.getContractFactory("GatekeeperTwo");
  
  // Deploy the contract
  const gatekeeperTwo = await GatekeeperTwo.deploy();
  
  // Wait for the transaction to be mined
  await gatekeeperTwo.deploymentTransaction()?.wait();
  
  console.log(`GatekeeperTwo deployed to: ${gatekeeperTwo.target}`);
  console.log("Save this address for use with the exploit contract.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
