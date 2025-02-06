"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WalletProvider } from "@suiet/wallet-kit";
import { getSuiNetworkConfig } from "@/lib/utils";
import "@suiet/wallet-kit/style.css";

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({}));
  const { walletNetwork } = getSuiNetworkConfig();
  console.log("Wallet Network to from getSuiNetworkConfig:", walletNetwork);
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider defaultNetwork={walletNetwork}>{children}</WalletProvider>
    </QueryClientProvider>
  );
}
