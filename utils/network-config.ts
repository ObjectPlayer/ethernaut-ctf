/**
 * Network configuration for contract verification
 * This file contains information about networks to determine if verification should be performed
 */

interface NetworkConfig {
  name: string;
  isLocalNetwork: boolean;
  verificationEnabled: boolean;
  blockExplorer?: string;
}

// Network configurations mapped by chainId
const networkConfigs: { [chainId: number]: NetworkConfig } = {
  1: {
    name: "mainnet",
    isLocalNetwork: false,
    verificationEnabled: true,
    blockExplorer: "https://etherscan.io"
  },
  11155111: {
    name: "sepolia",
    isLocalNetwork: false,
    verificationEnabled: true,
    blockExplorer: "https://sepolia.etherscan.io"
  },
  1337: {
    name: "hardhat",
    isLocalNetwork: true,
    verificationEnabled: false
  },
  31337: {
    name: "localhost",
    isLocalNetwork: true,
    verificationEnabled: false
  }
};

/**
 * Check if a network is a local development network
 * @param chainId The chain ID to check
 * @returns boolean indicating if the network is local
 */
export function isLocalNetwork(chainId: number): boolean {
  return networkConfigs[chainId]?.isLocalNetwork ?? true;
}

/**
 * Check if verification is enabled for a network
 * @param chainId The chain ID to check
 * @returns boolean indicating if verification is enabled
 */
export function isVerificationEnabled(chainId: number): boolean {
  return networkConfigs[chainId]?.verificationEnabled ?? false;
}

/**
 * Get network name by chain ID
 * @param chainId The chain ID
 * @returns The network name or "unknown" if not found
 */
export function getNetworkName(chainId: number): string {
  return networkConfigs[chainId]?.name ?? "unknown";
}

/**
 * Get block explorer URL for a network
 * @param chainId The chain ID
 * @returns The block explorer URL or undefined if not available
 */
export function getBlockExplorerUrl(chainId: number): string | undefined {
  return networkConfigs[chainId]?.blockExplorer;
}

export default networkConfigs;
