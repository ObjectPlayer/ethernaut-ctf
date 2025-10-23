import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the PuzzleWallet contracts (Proxy + Implementation) for Ethernaut level 24
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployPuzzleWallet: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying PuzzleWallet contracts with account:", deployer);

  // Deploy the PuzzleWallet implementation contract
  const puzzleWalletImpl = await deploy("PuzzleWallet", {
    contract: "PuzzleWallet",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`PuzzleWallet implementation deployed at: ${puzzleWalletImpl.address}`);

  // Prepare initialization data
  const maxBalance = ethers.parseEther("0.1"); // 0.1 ETH max balance
  const initData = new ethers.Interface([
    "function init(uint256 _maxBalance)"
  ]).encodeFunctionData("init", [maxBalance]);

  // Deploy the PuzzleProxy
  const puzzleProxy = await deploy("PuzzleProxy", {
    contract: "PuzzleProxy",
    from: deployer,
    args: [
      deployer, // admin
      puzzleWalletImpl.address, // implementation
      initData // initialization data
    ],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`PuzzleProxy deployed at: ${puzzleProxy.address}`);

  // Get the contracts
  const proxy = await ethers.getContractAt("PuzzleProxy", puzzleProxy.address);
  const wallet = await ethers.getContractAt("PuzzleWallet", puzzleProxy.address);

  // Add deployer to whitelist
  console.log("\nAdding deployer to whitelist...");
  const whitelistTx = await wallet.addToWhitelist(deployer);
  await whitelistTx.wait();
  console.log("Deployer whitelisted");

  // Deposit some initial funds to the contract
  console.log("\nDepositing initial funds (0.001 ETH)...");
  const depositTx = await wallet.deposit({ value: ethers.parseEther("0.001") });
  await depositTx.wait();
  console.log("Initial funds deposited");

  // Log current state
  const admin = await proxy.admin();
  const pendingAdmin = await proxy.pendingAdmin();
  const owner = await wallet.owner();
  const maxBal = await wallet.maxBalance();
  const contractBalance = await ethers.provider.getBalance(puzzleProxy.address);
  const deployerBalance = await wallet.balances(deployer);

  console.log("\n=== Current State ===");
  console.log(`Proxy Admin: ${admin}`);
  console.log(`Pending Admin: ${pendingAdmin}`);
  console.log(`Wallet Owner: ${owner}`);
  console.log(`Max Balance: ${ethers.formatEther(maxBal)} ETH`);
  console.log(`Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`Deployer Internal Balance: ${ethers.formatEther(deployerBalance)} ETH`);

  // Verify the contracts on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying PuzzleWallet implementation on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: puzzleWalletImpl.address,
        constructorArguments: [],
      });
      console.log("PuzzleWallet implementation verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("PuzzleWallet implementation is already verified!");
      } else {
        console.error("PuzzleWallet implementation verification failed:", error);
      }
    }

    console.log("Verifying PuzzleProxy on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: puzzleProxy.address,
        constructorArguments: [
          deployer,
          puzzleWalletImpl.address,
          initData
        ],
      });
      console.log("PuzzleProxy verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("PuzzleProxy is already verified!");
      } else {
        console.error("PuzzleProxy verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployPuzzleWallet;

// Tags help to select which deploy script to run
deployPuzzleWallet.tags = ["level-24", "puzzle-wallet"];
