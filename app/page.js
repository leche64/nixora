"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ChatBox from "@/components/ChatBox";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Home() {
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-14">
      <main className="container flex flex-col gap-4 text-center text-black">
        <ChatBox
          onTypingChange={(typing) => {
            console.log("Typing state:", typing); // Debug log
            setIsTyping(typing);
          }}
        />
      </main>
    </div>
  );
}
