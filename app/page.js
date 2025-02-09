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

export default function Home() {
  const [isTyping, setIsTyping] = useState(false);
  const wallet = useWallet();
  const taglines = ["Research Crypto", "Send Crypto", "Be Crypto"];
  const [currentTagline, setCurrentTagline] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 3000);

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
                <div className="sm:scale-100 scale-75">
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
                  className="mt-3 text-lg text-muted-foreground/80 tracking-wide"
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
                    className="mt-6 text-xl font-light text-primary/80 tracking-tighter"
                  >
                    {taglines[currentTagline]}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
