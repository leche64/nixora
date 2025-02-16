"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet } from "@phosphor-icons/react";
import { ConnectButton, useWallet } from "@suiet/wallet-kit";
import localFont from "next/font/local";
const PermanentMarker = localFont({
  src: "../app/fonts/PermanentMarker-Regular.ttf",
  variable: "--font-permanent-marker",
  weight: "400",
});

export function NavBar() {
  const wallet = useWallet();
  return (
    <>
      <nav className="fixed top-0 z-50 w-full h-fit">
        <div className="absolute inset-0 pointer-events-none"></div>
        <div className="container flex relative justify-between items-center px-4 py-4 mx-auto">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative size-12 md:size-18">
                <Image src="/nixora-logo.svg" alt="Nixora" fill className="object-contain w-full h-full" priority />
              </div>
              <h1 className={`text-4xl text-black md:text-5xl tracking-tighter font-bold`}>NIXORA</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {wallet.connected && (
              <div className="relative inline-block">
                <ConnectButton
                  className="!bg-transparent !px-2 sm:!px-3 !py-2 !rounded-lg 
                            !text-gray-700 hover:!bg-gray-50 !transition-all !duration-200 
                            !font-medium !flex !items-center !gap-2 !w-auto !min-w-fit"
                >
                  <Wallet className="size-8 md:size-10" weight="bold" />
                </ConnectButton>
              </div>
            )}
          </div>
        </div>
      </nav>
      <div className="h-24 md:h-28" />
    </>
  );
}
