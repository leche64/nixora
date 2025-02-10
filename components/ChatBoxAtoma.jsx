"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperPlaneRight, Circle, Trash, CaretDown } from "@phosphor-icons/react";
import { cn, generateAvatar } from "@/lib/utils";
import remarkGfm from "remark-gfm";
import { quantum } from "ldrs";
import { useSuiTransfer } from "@/components/SuiTransactionHandler";
import TextareaAutosize from "react-textarea-autosize";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "react-tooltip";
import { Globe, HandCoins, Brain, Drop } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWallet, addressEllipsis } from "@suiet/wallet-kit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatBoxAtoma({ onTypingChange }) {
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [messageStats, setMessageStats] = useState({});
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [isAITyping, setIsAITyping] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const initialMessageSent = useRef(false);
  const { handleTransfer } = useSuiTransfer();
  const [userAvatar, setUserAvatar] = useState("");
  const wallet = useWallet();
  const [selectedModel, setSelectedModel] = useState("Llama-3.3-70b");

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isPending ? "auto" : "smooth",
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].type === "user") {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === "user" || (!isPending && !streamingContent)) {
        const container = messagesEndRef.current?.parentElement;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "auto",
          });
        }
      }
    }
  }, [messages, isPending, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && !isPending) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isPending]);

  useEffect(() => {
    onTypingChange(isAITyping);
  }, [isAITyping, onTypingChange]);

  useEffect(() => {
    const sendInitialMessage = async () => {
      if (initialMessageSent.current) return;
      initialMessageSent.current = true;

      setIsPending(true);
      setIsAITyping(true);
      setStreamStartTime(Date.now());
      let tokenCount = 0;

      try {
        const startTime = Date.now();
        const response = await fetch("/api/nixora", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "hello, what can you do",
            walletAddress: wallet.account?.address || null,
            model: selectedModel,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setIsAITyping(false);
            break;
          }

          const text = decoder.decode(value);
          try {
            // Filter out keepalive messages
            if (text.trim() === ": keepalive") {
              continue;
            }

            // Check if the response is a tool result
            if (text.includes('"type":"tool_result"')) {
              const toolResponse = JSON.parse(text);
              console.log("Transfer tool response:", toolResponse.data);
              // Handle the transfer response specifically
            } else {
              // Handle regular chat response
              console.log("Chat response:", text);
              accumulatedContent += text;
              tokenCount = Math.ceil(accumulatedContent.length / 4);
              setStreamingContent(accumulatedContent);
            }
          } catch (e) {
            // Regular text response
            console.log("Chat response:", text);
            accumulatedContent += text;
            tokenCount = Math.ceil(accumulatedContent.length / 4);
            setStreamingContent(accumulatedContent);
          }
        }

        const duration = (Date.now() - startTime) / 1000;
        const tokensPerSecond = duration > 0 ? (tokenCount / duration).toFixed(1) : "0.0";

        const stats = {
          tokens: tokenCount,
          duration: duration.toFixed(1),
          tokensPerSecond,
        };

        setMessages([
          {
            content: accumulatedContent,
            type: "ai",
            stats,
          },
        ]);

        setMessageStats(stats);
      } catch (error) {
        console.error("Error:", error);
        setIsError(true);
        setMessages([{ content: "Sorry, something went wrong. Please try again.", type: "ai" }]);
        setIsAITyping(false);
      } finally {
        setIsPending(false);
        setStreamingContent("");
      }
    };

    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        if (messages.length === 0) {
          sendInitialMessage();
        }
      } else {
        window.addEventListener("load", () => {
          if (messages.length === 0) {
            sendInitialMessage();
          }
        });
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("load", sendInitialMessage);
      }
    };
  }, [wallet.account?.address, selectedModel]);

  useEffect(() => {
    quantum.register();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && wallet.account?.address) {
      setUserAvatar(generateAvatar(wallet.account.address));
    }
  }, [wallet.account]);

  const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setIsPending(true);
    setIsError(false);
    setInput("");
    setStreamingContent("");
    setStreamStartTime(Date.now());
    setIsAITyping(true);
    let tokenCount = 0;

    setMessages((prev) => [...prev, { content: trimmedInput, type: "user" }]);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/nixora", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedInput,
          walletAddress: wallet.account?.address || null,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      console.log("Response:", response);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsAITyping(false);
          break;
        }

        const text = decoder.decode(value);
        console.log("Chunk:", text);
        try {
          // Filter out keepalive messages
          if (text.trim() === ": keepalive") {
            continue;
          }

          // Check if the text contains "TRANSFER_REQUEST"
          if (text.includes("TRANSFER_REQUEST")) {
            console.log("Transfer text received:", text);

            // Find the JSON object in the text
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}") + 1;
            const jsonStr = text.slice(jsonStart, jsonEnd);

            // Parse and handle the transfer request
            const transferRequest = JSON.parse(jsonStr);
            console.log("Parsed transfer request:", transferRequest);

            // Trigger the wallet interaction
            const result = await handleTransfer(transferRequest);
            console.log("Transfer result:", result);

            // Add the transfer message to chat (everything after the JSON)
            const messageText = text.slice(jsonEnd).trim();
            if (messageText) {
              accumulatedContent += messageText;
              setStreamingContent(accumulatedContent);
            }
            continue;
          }

          // Handle regular chat response
          console.log("Chat response:", text);
          accumulatedContent += text;
          tokenCount = Math.ceil(accumulatedContent.length / 4);
          setStreamingContent(accumulatedContent);
        } catch (e) {
          console.error("Error processing message:", e);
          // Filter out keepalive messages even in catch block
          if (text.trim() !== ": keepalive") {
            accumulatedContent += text;
            tokenCount = Math.ceil(accumulatedContent.length / 4);
            setStreamingContent(accumulatedContent);
          }
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      const tokensPerSecond = duration > 0 ? (tokenCount / duration).toFixed(1) : "0.0";

      const stats = {
        tokens: tokenCount,
        duration: duration.toFixed(1),
        tokensPerSecond,
      };

      setMessages((prev) => [
        ...prev,
        {
          content: accumulatedContent,
          type: "ai",
          stats,
        },
      ]);

      setMessageStats(stats);
    } catch (error) {
      console.error("Error:", error);
      setIsError(true);
      setMessages((prev) => [...prev, { content: "Sorry, something went wrong. Please try again.", type: "ai" }]);
      setIsAITyping(false);
    } finally {
      setIsPending(false);
      setStreamingContent("");
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput("");
    setStreamingContent("");
    setMessageStats({});
    setIsError(false);
    setIsPending(false);
  };

  const handleScroll = (e) => {
    const container = e.target;
    const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 200;
    setUserHasScrolled(isScrolledUp);
  };

  return (
    <div className="flex flex-col h-[85dvh] w-[90%] mx-auto">
      <div
        className="relative flex-1 p-2 sm:p-4 space-y-4 sm:space-y-6 
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent
          hover:scrollbar-thumb-primary/40"
        onScroll={handleScroll}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn("flex w-full flex-col", message.type === "user" ? "items-end" : "items-start")}
          >
            <div className="flex items-start gap-2">
              {message.type === "ai" ? (
                <Avatar className="size-12 border-none">
                  <AvatarImage src="/nixora-logo.svg" alt="Nixora" className="p-0.5" />
                  <AvatarFallback>NX</AvatarFallback>
                </Avatar>
              ) : (
                <div className="order-2 ml-2">
                  <Avatar className="size-8 border-none">
                    <AvatarImage src={userAvatar} alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {message.type === "ai" ? (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold text-primary">Nixora</h2>
                    {message.stats && (
                      <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground/90 space-x-1 sm:space-x-2 font-semibold">
                        <span className="px-0.5 py-0.5 rounded-md bg-muted/30">{message.stats.tokens} tokens</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="px-0.5 py-0.5 rounded-md bg-muted/30">{message.stats.duration}s</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="px-0.5 py-0.5 rounded-md bg-muted/30">
                          {message.stats.tokensPerSecond} tokens/s
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <h2 className="text-xs font-semibold text-primary text-right">
                    {wallet.account?.address ? addressEllipsis(wallet.account.address) : "0x914b...69420"}
                  </h2>
                )}
                <div
                  className={cn(
                    "flex max-w-[95%] sm:max-w-[85%] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                    message.type === "user"
                      ? "bg-[#d891a0] text-black rounded-2xl rounded-tr-none ml-auto"
                      : "bg-[#26b6aa] text-black rounded-2xl rounded-tl-none",
                    "shadow-sm",
                    "break-words whitespace-pre-wrap overflow-hidden"
                  )}
                >
                  <div className="w-full prose prose-xs dark:prose-invert [overflow-wrap:anywhere]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="p-2 my-2 overflow-auto rounded-lg bg-black/10 dark:bg-white/10">
                            <pre {...props} className="whitespace-pre-wrap" />
                          </div>
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="px-1 rounded-md bg-black/10 dark:bg-white/10 [overflow-wrap:anywhere]"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20"
                              {...props}
                            />
                          ),
                        p: ({ node, ...props }) => <p className="mb-4 last:mb-0 [overflow-wrap:anywhere]" {...props} />,
                        ul: ({ node, ...props }) => <ul className="mb-4 pl-6 list-disc last:mb-0" {...props} />,
                        ol: ({ node, ...props }) => <ol className="mb-4 pl-8 list-decimal last:mb-0" {...props} />,
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-medium text-primary underline decoration-primary/30 
                              decoration-2 underline-offset-2 transition-colors hover:text-primary/80 hover:decoration-primary/60"
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <Avatar className="size-12 border-none">
                <AvatarImage src="/nixora-logo.svg" alt="Nixora" className="p-0.5" />
                <AvatarFallback>NX</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <h2 className="text-xs font-semibold text-primary">Nixora</h2>
                <div
                  className={cn(
                    "flex max-w-[95%] sm:max-w-[85%] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                    "bg-[#26b6aa] text-black rounded-2xl rounded-tl-none",
                    "shadow-sm",
                    "break-words whitespace-pre-wrap overflow-hidden"
                  )}
                >
                  <div className="w-full prose prose-xs dark:prose-invert [overflow-wrap:anywhere]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="p-2 my-2 overflow-auto rounded-lg bg-black/10 dark:bg-white/10">
                            <pre {...props} className="whitespace-pre-wrap" />
                          </div>
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="px-1 rounded-md bg-black/10 dark:bg-white/10 [overflow-wrap:anywhere]"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20"
                              {...props}
                            />
                          ),
                        p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="mb-4 pl-6 list-disc last:mb-0" {...props} />,
                        ol: ({ node, ...props }) => <ol className="mb-4 pl-8 list-decimal last:mb-0" {...props} />,
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-medium text-primary underline decoration-primary/30 
                              decoration-2 underline-offset-2 transition-colors hover:text-primary/80 hover:decoration-primary/60"
                          />
                        ),
                      }}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isPending && !streamingContent && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <Avatar className="h-10 w-10 border-none">
                <AvatarImage src="/nixora-logo.svg" alt="Nixora" className="p-0.5" />
                <AvatarFallback>NX</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <h2 className="text-xs font-semibold text-primary">Nixora</h2>
                <div className="max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 shadow-sm bg-[#26b6aa] rounded-2xl rounded-tl-none">
                  <div className="flex items-center gap-2">
                    <l-quantum size="17" speed="2.00" color="black"></l-quantum>
                    <span className="w-2"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col gap-2 p-2 sm:p-4 border border-primary/20 rounded-xl">
        <div className="flex gap-2">
          <TextareaAutosize
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Chat with Nixora ◢◣◤◥◸◹◺◿"
            className="flex w-full rounded-md border-2 border-primary/20 bg-background px-3 py-2 text-sm 
              ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none 
              focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[200px]
              resize-none"
            disabled={isPending}
            minRows={1}
            maxRows={6}
          />
          <Button
            onClick={handleClearChat}
            size="icon"
            className="border-2 border-primary/20 bg-background hover:bg-muted/50"
            disabled={messages.length === 0 && !input.trim()}
          >
            <Trash className="w-5 h-5 text-primary" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isPending}
            size="icon"
            className="border-2 border-primary/20 bg-background hover:bg-muted/50"
          >
            {isError ? (
              <Circle className="w-5 h-5 text-destructive" />
            ) : (
              <PaperPlaneRight className="w-5 h-5 text-primary" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Badge variant="outline" className="gap-1 cursor-help text-xs sm:text-sm" data-tooltip-id="search-tooltip">
            <Globe className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Search</span>
          </Badge>
          <Tooltip
            id="search-tooltip"
            place="top"
            content={
              <div className="flex flex-col gap-1 z-50 max-w-[200px] whitespace-normal !text-wrap text-xs">
                <p>Search the internet for any topic in real time.</p>
                <br />
                <p>Try asking: "search for luka doncic trade"</p>
              </div>
            }
          />

          <Badge variant="outline" className="gap-1 cursor-help text-xs sm:text-sm" data-tooltip-id="sui-tooltip">
            <HandCoins className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Send Sui</span>
          </Badge>
          <Tooltip
            id="sui-tooltip"
            place="top"
            content={
              <div className="flex flex-col gap-1 z-50 max-w-[300px] whitespace-normal !text-wrap text-xs">
                <p>Send Sui tokens to any address directly through chat.</p>
                <br />
                <p>Try asking: "send 0.69 sui to</p>
                <code className="break-all bg-black/10 px-1.5 py-0.5 rounded-md">
                  0x914bd0c5cee2e74843dd37eb45e8afe802bfe132f5227888906c703ed8b4b632"
                </code>
              </div>
            }
          />

          <Badge variant="outline" className="gap-1 cursor-help text-xs sm:text-sm" data-tooltip-id="liquidity-tooltip">
            <Drop className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Liquidity</span>
          </Badge>
          <Tooltip
            id="liquidity-tooltip"
            place="top"
            content={
              <div className="flex flex-col gap-1 z-50 max-w-[200px] whitespace-normal !text-wrap text-xs">
                <p>Find DeFi yield and rates across NAVI protocol.</p>
                <br />
                <p>Try asking: "find defi yield"</p>
              </div>
            }
          />

          <Badge variant="outline" className="gap-1 cursor-help text-xs sm:text-sm" data-tooltip-id="llm-tooltip">
            <Brain className="size-5 sm:size-4" />
            <span className="hidden sm:inline">LLM</span>
          </Badge>
          <Tooltip
            id="llm-tooltip"
            place="top"
            content={
              <div className="flex flex-col gap-1 z-50 max-w-[300px] whitespace-normal !text-wrap text-xs">
                <p>
                  Powered by open source models (Llama3.3, DeepSeek R1, FLUX.1) running on Atoma network, decentralized
                  AI private cloud provider.
                </p>
              </div>
            }
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-2 h-8 hover:bg-muted/50 hover:text-foreground text-xs"
                aria-label="Select Model"
              >
                <span className="text-muted-foreground">{selectedModel}</span>
                <CaretDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuItem
                onClick={() => setSelectedModel("Llama-3.3-70b")}
                className="flex items-center justify-between"
              >
                Llama-3.3-70b
                <span className="text-xs text-muted-foreground">(Default)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedModel("DeepSeek-R1")}>DeepSeek-R1</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
