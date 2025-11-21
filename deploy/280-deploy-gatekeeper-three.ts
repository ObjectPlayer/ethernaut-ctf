import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isLocalNetwork } from "../utils/network-config";

/**
 * Deploys the GatekeeperThree challenge contract for Ethernaut level 28
 *
 * @param hre HardhatRuntimeEnvironment object
 */
const deployGatekeeperThree: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId || 31337;

  console.log("Deploying GatekeeperThree contract with account:", deployer);

  // Deploy GatekeeperThree contract
  const gatekeeperThree = await deploy("GatekeeperThree", {
    contract: "GatekeeperThree",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: !isLocalNetwork(chainId) ? 5 : 0,
  });

  console.log(`GatekeeperThree deployed at: ${gatekeeperThree.address}`);

  // Get contract instance to read state
  const gatekeeperThreeContract = await ethers.getContractAt("GatekeeperThree", gatekeeperThree.address);
  
  const owner = await gatekeeperThreeContract.owner();
  const entrant = await gatekeeperThreeContract.entrant();
  const allowEntrance = await gatekeeperThreeContract.allowEntrance();

  console.log("\n=== Deployed Contract ===");
  console.log(`GatekeeperThree: ${gatekeeperThree.address}`);
  console.log(`Owner: ${owner}`);
  console.log(`Entrant: ${entrant}`);
  console.log(`Allow Entrance: ${allowEntrance}`);

  console.log("\n⚠️  VULNERABILITIES:");
  console.log("  1. CONSTRUCTOR TYPO: construct0r() instead of constructor()");
  console.log("     - This is a public function, not a constructor!");
  console.log("     - Anyone can call it to become owner");
  
  console.log("\n  2. GATE ONE: Owner Check + Origin Check");
  console.log("     - Requires: msg.sender == owner");
  console.log("     - Requires: tx.origin != owner");
  console.log("     - Solution: Become owner, call from contract");
  
  console.log("\n  3. GATE TWO: AllowEntrance Flag");
  console.log("     - Requires: allowEntrance == true");
  console.log("     - Set by calling getAllowance() with correct password");
  console.log("     - Password is in SimpleTrick storage slot 2");
  
  console.log("\n  4. GATE THREE: ETH Balance + Send Failure");
  console.log("     - Requires: balance > 0.001 ether");
  console.log("     - Requires: owner.send(0.001 ether) == false");
  console.log("     - Solution: Owner must be contract that reverts on receive");
  
  console.log("\n💡 SOLUTION:");
  console.log("  1. Call construct0r() to become owner");
  console.log("  2. Call createTrick() to deploy SimpleTrick");
  console.log("  3. Read password from SimpleTrick storage");
  console.log("  4. Call getAllowance(password) to pass gate two");
  console.log("  5. Send > 0.001 ETH to contract");
  console.log("  6. Call enter() from attack contract that reverts on receive");

  // Verify the contract on non-local networks
  if (!isLocalNetwork(chainId) && process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for blockchain indexers to catch up...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay
    
    console.log("Verifying GatekeeperThree on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: gatekeeperThree.address,
        constructorArguments: [],
      });
      console.log("GatekeeperThree verification successful!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("GatekeeperThree is already verified!");
      } else {
        console.error("GatekeeperThree verification failed:", error);
      }
    }
  }

  console.log("----------------------------------------------------");
};

export default deployGatekeeperThree;

// Tags help to select which deploy script to run
deployGatekeeperThree.tags = ["level-28", "gatekeeper-three"];
