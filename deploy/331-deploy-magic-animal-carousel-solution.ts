import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the MagicAnimalCarouselAttack solution for Ethernaut level 33
 * 
 * To deploy with a specific carousel address:
 * CAROUSEL_ADDRESS=0xYourAddress npx hardhat deploy --tags magic-animal-carousel-solution --network sepolia
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployMagicAnimalCarouselSolution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying MagicAnimalCarouselAttack solution contract with account:", deployer);

  // Get carousel address from environment or from previous deployment
  let carouselAddress = process.env.CAROUSEL_ADDRESS;

  if (!carouselAddress) {
    console.log("CAROUSEL_ADDRESS not provided, fetching from deployments...");
    
    const carouselDeployment = await deployments.getOrNull("MagicAnimalCarousel");

    if (carouselDeployment) {
      carouselAddress = carouselDeployment.address;
      console.log(`  MagicAnimalCarousel: ${carouselAddress}`);
    } else {
      throw new Error("Please provide CAROUSEL_ADDRESS environment variable or deploy the instance contract first");
    }
  } else {
    console.log(`Using provided CAROUSEL_ADDRESS: ${carouselAddress}`);
  }

  // Deploy the MagicAnimalCarouselAttack contract
  const attackContract = await deploy("MagicAnimalCarouselAttack", {
    from: deployer,
    args: [carouselAddress],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log("MagicAnimalCarouselAttack deployed to:", attackContract.address);
  console.log("  Target Carousel:", carouselAddress);

  // Get contract instances to display current state
  let currentCrateId = "Unknown";
  let crate0NextId = "Unknown";
  let maxCapacity = "Unknown";
  
  try {
    const carouselContract = await ethers.getContractAt("MagicAnimalCarousel", carouselAddress!);
    currentCrateId = (await carouselContract.currentCrateId()).toString();
    const crate0 = await carouselContract.carousel(0);
    crate0NextId = ((crate0 >> 160n) & 0xFFFFn).toString();
    maxCapacity = (await carouselContract.MAX_CAPACITY()).toString();
  } catch (error: any) {
    console.log("\n⚠️  Could not query MagicAnimalCarousel state (may be on external network)");
    console.log("    You can query the state manually using the attack script.");
  }

  console.log("\n=== Current State ===");
  console.log(`Carousel Address: ${carouselAddress}`);
  console.log(`Current Crate ID: ${currentCrateId}`);
  console.log(`Crate 0 NextId: ${crate0NextId}`);
  console.log(`Max Capacity: ${maxCapacity}`);
  console.log(`Attack Contract: ${attackContract.address}`);

  console.log("\n=== Win Conditions ===");
  console.log("To pass this level, you must:");
  console.log("1. Break the carousel rule: 'the same animal must be there'");
  console.log("2. Change an animal after it has been added to the carousel");

  console.log("\n=== Attack Strategy ===");
  console.log("Exploit the Owner Bypass vulnerability:\n");
  
  console.log("1. The Vulnerabilities:");
  console.log("   ┌────────────────────────────────────────────────────────────┐");
  console.log("   │ A) Operator Precedence Bug:                                │");
  console.log("   │    `a << 160 + 16` = `(a << 160) + 16`, not `a << 176`     │");
  console.log("   │                                                            │");
  console.log("   │ B) Encoding Inconsistency:                                 │");
  console.log("   │    setAnimalAndSpin applies extra >> 16 shift              │");
  console.log("   │    changeAnimal does NOT                                   │");
  console.log("   │                                                            │");
  console.log("   │ C) Owner Bypass:                                           │");
  console.log("   │    changeAnimal(\"\", crateId) clears owner               │");
  console.log("   │    Then ANYONE can change the animal!                      │");
  console.log("   │                                                            │");
  console.log("   │ D) NextId Manipulation:                                    │");
  console.log("   │    12-char names corrupt nextId via OR operation           │");
  console.log("   └────────────────────────────────────────────────────────────┘");
  
  console.log("\n2. Attack Steps:");
  console.log("   Step 1: setAnimalAndSpin(\"Dog\") - Add an animal");
  console.log("   Step 2: changeAnimal(\"\", crateId) - Clear the owner");
  console.log("   Step 3: changeAnimal(\"Cat\", crateId) - Replace the animal");
  console.log("   Step 4: \"Dog\" is gone, \"Cat\" is there - Rule broken!");

  console.log("\n=== Storage Layout ===");
  console.log("Each crate in carousel mapping stores a uint256:");
  console.log("  ┌──────────────────────────────────────────────────────────────┐");
  console.log("  │  Bits [0-159]:   Owner address (160 bits)                    │");
  console.log("  │  Bits [160-175]: NextId (16 bits)                            │");
  console.log("  │  Bits [176-255]: Animal name (80 bits intended)              │");
  console.log("  │                                                              │");
  console.log("  │  BUT: Due to operator precedence bug, animal is placed at    │");
  console.log("  │  bits [160-255], overlapping with nextId!                    │");
  console.log("  └──────────────────────────────────────────────────────────────┘");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log("Verifying MagicAnimalCarouselAttack contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: attackContract.address,
        constructorArguments: [carouselAddress],
      });
      console.log("Contract verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      } else if (error.message.includes("does not have bytecode")) {
        console.log("Verification failed: Contract bytecode not found on the explorer yet.");
        console.log("You can manually verify later.");
      } else {
        console.error("Verification failed:", error);
      }
    }
  }
  
  console.log("\n----------------------------------------------------");
  console.log("📝 Next Steps:");
  console.log("1. Execute the attack using:");
  console.log(`   CAROUSEL_ADDRESS=${carouselAddress} ATTACK_ADDRESS=${attackContract.address} \\`);
  console.log(`   npx hardhat run scripts/level-33-magic-animal-carousel/attack.ts --network ${network.name}`);
  console.log("----------------------------------------------------");
};

export default deployMagicAnimalCarouselSolution;

deployMagicAnimalCarouselSolution.tags = ["level-33", "magic-animal-carousel-solution"];

if (!process.env.CAROUSEL_ADDRESS) {
  deployMagicAnimalCarouselSolution.dependencies = ["magic-animal-carousel"];
}
