"use client";

import { XLogo, Book, GithubLogo, Link, Cube, Drop, Circle } from "@phosphor-icons/react";
import { useSuiPrice } from "@/hooks/useSuiPrice";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@suiet/wallet-kit";

async function fetchSuiEpoch() {
  const response = await fetch("/api/sui-epoch");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

export default function FooterContent() {
  const { data: suiData } = useSuiPrice();
  const wallet = useWallet();

  const { data: epochData, isLoading: isEpochLoading } = useQuery({
    queryKey: ["suiEpoch"],
    queryFn: fetchSuiEpoch,
    refetchOnWindowFocus: true,
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  return (
    <div className="container mx-auto w-full px-2 md:px-4 h-full">
      <div className="flex items-center justify-between h-full">
        {/* Version */}
        <div className="flex items-center space-x-1 md:space-x-2 text-black">
          <span className="text-[9px] md:text-[12px] md:text-xs">NIXORA v.BETA</span>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="text-[10px] md:text-xs text-black flex items-center gap-1">
            <div className="flex items-center space-x-1 text-black">
              <Drop className="w-4 h-4 md:w-5 md:h-5" weight="fill" />
              <span>
                {suiData?.price
                  ? `$${suiData.price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : ""}
              </span>
            </div>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          {/* Block Number / Epoch */}
          <div className="flex items-center space-x-1 text-black">
            <Cube className="w-4 h-4 md:w-5 md:h-5" weight="light" />
            <span className="text-[10px] md:text-xs">{isEpochLoading ? "" : `Epoch ${epochData?.epoch}`}</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />
          {/* NETWORK */}
          <div className="flex items-center text-black">
            <Link className="hidden md:block w-5 h-5 mr-1" weight="light" />
            {wallet.connected ? (
              <>
                <Circle className="block md:hidden w-3 h-3 animate-pulse" weight="fill" color="#22c55e" />
                <span className="hidden md:block text-xs">{wallet.chain?.name.toUpperCase()}</span>
              </>
            ) : (
              <>
                <Circle className="block md:hidden w-3 h-3 animate-pulse" weight="fill" color="#ef4444" />
                <span className="hidden md:block text-xs">DISCONNECTED</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
