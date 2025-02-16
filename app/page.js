"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ChatBox from "@/components/ChatBox";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import ChatBoxAtoma from "@/components/ChatBoxAtoma";
import { useWallet } from "@suiet/wallet-kit";
import NixoraToolsLogo from "@/components/NixoraToolsLogo";
import { ConnectButton } from "@suiet/wallet-kit";
import { Wallet } from "@phosphor-icons/react";

export default function Home() {
  const [isTyping, setIsTyping] = useState(false);
  const wallet = useWallet();
  const taglines = [
    "Research Crypto",
    "Send Crypto",
    "Compare Liquidity",
    "Private, Secure and Open Source",
    "Decentralized AI Compute",
  ];
  const [currentTagline, setCurrentTagline] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="container flex flex-col gap-6 sm:gap-4 text-black mx-auto min-h-[80vh] items-center justify-center px-4 sm:px-6">
      <AnimatePresence mode="wait">
        {wallet.connected ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-full"
          >
            <ChatBoxAtoma
              onTypingChange={(typing) => {
                setIsTyping(typing);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full"
          >
            <Card className="w-full mx-auto bg-transparent border-none shadow-none">
              <CardContent>
                <div className="w-full max-w-[280px] sm:max-w-[400px] mx-auto px-4">
                  <NixoraToolsLogo />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl md:text-3xl text-muted-foreground tracking-widest mt-4 sm:mt-2"
                >
                  Full-Stack DeFi AI Agent Starter Kit
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 sm:mt-3 text-md md:text-lg text-muted-foreground/80 tracking-wide max-w-sm mx-auto flex flex-col items-center gap-1 sm:gap-0"
                >
                  <span>Explore the future of</span>
                  <span className="font-medium">DeFi x AI x Sui</span>
                  <span>with Nixora</span>
                </motion.p>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={taglines[currentTagline]}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 100,
                        damping: 15,
                      },
                    }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      transition: {
                        duration: 0.3,
                      },
                    }}
                    className="mt-3 md:mt-4 text-xl md:text-2xl font-light text-primary/80 tracking-tighter max-w-sm mx-auto"
                  >
                    {taglines[currentTagline]}
                  </motion.div>
                </AnimatePresence>
                <div className="mt-3 md:mt-4 flex justify-center">
                  <ConnectButton
                    className="!bg-transparent !px-2 sm:!px-3 !py-2 !rounded-lg 
                        !text-gray-700 hover:!bg-gray-50 !transition-all !duration-200 
                        !font-medium !flex !items-center !gap-2 !w-auto !min-w-fit"
                  >
                    <Wallet className="size-8 md:size-10" weight="bold" />
                    <span className="hidden sm:inline text-sm md:text-base lg:text-lg font-vt323">Connect Wallet</span>
                  </ConnectButton>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
