import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */

const RPC_ENDPOINT_SEPOLIA_NETWORK = process.env.RPC_URL_SEPOLIA_NETWORK;
const PRIVATE_KEY_ACCOUNT_SEPOLIA = process.env.PRIVATE_KEY_SEPOLIA_NETWORK || "0x0000000000000000000000000000000000000000";
const API_KEY_ETHERSCAN = process.env.ETHERSCAN_API_KEY;
const API_KEY_COINMARKET_CAP = process.env.COIN_MARKET_CAP_API_KEY;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
      },
      {
        version: "0.8.12",
      },
      {
        version: "0.6.1",
      },
      {
        version: "0.6.12",
      }

    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
      saveDeployments: true,
    },
    hardatLocal: {
      url: "http://127.0.0.1:8545/",
      chainId: 1337,      
    },
    sepolia: {
      url: RPC_ENDPOINT_SEPOLIA_NETWORK,
      accounts: [PRIVATE_KEY_ACCOUNT_SEPOLIA],
      saveDeployments: true,
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: API_KEY_ETHERSCAN,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
