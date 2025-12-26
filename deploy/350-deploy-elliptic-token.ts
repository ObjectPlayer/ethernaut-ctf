import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/**
 * Deployment script for Elliptic Token Instance Contract
 *
 * This deploys the EllipticToken contract and simulates ALICE redeeming a voucher.
 *
 * VULNERABILITY: Domain Confusion in ECDSA Signature Verification
 *
 * The permit() function uses bytes32(amount) directly as the message for ECDSA.recover()
 * instead of a proper hash. This allows ALICE's voucher signature to be reused
 * as a permit signature by setting amount = uint256(voucherHash).
 *
 * EXPLOIT FLOW:
 * 1. ALICE redeems voucher, signing voucherHash = keccak256(amount, ALICE, salt)
 * 2. Attacker calls permit(uint256(voucherHash), attacker, aliceSignature, ...)
 * 3. bytes32(uint256(voucherHash)) == voucherHash, so ALICE's signature verifies!
 * 4. Attacker is approved to spend ALICE's tokens
 * 5. Attacker calls transferFrom to steal all tokens
 */

// ALICE's address as specified in the challenge
const ALICE_ADDRESS = "0xA11CE84AcB91Ac59B0A4E2945C9157eF3Ab17D4e";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n=== Deploying Elliptic Token (Level 35) ===\n");
  console.log(`Deployer (BOB/Owner): ${deployer}`);
  console.log(`ALICE: ${ALICE_ADDRESS}`);

  // Deploy EllipticToken
  console.log("\n1. Deploying EllipticToken...");
  const tokenDeployment = await deploy("EllipticToken", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   EllipticToken deployed at: ${tokenDeployment.address}`);

  const token = await ethers.getContractAt("EllipticToken", tokenDeployment.address);

  // For local testing, we need to simulate ALICE redeeming a voucher
  // In the real challenge, this would already be done
  console.log("\n2. Simulating ALICE's voucher redemption...");

  // Create voucher parameters
  const voucherAmount = ethers.parseEther("100"); // 100 ETK tokens
  const salt = ethers.keccak256(ethers.toUtf8Bytes("alice_voucher_salt_123"));

  // Compute voucher hash
  const voucherHash = ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "address", "bytes32"],
      [voucherAmount, ALICE_ADDRESS, salt]
    )
  );
  console.log(`   Voucher amount: ${ethers.formatEther(voucherAmount)} ETK`);
  console.log(`   Salt: ${salt}`);
  console.log(`   Voucher hash: ${voucherHash}`);

  // Get signer for BOB (owner)
  const [bobSigner] = await ethers.getSigners();

  // BOB signs the voucher hash
  const ownerSignature = await bobSigner.signMessage(ethers.getBytes(voucherHash));
  console.log(`   Owner (BOB) signature: ${ownerSignature.slice(0, 42)}...`);

  // For ALICE's signature, we need a way to simulate it
  // In a real scenario, ALICE would sign this herself
  // For testing, we'll use a hardcoded private key for ALICE or skip if not available
  console.log("\n   NOTE: For the real Ethernaut challenge:");
  console.log("   - ALICE has already redeemed tokens");
  console.log("   - You need to find ALICE's signature from the blockchain transaction");
  console.log("   - Use that signature in the attack");

  // Store voucher info for the attack script
  console.log("\n=== Voucher Info (save for attack) ===");
  console.log(`VOUCHER_AMOUNT=${voucherAmount.toString()}`);
  console.log(`VOUCHER_SALT=${salt}`);
  console.log(`VOUCHER_HASH=${voucherHash}`);
  console.log(`OWNER_SIGNATURE=${ownerSignature}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`EllipticToken: ${tokenDeployment.address}`);
  console.log(`Owner (BOB): ${deployer}`);
  console.log(`Target (ALICE): ${ALICE_ADDRESS}`);

  console.log("\n=== Vulnerability Explanation ===");
  console.log("The permit() function has a DOMAIN CONFUSION vulnerability:");
  console.log("1. It uses bytes32(amount) directly as the ECDSA message");
  console.log("2. ALICE's voucher signature signs: voucherHash = keccak256(amount, ALICE, salt)");
  console.log("3. If we call permit with amount = uint256(voucherHash):");
  console.log("   - bytes32(amount) == voucherHash");
  console.log("   - ALICE's voucher signature verifies as a permit signature!");
  console.log("4. This approves attacker to spend ALICE's tokens");

  console.log("\n=== Next Steps ===");
  console.log("1. Deploy attack contract:");
  console.log(`   npx hardhat deploy --tags EllipticTokenAttack --network ${hre.network.name}`);
  console.log("2. Run the attack:");
  console.log(`   npx hardhat run scripts/level-35-elliptic-token/attack.ts --network ${hre.network.name}`);

  // Verify on Etherscan if not local
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n=== Verifying on Etherscan ===");
    try {
      await hre.run("verify:verify", {
        address: tokenDeployment.address,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("Verification failed:", e);
    }
  }
};

export default func;
func.tags = ["EllipticToken", "Level35"];
