"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ChatBox from "@/components/ChatBox";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import ChatBoxAtoma from "@/components/ChatBoxAtoma";
export default function Home() {
  const [isTyping, setIsTyping] = useState(false);

  return (
    <main className="container flex flex-col gap-4 text-black">
      {/* <ChatBox
        onTypingChange={(typing) => {
          setIsTyping(typing);
        }}
      /> */}
      <ChatBoxAtoma
        onTypingChange={(typing) => {
          setIsTyping(typing);
        }}
      />
    </main>
  );
}
