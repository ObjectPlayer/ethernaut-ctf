import { ethers } from "hardhat";

const ALICE = "0xA11CE84AcB91Ac59B0A4E2945C9157eF3Ab17D4e";

async function main() {
  const tokenAddress = process.env.ELLIPTIC_TOKEN_ADDRESS;
  if (!tokenAddress) throw new Error("Set ELLIPTIC_TOKEN_ADDRESS");

  console.log("=== Finding Voucher Parameters ===\n");
  console.log("Token:", tokenAddress);

  const token = await ethers.getContractAt("EllipticToken", tokenAddress);
  const selector = token.interface.getFunction("redeemVoucher")?.selector;
  console.log("redeemVoucher selector:", selector);

  // Find mint events
  const filter = token.filters.Transfer(ethers.ZeroAddress, ALICE);
  const events = await token.queryFilter(filter);
  console.log(`\nFound ${events.length} mint event(s) to ALICE\n`);

  for (const event of events) {
    const txHash = event.transactionHash;
    console.log("Transaction:", txHash);

    try {
      // Use callTracer
      const trace = await ethers.provider.send("debug_traceTransaction", [
        txHash,
        { tracer: "callTracer" }
      ]) as any;

      function findCall(call: any): any {
        if (call.input && call.input.startsWith(selector!)) return call;
        for (const sub of call.calls || []) {
          const f = findCall(sub);
          if (f) return f;
        }
        return null;
      }

      const found = findCall(trace);
      if (found) {
        const decoded = token.interface.parseTransaction({ data: found.input });
        if (decoded) {
          console.log("\n✅ Found redeemVoucher call!\n");
          console.log("Amount:", decoded.args[0].toString());
          console.log("Receiver:", decoded.args[1]);
          console.log("Salt:", decoded.args[2]);
          console.log("Owner Sig:", decoded.args[3]);
          console.log("ALICE Sig:", decoded.args[4]);
          
          console.log("\n=== Copy these for the attack ===\n");
          console.log(`VOUCHER_AMOUNT=${decoded.args[0].toString()}`);
          console.log(`VOUCHER_SALT=${decoded.args[2]}`);
          console.log(`ALICE_SIGNATURE=${decoded.args[4]}`);
          return;
        }
      }
    } catch (e: any) {
      console.log("Trace error:", e.message?.slice(0, 100));
    }

    // Try raw trace
    try {
      const rawTrace = await ethers.provider.send("trace_transaction", [txHash]) as any[];
      for (const entry of rawTrace) {
        if (entry.action?.input?.startsWith(selector!)) {
          const decoded = token.interface.parseTransaction({ data: entry.action.input });
          if (decoded) {
            console.log("\n✅ Found via raw trace!\n");
            console.log(`VOUCHER_AMOUNT=${decoded.args[0].toString()}`);
            console.log(`VOUCHER_SALT=${decoded.args[2]}`);
            console.log(`ALICE_SIGNATURE=${decoded.args[4]}`);
            return;
          }
        }
      }
    } catch (e: any) {
      console.log("Raw trace error:", e.message?.slice(0, 100));
    }
  }

  console.log("\n❌ Could not find voucher parameters via tracing.");
  console.log("Your RPC may not support debug_traceTransaction.");
  console.log("Try using an RPC that supports tracing (e.g., Alchemy, QuickNode with debug enabled).");
}

main().catch(console.error);
