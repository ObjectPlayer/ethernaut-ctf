import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the DoubleEntryPoint challenge contracts for Ethernaut level 26
 * This includes: Forta, CryptoVault, LegacyToken, and DoubleEntryPoint
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployDoubleEntryPoint: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying DoubleEntryPoint contracts with account:", deployer);

  // Step 1: Deploy Forta contract
  const forta = await deploy("Forta", {
    contract: "Forta",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`Forta deployed at: ${forta.address}`);

  // Step 2: Deploy CryptoVault contract
  const cryptoVault = await deploy("CryptoVault", {
    contract: "CryptoVault",
    from: deployer,
    args: [deployer], // sweptTokensRecipient
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`CryptoVault deployed at: ${cryptoVault.address}`);

  // Step 3: Deploy LegacyToken contract
  const legacyToken = await deploy("LegacyToken", {
    contract: "LegacyToken",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`LegacyToken deployed at: ${legacyToken.address}`);

  // Step 4: Deploy DoubleEntryPoint contract
  const doubleEntryPoint = await deploy("DoubleEntryPoint", {
    contract: "DoubleEntryPoint",
    from: deployer,
    args: [legacyToken.address, cryptoVault.address, forta.address, deployer], // legacyToken, vault, forta, player
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`DoubleEntryPoint deployed at: ${doubleEntryPoint.address}`);

  // Step 5: Setup the contracts
  console.log("\n=== Setting up contracts ===");

  // Get contract instances
  const legacyTokenContract = await ethers.getContractAt("LegacyToken", legacyToken.address);
  const cryptoVaultContract = await ethers.getContractAt("CryptoVault", cryptoVault.address);
  const doubleEntryPointContract = await ethers.getContractAt("DoubleEntryPoint", doubleEntryPoint.address);

  // Set LegacyToken to delegate to DoubleEntryPoint
  console.log("Setting LegacyToken to delegate to DoubleEntryPoint...");
  const delegateTx = await legacyTokenContract.delegateToNewContract(doubleEntryPoint.address);
  await delegateTx.wait();
  console.log("  ✓ LegacyToken now delegates to DoubleEntryPoint");

  // Mint 100 LGT to CryptoVault
  console.log("Minting 100 LGT to CryptoVault...");
  const mintTx = await legacyTokenContract.mint(cryptoVault.address, ethers.parseEther("100"));
  await mintTx.wait();
  console.log("  ✓ Minted 100 LGT to CryptoVault");

  // Set underlying token in CryptoVault
  console.log("Setting underlying token in CryptoVault...");
  const setUnderlyingTx = await cryptoVaultContract.setUnderlying(doubleEntryPoint.address);
  await setUnderlyingTx.wait();
  console.log("  ✓ Underlying token set to DoubleEntryPoint");

  // Log current state
  console.log("\n=== Current State ===");
  
  const vaultDETBalance = await doubleEntryPointContract.balanceOf(cryptoVault.address);
  const vaultLGTBalance = await legacyTokenContract.balanceOf(cryptoVault.address);
  const underlying = await cryptoVaultContract.underlying();
  const legacyDelegate = await legacyTokenContract.delegate();
  
  console.log(`CryptoVault:`);
  console.log(`  Address: ${cryptoVault.address}`);
  console.log(`  DET Balance: ${ethers.formatEther(vaultDETBalance)} DET`);
  console.log(`  LGT Balance: ${ethers.formatEther(vaultLGTBalance)} LGT`);
  console.log(`  Underlying Token: ${underlying}`);
  
  console.log(`\nLegacyToken:`);
  console.log(`  Address: ${legacyToken.address}`);
  console.log(`  Delegates to: ${legacyDelegate}`);
  
  console.log(`\nDoubleEntryPoint:`);
  console.log(`  Address: ${doubleEntryPoint.address}`);
  console.log(`  CryptoVault: ${await doubleEntryPointContract.cryptoVault()}`);
  console.log(`  DelegatedFrom: ${await doubleEntryPointContract.delegatedFrom()}`);
  console.log(`  Player: ${await doubleEntryPointContract.player()}`);
  
  console.log(`\nForta:`);
  console.log(`  Address: ${forta.address}`);

  console.log("\n⚠️  VULNERABILITY:");
  console.log("  Calling cryptoVault.sweepToken(legacyToken) will:");
  console.log("  1. Pass the check (legacyToken != underlying)");
  console.log("  2. Call legacyToken.transfer()");
  console.log("  3. Which delegates to doubleEntryPoint.delegateTransfer()");
  console.log("  4. Draining DET from the vault!");
  console.log("\n💡 SOLUTION:");
  console.log("  Create a detection bot to monitor delegateTransfer calls");
  console.log("  and raise an alert when origSender is the CryptoVault");

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    const contractsToVerify = [
      { name: "Forta", address: forta.address, args: [] },
      { name: "CryptoVault", address: cryptoVault.address, args: [deployer] },
      { name: "LegacyToken", address: legacyToken.address, args: [] },
      { name: "DoubleEntryPoint", address: doubleEntryPoint.address, args: [legacyToken.address, cryptoVault.address, forta.address, deployer] },
    ];

    for (const contract of contractsToVerify) {
      console.log(`Verifying ${contract.name} on Etherscan...`);
      try {
        await hre.run("verify:verify", {
          address: contract.address,
          constructorArguments: contract.args,
        });
        console.log(`${contract.name} verification successful!`);
      } catch (error: any) {
        if (error.message.includes("Already Verified")) {
          console.log(`${contract.name} is already verified!`);
        } else {
          console.error(`${contract.name} verification failed:`, error);
        }
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployDoubleEntryPoint;

// Tags help to select which deploy script to run
deployDoubleEntryPoint.tags = ["level-26", "double-entry-point"];
