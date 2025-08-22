import { ethers } from "hardhat";

async function main() {

  const coinFlipInstance = "0xe1F16Da2782eFD9Ef9F6b5E15B4d161422D07719";

  const coinFLipGues = await ethers.deployContract("GuessCoinFlip", [coinFlipInstance]);

  await coinFLipGues.waitForDeployment();

  console.log(
    `coinFLipGues contract deployed to ${lock.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
