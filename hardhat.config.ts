import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */

const RPC_ENDPOINT_SEPOLIA_NETWORK = process.env.RPC_URL_SEPOLIA_NETWORK;
const PRIVATE_KEY_ACCOUNT_SEPOLIA = process.env.PRIVATE_KEY_SEPOLIA_NETWORK || "0x0000000000000000000000000000000000000000";
const API_KEY_ETHERSCAN = process.env.ETHERSCAN_API_KEY;
const API_KEY_COINMARKET_CAP = process.env.COIN_MARKET_CAP_API_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    sepolia: {
      url: RPC_ENDPOINT_SEPOLIA_NETWORK,
      accounts: [PRIVATE_KEY_ACCOUNT_SEPOLIA],
    },
  },
  etherscan: {
    apiKey: API_KEY_ETHERSCAN,
  },
};

export default config;
