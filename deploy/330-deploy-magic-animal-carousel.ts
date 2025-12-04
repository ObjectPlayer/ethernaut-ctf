import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";
import { ethers } from "hardhat";

/**
 * Deploys the MagicAnimalCarousel challenge contract for Ethernaut level 33
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployMagicAnimalCarousel: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying MagicAnimalCarousel contract with account:", deployer);

  // Deploy the MagicAnimalCarousel contract
  const magicAnimalCarouselContract = await deploy("MagicAnimalCarousel", {
    contract: "MagicAnimalCarousel",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`MagicAnimalCarousel deployed at: ${magicAnimalCarouselContract.address}`);

  // Get contract instance to display initial state
  const carouselInstance = await ethers.getContractAt("MagicAnimalCarousel", magicAnimalCarouselContract.address);
  const currentCrateId = await carouselInstance.currentCrateId();
  const maxCapacity = await carouselInstance.MAX_CAPACITY();
  const crate0 = await carouselInstance.carousel(0);

  console.log("\n=== Initial State ===");
  console.log(`Contract Address: ${magicAnimalCarouselContract.address}`);
  console.log(`Current Crate ID: ${currentCrateId}`);
  console.log(`Max Capacity: ${maxCapacity}`);
  console.log(`Crate 0 Value: ${crate0.toString()}`);
  console.log(`Crate 0 NextId: ${(crate0 >> 160n) & 0xFFFFn}`);

  console.log("\n⚠️  VULNERABILITY: Multiple Bugs in Animal Carousel");
  
  console.log("\n1. OPERATOR PRECEDENCE BUG:");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │ Code: encodedAnimal << 160 + 16                                 │");
  console.log("  │                                                                 │");
  console.log("  │ Expected: encodedAnimal << 176  (animal in bits [176-255])      │");
  console.log("  │ Actual:   (encodedAnimal << 160) + 16  (WRONG!)                 │");
  console.log("  │                                                                 │");
  console.log("  │ The animal bits overlap with nextId position [160-175]!         │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");

  console.log("\n2. ENCODING INCONSISTENCY:");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │ setAnimalAndSpin: encodeAnimalName(animal) >> 16  (80 bits)     │");
  console.log("  │ changeAnimal:     encodeAnimalName(animal)        (96 bits)     │");
  console.log("  │                                                                 │");
  console.log("  │ Same animal name → Different encoded values!                    │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");

  console.log("\n3. OWNER BYPASS:");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │ changeAnimal(\"\", crateId) clears the owner slot               │");
  console.log("  │                                                                 │");
  console.log("  │ After clearing: ANYONE can change the animal!                   │");
  console.log("  │ This breaks: \"the same animal must be there\"                    │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");

  console.log("\n4. NEXTID MANIPULATION:");
  console.log("  ┌─────────────────────────────────────────────────────────────────┐");
  console.log("  │ For 12-char animal names:                                       │");
  console.log("  │   encodedAnimal has 96 bits                                     │");
  console.log("  │   Low 16 bits OR into nextId position                           │");
  console.log("  │                                                                 │");
  console.log("  │ Result: Corrupted nextId, potential carousel loops              │");
  console.log("  └─────────────────────────────────────────────────────────────────┘");

  console.log("\n💡 THE EXPLOIT:");
  console.log("  1. Add animal via setAnimalAndSpin(\"Dog\")");
  console.log("  2. Clear owner via changeAnimal(\"\", crateId)");
  console.log("  3. Change animal via changeAnimal(\"Cat\", crateId)");
  console.log("  4. Original \"Dog\" is gone → Rule broken!");

  // Verify contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log("Verifying MagicAnimalCarousel on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: magicAnimalCarouselContract.address,
        constructorArguments: [],
      });
      console.log("MagicAnimalCarousel verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("MagicAnimalCarousel is already verified!");
      } else {
        console.error("MagicAnimalCarousel verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployMagicAnimalCarousel;

deployMagicAnimalCarousel.tags = ["level-33", "magic-animal-carousel"];
