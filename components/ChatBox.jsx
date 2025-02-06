"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Terminal, PaperPlaneRight, Circle, Spinner, ArrowClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import remarkGfm from "remark-gfm";

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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (streamingContent) {
      scrollToBottom();
    }
  }, [streamingContent]);

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

  return (
    <div className="flex flex-col h-[600px] sm:h-[500px] md:h-[600px] w-[90%] mx-auto">
      <div className="flex-1 p-2 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto scroll-smooth">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn("flex w-full flex-col", message.type === "user" ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "flex max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                message.type === "user"
                  ? "bg-primary text-primary-foreground text-right"
                  : "bg-blue-950/80 text-white dark:bg-black dark:text-black text-left",
                "shadow-sm"
              )}
            >
              <div className="w-full prose prose-xs dark:prose-invert">
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
                    ul: ({ node, ...props }) => <ul className="mb-4 pl-4 list-disc last:mb-0" {...props} />,
                    ol: ({ node, ...props }) => <ol className="mb-4 pl-4 list-decimal last:mb-0" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
            {message.type === "ai" && message.stats && (
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 space-x-1 sm:space-x-2">
                <span>{message.stats.tokens} tokens</span>
                <span>•</span>
                <span>{message.stats.duration}s</span>
                <span>•</span>
                <span>{message.stats.tokensPerSecond} tokens/s</span>
              </div>
            )}
          </div>
        ))}
        {streamingContent && (
          <div className="flex justify-start">
            <div
              className={cn(
                "flex max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base",
                "bg-blue-950/80 text-white dark:bg-black dark:text-black text-left",
                "shadow-sm"
              )}
            >
              <div className="w-full prose prose-xs dark:prose-invert">
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
                    ul: ({ node, ...props }) => <ul className="mb-4 pl-4 list-disc last:mb-0" {...props} />,
                    ol: ({ node, ...props }) => <ol className="mb-4 pl-4 list-decimal last:mb-0" {...props} />,
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
            <div className="bg-transparent max-w-[80%] rounded-2xl px-4 py-3 shadow-sm">
              <Spinner className="w-4 h-4 animate-spin" />
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
