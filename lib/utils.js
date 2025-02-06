import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Network configuration
export const NETWORK_URLS = {
  DEVNET: "https://fullnode.devnet.sui.io",
  TESTNET: "https://fullnode.testnet.sui.io",
  MAINNET: "https://fullnode.mainnet.sui.io",
};

export const WALLET_NETWORKS = {
  DEVNET: "sui:devnet",
  TESTNET: "sui:testnet",
  MAINNET: "sui:mainnet",
};

export function getSuiNetworkConfig() {
  const network = process.env.SUI_NETWORK?.toUpperCase() || "DEVNET";
  console.log("ENV:", process.env.SUI_NETWORK?.toUpperCase());
  console.log("SUI Network:", network);
  return {
    network,
    rpcUrl: NETWORK_URLS[network],
    walletNetwork: WALLET_NETWORKS[network],
  };
}

// Function to generate a unique 16x16 avatar based on the user's address
export function generateAvatar(address) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Use the address to seed the random number generator
  let seed = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate random pixels
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      const r = Math.floor(random() * 256);
      const g = Math.floor(random() * 256);
      const b = Math.floor(random() * 256);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i, j, 1, 1);
    }
  }

  return canvas.toDataURL();
}
