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
    "Private, Secure and Open source",
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
    <main className="container flex flex-col gap-4 text-black mx-auto min-h-[80vh] items-center justify-center">
      <AnimatePresence mode="wait">
        {wallet.connected ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
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
            className="text-center"
          >
            <Card className="min-w-lg mx-auto bg-transparent border-none shadow-none">
              <CardContent>
                <div className="w-full max-w-[280px] sm:max-w-[400px] mx-auto">
                  <NixoraToolsLogo />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl text-muted-foreground tracking-widest"
                >
                  DeFi AI Agent
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 text-lg text-muted-foreground/80 tracking-wide max-w-md mx-auto"
                >
                  Explore the future of DeFi and Sui with Nixora
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
                    className="mt-6 text-xl font-light text-primary/80 tracking-tighter max-w-sm mx-auto"
                  >
                    {taglines[currentTagline]}
                  </motion.div>
                </AnimatePresence>
                <div className="mt-6 flex justify-center">
                  <ConnectButton
                    className="!bg-transparent !px-2 sm:!px-3 !py-2 !rounded-lg 
                        !text-gray-700 hover:!bg-gray-50 !transition-all !duration-200 
                        !font-medium !flex !items-center !gap-2 !w-auto !min-w-fit"
                  >
                    <Wallet className="size-8 md:size-10" weight="bold" />
                    <span className="hidden sm:inline text-base md:text-lg font-vt323">Connect Wallet</span>
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
