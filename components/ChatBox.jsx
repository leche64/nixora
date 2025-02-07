"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperPlaneRight, Circle, ArrowClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import remarkGfm from "remark-gfm";
import { quantum } from "ldrs";

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
    // Debug log
    console.log("AI Typing state changed:", isAITyping);
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
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setIsAITyping(false);
            break;
          }

          const chunk = new TextDecoder().decode(value);
          accumulatedContent += chunk;
          tokenCount = Math.ceil(accumulatedContent.length / 4);
          setStreamingContent(accumulatedContent);
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

      const reader = response.body.getReader();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsAITyping(false); // Set to false when stream ends
          break;
        }

        const chunk = new TextDecoder().decode(value);
        accumulatedContent += chunk;
        tokenCount = Math.ceil(accumulatedContent.length / 4);
        setStreamingContent(accumulatedContent);
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
    <div className="flex flex-col h-[600px] sm:h-[500px] md:h-[600px] w-[90%] mx-auto">
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
            <div
              className={cn(
                "flex max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                message.type === "user"
                  ? "bg-[#d891a0] text-black rounded-2xl rounded-br-none"
                  : "bg-[#26b6aa] text-black rounded-2xl rounded-bl-none",
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
            {message.type === "ai" && message.stats && (
              <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground/90 mt-2 space-x-1 sm:space-x-2 font-semibold">
                <span className="px-0.5 py-0.5 rounded-md bg-muted/30">{message.stats.tokens} tokens</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="px-0.5 py-0.5 rounded-md bg-muted/30">{message.stats.duration}s</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="px-0.5 py-0.5 rounded-md bg-muted/30">{message.stats.tokensPerSecond} tokens/s</span>
              </div>
            )}
          </div>
        ))}
        {streamingContent && (
          <div className="flex justify-start">
            <div
              className={cn(
                "flex max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                "bg-[#26b6aa] text-black rounded-2xl rounded-bl-none",
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
        )}
        {isPending && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-transparent max-w-[80%] rounded-2xl px-4 py-3 shadow-sm rounded-bl-none">
              <l-quantum size="20" speed="2.00" color="#26b6aa"></l-quantum>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 p-2 sm:p-4 border-t-2 border-primary/20">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type command..."
          className="border-2 border-primary/20 focus-visible:ring-0"
          disabled={isPending}
        />
        <Button
          onClick={handleClearChat}
          size="icon"
          className="border-2 border-primary/20 bg-background hover:bg-muted/50"
          disabled={messages.length === 0 && !input.trim()}
        >
          <ArrowClockwise className="w-5 h-5 text-primary" />
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
    </div>
  );
}
