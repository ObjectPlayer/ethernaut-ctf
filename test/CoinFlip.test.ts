import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("CoinFlip Challenge", function () {
  // Fixture to deploy the CoinFlip and GuessCoinFlip contracts
  async function deployCoinFlipFixture() {
    // Deploy the original CoinFlip contract
    const CoinFlip = await ethers.getContractFactory("CoinFlip");
    const coinFlip = await CoinFlip.deploy();

    // Deploy the GuessCoinFlip contract with the CoinFlip contract address
    const GuessCoinFlip = await ethers.getContractFactory("GuessCoinFlip");
    const guessCoinFlip = await GuessCoinFlip.deploy(await coinFlip.getAddress());

    // Get signers
    const [owner, otherAccount] = await ethers.getSigners();

    return { coinFlip, guessCoinFlip, owner, otherAccount };
  }

  describe("CoinFlip Contract", function () {
    it("Should initialize with zero consecutive wins", async function () {
      const { coinFlip } = await loadFixture(deployCoinFlipFixture);
      expect(await coinFlip.consecutiveWins()).to.equal(0);
    });

    it("Should allow manual flipping", async function () {
      const { coinFlip } = await loadFixture(deployCoinFlipFixture);
      
      // We can't predict the outcome of a manual flip, but we can check that it doesn't revert
      await expect(coinFlip.flip(true)).to.not.be.reverted;
    });

    it("Should revert if trying to flip with the same block hash", async function () {
      const { coinFlip } = await loadFixture(deployCoinFlipFixture);
      
      // First flip should succeed
      await coinFlip.flip(true);
      
      // Second flip with the same block hash should revert
      // In CoinFlip contract, it checks if lastHash == blockValue
      await expect(coinFlip.flip(false)).to.be.reverted;
    });
  });

  describe("GuessCoinFlip Contract", function () {
    it("Should initialize with the correct CoinFlip address", async function () {
      const { coinFlip, guessCoinFlip } = await loadFixture(deployCoinFlipFixture);
      
      expect(await guessCoinFlip.coinflipAddress()).to.equal(await coinFlip.getAddress());
    });

    it("Should successfully call the getCoinFlip method", async function () {
      const { guessCoinFlip } = await loadFixture(deployCoinFlipFixture);
      
      // The getCoinFlip method should execute without reverting
      await expect(guessCoinFlip.getCoinFlip()).to.not.be.reverted;
    });

    it("Should increase consecutive wins in the CoinFlip contract", async function () {
      const { coinFlip, guessCoinFlip } = await loadFixture(deployCoinFlipFixture);
      
      // Initial consecutive wins should be 0
      expect(await coinFlip.consecutiveWins()).to.equal(0);
      
      // Call getCoinFlip to make a correct guess
      await guessCoinFlip.getCoinFlip();
      
      // Consecutive wins should now be 1
      expect(await coinFlip.consecutiveWins()).to.equal(1);
    });
  });

  describe("Exploit Scenario", function () {
    it("Should be able to win multiple consecutive times", async function () {
      const { coinFlip, guessCoinFlip } = await loadFixture(deployCoinFlipFixture);
      
      // Initial consecutive wins should be 0
      expect(await coinFlip.consecutiveWins()).to.equal(0);
      
      // We'll simulate winning 3 times in a row
      // Note: In a real blockchain, we'd need to wait for new blocks
      // In the test environment, we can mine blocks manually
      
      // First win
      await guessCoinFlip.getCoinFlip();
      expect(await coinFlip.consecutiveWins()).to.equal(1);
      
      // Mine a new block to change the block hash
      await ethers.provider.send("evm_mine", []);
      
      // Second win
      await guessCoinFlip.getCoinFlip();
      expect(await coinFlip.consecutiveWins()).to.equal(2);
      
      // Mine another block
      await ethers.provider.send("evm_mine", []);
      
      // Third win
      await guessCoinFlip.getCoinFlip();
      expect(await coinFlip.consecutiveWins()).to.equal(3);
    });
  });
});
