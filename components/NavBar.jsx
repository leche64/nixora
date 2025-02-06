"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet } from "@phosphor-icons/react";
import { ConnectButton } from "@suiet/wallet-kit";

export function NavBar() {
  return (
    <>
      <nav className="fixed top-0 z-50 w-full">
        <div className="absolute inset-0 pointer-events-none"></div>
        <div className="container flex relative justify-between items-center px-4 py-4 mx-auto">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative size-12 md:size-18">
                <Image src="/nixora-logo.svg" alt="Nixora" fill className="object-contain w-full h-full" priority />
              </div>
              <h1 className="text-3xl font-black text-black md:text-4xl tracking-wide">Nixora</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <ConnectButton />
          </div>
        </div>
      </nav>
      <div className="h-24 md:h-28" />
    </>
  );
}
