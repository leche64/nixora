"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperPlaneRight, Circle, Trash } from "@phosphor-icons/react";
import { cn, generateAvatar } from "@/lib/utils";
import remarkGfm from "remark-gfm";
import { quantum } from "ldrs";
import { useSuiTransfer } from "@/components/SuiTransactionHandler";
import TextareaAutosize from "react-textarea-autosize";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "react-tooltip";
import { Globe, HandCoins, Brain, Drop } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatBox({ onTypingChange }) {
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
        const response = await fetch("/api/ai-tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: "hello, what are you" }),
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
  }, []);

  useEffect(() => {
    quantum.register();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dummyAddress = "0x914bd0c5cee2e74843dd37eb45e8afe802bfe132f5227888906c703ed8b4b632";
      setUserAvatar(generateAvatar(dummyAddress));
    }
  }, []);

  const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setIsPending(true);
    setIsError(false);
    setInput("");
    setStreamingContent("");
    setStreamStartTime(Date.now());
    setIsAITyping(true); // Set when starting
    let tokenCount = 0;

    setMessages((prev) => [...prev, { content: trimmedInput, type: "user" }]);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedInput }),
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
          // Check if the response is a tool result
          console.log("FILTERCHECK:", text.includes("TRANSFER_REQUEST"));
          if (text.includes("TRANSFER_REQUEST")) {
            const toolCall = JSON.parse(text);
            if (toolCall.tool_calls?.[0]?.function?.arguments) {
              const args = JSON.parse(toolCall.tool_calls[0].function.arguments);

              // Debug log the original amount
              console.log("Original amount from AI:", args.amount);

              // Ensure amount is properly parsed as decimal
              let normalizedAmount =
                typeof args.amount === "string"
                  ? parseFloat(args.amount.replace(/[^0-9.]/g, ""))
                  : parseFloat(args.amount);

              // Debug log the normalized amount
              console.log("Normalized amount:", normalizedAmount);

              // Create new normalized tool call
              const normalizedText = JSON.stringify({
                ...toolCall,
                tool_calls: [
                  {
                    ...toolCall.tool_calls[0],
                    function: {
                      ...toolCall.tool_calls[0].function,
                      arguments: JSON.stringify({
                        ...args,
                        amount: normalizedAmount.toString(),
                      }),
                    },
                  },
                ],
              });

              // Debug log the final tool call
              console.log("Normalized tool call:", normalizedText);

              handleTransfer(normalizedText);
            } else {
              handleTransfer(text);
            }
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
      setIsAITyping(false); // Set to false on error
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
    <div className="flex flex-col pt-10 h-[700px] w-[90%] mx-auto">
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
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarImage src="/nixora-logo.svg" alt="Nixora" className="p-0.5" />
                  <AvatarFallback>NX</AvatarFallback>
                </Avatar>
              ) : (
                <div className="order-2 ml-2">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
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
                  <h2 className="text-xs font-semibold text-primary text-right">0x914b...b632</h2>
                )}
                <div
                  className={cn(
                    "flex max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                    message.type === "user"
                      ? "bg-[#d891a0] text-black rounded-2xl rounded-tr-none"
                      : "bg-[#26b6aa] text-black rounded-2xl rounded-tl-none",
                    "shadow-sm",
                    "break-words whitespace-pre-wrap overflow-hidden"
                  )}
                >
                  <div className="w-full prose prose-xs dark:prose-invert break-all">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="p-2 my-2 overflow-auto rounded-lg bg-black/10 dark:bg-white/10">
                            <pre {...props} className="whitespace-pre-wrap break-all" />
                          </div>
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="px-1 rounded-md bg-black/10 dark:bg-white/10 break-all hyphens-auto w-full"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 break-all"
                              {...props}
                            />
                          ),
                        p: ({ node, ...props }) => <p className="mb-4 last:mb-0 break-all" {...props} />,
                        ul: ({ node, ...props }) => <ul className="mb-4 pl-6 list-disc last:mb-0" {...props} />,
                        ol: ({ node, ...props }) => <ol className="mb-4 pl-8 list-decimal last:mb-0" {...props} />,
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
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src="/nixora-logo.svg" alt="Nixora" className="p-0.5" />
                <AvatarFallback>NX</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <h2 className="text-xs font-semibold text-primary">Nixora</h2>
                <div
                  className={cn(
                    "flex max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                    "bg-[#26b6aa] text-black rounded-2xl rounded-tl-none",
                    "shadow-sm",
                    "break-words whitespace-pre-wrap overflow-hidden"
                  )}
                >
                  <div className="w-full prose prose-xs dark:prose-invert break-all">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="p-2 my-2 overflow-auto rounded-lg bg-black/10 dark:bg-white/10">
                            <pre {...props} className="whitespace-pre-wrap break-words" />
                          </div>
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="px-1 rounded-md bg-black/10 dark:bg-white/10 break-words hyphens-auto w-full"
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
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src="/nixora-logo.svg" alt="Nixora" className="p-0.5" />
                <AvatarFallback>NX</AvatarFallback>
              </Avatar>
              <div className="max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 shadow-sm bg-[#26b6aa] rounded-2xl rounded-tl-none">
                <l-quantum size="17" speed="2.00" color="black"></l-quantum>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 p-2 sm:p-4 border border-primary/20 rounded-xl">
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

      <div className="flex gap-2 px-2 sm:px-4 py-2">
        <Badge variant="outline" className="gap-1 cursor-help" data-tooltip-id="search-tooltip">
          <Globe className="w-4 h-4" />
          Search
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

        <Badge variant="outline" className="gap-1 cursor-help" data-tooltip-id="sui-tooltip">
          <HandCoins className="w-4 h-4" />
          Send Sui
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

        <Badge variant="outline" className="gap-1 cursor-help" data-tooltip-id="liquidity-tooltip">
          <Drop className="w-4 h-4" />
          Liquidity
        </Badge>
        <Tooltip
          id="liquidity-tooltip"
          place="top"
          content={
            <div className="flex flex-col gap-1 z-50 max-w-[200px] whitespace-normal !text-wrap text-xs">
              <p>Find DeFi yield and rates across NAVI protocol.</p>
              <br />
              <p>Try asking: "find me the best yield on NAVI protocol"</p>
            </div>
          }
        />

        <Badge variant="outline" className="gap-1 cursor-help" data-tooltip-id="llm-tooltip">
          <Brain className="w-4 h-4" />
          LLM
        </Badge>
        <Tooltip
          id="llm-tooltip"
          place="top"
          content={
            <div className="flex flex-col gap-1 z-50 max-w-[300px] whitespace-normal !text-wrap text-xs">
              <p>
                Powered by open source models (Llama3.3, DeepSeek R1, FLUX.1) running on Atoma network, decentralized AI
                private cloud provider.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
