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
    <div className="container flex flex-col items-center justify-center">
      <main className="container flex flex-col gap-4 text-black">
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
