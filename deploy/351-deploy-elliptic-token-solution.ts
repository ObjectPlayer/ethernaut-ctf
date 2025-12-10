import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deployment script for Elliptic Token Attack Solution
 *
 * This deploys the EllipticTokenAttack contract that exploits the
 * domain confusion vulnerability in the permit() function.
 *
 * EXPLOIT MECHANISM:
 * 1. ALICE signed voucherHash for redeemVoucher()
 * 2. permit() uses bytes32(amount) as the ECDSA message (not a hash!)
 * 3. We set amount = uint256(voucherHash), making bytes32(amount) == voucherHash
 * 4. ALICE's voucher signature verifies as a permit signature
 * 5. We get approved to spend ALICE's tokens and steal them
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n=== Deploying Elliptic Token Attack Solution ===\n");
  console.log(`Deployer: ${deployer}`);

  // Get EllipticToken address from environment or previous deployment
  let tokenAddress = process.env.ELLIPTIC_TOKEN_ADDRESS;

  if (!tokenAddress) {
    try {
      const tokenDeployment = await deployments.get("EllipticToken");
      tokenAddress = tokenDeployment.address;
      console.log(`Using EllipticToken from deployment: ${tokenAddress}`);
    } catch {
      console.log("\n⚠️  EllipticToken address not found!");
      console.log("Set ELLIPTIC_TOKEN_ADDRESS environment variable or deploy EllipticToken first.");
      console.log("Example: ELLIPTIC_TOKEN_ADDRESS=0x... npx hardhat deploy --tags EllipticTokenAttack\n");
      return;
    }
  } else {
    console.log(`Using EllipticToken from env: ${tokenAddress}`);
  }

  // Deploy attack contract
  console.log("\n1. Deploying EllipticTokenAttack...");
  const attack = await deploy("EllipticTokenAttack", {
    from: deployer,
    args: [tokenAddress],
    log: true,
    waitConfirmations: 1,
  });
  console.log(`   EllipticTokenAttack deployed at: ${attack.address}`);

  // Get contract info
  const token = await ethers.getContractAt("EllipticToken", tokenAddress);
  const owner = await token.owner();
  const ALICE = "0xA11CE84AcB91Ac59B0A4E2945C9157eF3Ab17D4e";
  const aliceBalance = await token.balanceOf(ALICE);

  console.log("\n=== Contract Info ===");
  console.log(`EllipticToken: ${tokenAddress}`);
  console.log(`Token Owner (BOB): ${owner}`);
  console.log(`Target (ALICE): ${ALICE}`);
  console.log(`ALICE's balance: ${ethers.formatEther(aliceBalance)} ETK`);
  console.log(`Attack Contract: ${attack.address}`);

  console.log("\n=== Attack Instructions ===");
  console.log("The attack exploits domain confusion in ECDSA signature verification:");
  console.log("");
  console.log("1. Find ALICE's voucher redemption transaction on the blockchain");
  console.log("2. Extract: amount, salt, and ALICE's receiverSignature");
  console.log("3. Compute voucherHash = keccak256(abi.encodePacked(amount, ALICE, salt))");
  console.log("4. Call permit(uint256(voucherHash), attacker, aliceSignature, attackerSignature)");
  console.log("   - bytes32(uint256(voucherHash)) == voucherHash");
  console.log("   - ALICE's signature verifies! (Domain confusion!)");
  console.log("5. Call transferFrom(ALICE, attacker, aliceBalance) to steal tokens");

  console.log("\n=== Run Attack ===");
  console.log(`npx hardhat run scripts/level-35-elliptic-token/attack.ts --network ${hre.network.name}`);
  console.log("\nOr with environment variables:");
  console.log(`ELLIPTIC_TOKEN_ADDRESS=${tokenAddress} npx hardhat run scripts/level-35-elliptic-token/attack.ts --network ${hre.network.name}`);

  // Verify on Etherscan if not local
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n=== Verifying on Etherscan ===");
    try {
      await hre.run("verify:verify", {
        address: attack.address,
        constructorArguments: [tokenAddress],
      });
    } catch (e) {
      console.log("Verification failed:", e);
    }
  }
};

export default func;
func.tags = ["EllipticTokenAttack", "Level35Solution"];
