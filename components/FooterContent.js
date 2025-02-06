"use client";

import { XLogo, Book, GithubLogo, Link, Cube, Drop } from "@phosphor-icons/react";
import { useSuiPrice } from "@/hooks/useSuiPrice";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@suiet/wallet-kit";

async function fetchBaseBlock() {
  const response = await fetch("/api/base-block");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

async function fetchGasPrice() {
  const response = await fetch("/api/base-gwei");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

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
  const { data: blockData, isLoading: isBlockLoading } = useQuery({
    queryKey: ["baseBlock"],
    queryFn: fetchBaseBlock,
    refetchOnWindowFocus: true,
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  const { data: gasData, isLoading: isGasLoading } = useQuery({
    queryKey: ["baseGas"],
    queryFn: fetchGasPrice,
    refetchOnWindowFocus: true,
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  const { data: epochData, isLoading: isEpochLoading } = useQuery({
    queryKey: ["suiEpoch"],
    queryFn: fetchSuiEpoch,
    refetchOnWindowFocus: true,
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  const blockNumber = blockData?.data?.number;

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
            <Link className="w-4 h-4  md:w-5 md:h-5 mr-1" weight="light" />
            <span className="text-[10px] md:text-xs">
              {wallet.connected ? wallet.chain?.name.toUpperCase() : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
