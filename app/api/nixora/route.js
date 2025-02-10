import { NextResponse } from "next/server";
const { tavily } = require("@tavily/core");
import { nixoraSystemContent } from "@/lib/ai-agent/ai-nixora-system";
import { SuiClient } from "@mysten/sui.js/client";
import { getSuiNetworkConfig } from "@/lib/utils";

const BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
const API_KEY = process.env.LLM_API_KEY || "ollama";

// Update based on the model you want to use locally and/or available on Atoma Network
const MODEL_LLAMA = process.env.LLM_ENV !== "PROD" ? "qwen2.5:3b" : "meta-llama/Llama-3.3-70B-Instruct";
const MODEL_DEEPSEEK = process.env.LLM_ENV !== "PROD" ? "qwen2.5:3b" : "deepseek-ai/DeepSeek-R1";

const tools = [
  {
    type: "function",
    function: {
      name: "getCryptoPrice",
      description: "Get real-time cryptocurrency prices and changes",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "The cryptocurrency symbol (e.g., BTC, ETH, SUI)",
            enum: ["BTC", "ETH", "SUI"],
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchInternet",
      description: "Search the internet for information about any topic using Tavily Search API",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query or topic to research",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "initiateSuiTransfer",
      description: "Initiate a SUI token transfer to a specified wallet address",
      parameters: {
        type: "object",
        properties: {
          recipientAddress: {
            type: "string",
            description: "The recipient's SUI wallet address",
          },
          amount: {
            type: "string",
            description: "The amount of SUI to send (in SUI units)",
          },
        },
        required: ["recipientAddress", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDefiYieldOpportunities",
      description: "Get current DeFi yield opportunities and analysis from Navi Protocol",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Type of yield information (supply, borrow, or all)",
            enum: ["supply", "borrow", "all"],
          },
        },
        required: ["type"],
      },
    },
  },
];

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, model } = body;
    console.log("Incoming message:", message);
    console.log("Request body:", JSON.stringify(body, null, 2));
    const needsTools =
      message.toLowerCase().includes("price") ||
      message.toLowerCase().includes("how much") ||
      message.toLowerCase().includes("token") ||
      message.toLowerCase().includes("search") ||
      message.toLowerCase().includes("find") ||
      message.toLowerCase().includes("sui tokens") ||
      message.toLowerCase().includes("balance for") ||
      message.toLowerCase().includes("wallet") ||
      message.toLowerCase().includes("send") ||
      message.toLowerCase().includes("transfer") ||
      message.toLowerCase().includes("sui to") ||
      message.toLowerCase().includes("yield") ||
      message.toLowerCase().includes("defi") ||
      message.toLowerCase().includes("apy");

    if (needsTools) {
      // Add response headers for streaming
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      };

      const initialResponse = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_LLAMA,
          messages: [
            {
              role: "system",
              content: nixoraSystemContent,
            },
            { role: "user", content: message },
          ],
          tools,
          tool_choice: "auto",
          temperature: 0.5,
          max_tokens: 2000,
          stream: true,
        }),
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let keepAliveInterval;
          try {
            if (!initialResponse.ok) {
              throw new Error(`Atoma API error: ${initialResponse.statusText}`);
            }

            // Add keepalive ping every 15 seconds
            keepAliveInterval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(": keepalive\n\n"));
              } catch (e) {
                console.error("Keepalive failed:", e);
                clearInterval(keepAliveInterval);
              }
            }, 15000);

            const reader = initialResponse.body.getReader();
            let buffer = "";
            let toolCallBuffer = {
              function: {
                name: "",
                arguments: "",
              },
            };
            let isCollectingToolCall = false;

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              buffer += new TextDecoder().decode(value);
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const jsonLine = line.slice(6).trim();
                    // Skip empty lines or [DONE] messages
                    if (!jsonLine || jsonLine === "[DONE]") {
                      continue;
                    }

                    const jsonData = JSON.parse(jsonLine);
                    const delta = jsonData.choices[0]?.delta;

                    // Handle regular content
                    if (delta?.content) {
                      controller.enqueue(encoder.encode(delta.content));
                    }

                    // Handle tool calls
                    if (delta?.tool_calls) {
                      const toolCall = delta.tool_calls[0];
                      isCollectingToolCall = true;

                      // Accumulate tool call data
                      if (toolCall.function?.name) {
                        toolCallBuffer.function.name = toolCall.function.name;
                      }
                      if (toolCall.function?.arguments) {
                        toolCallBuffer.function.arguments += toolCall.function.arguments;
                      }

                      // Check if we have a complete JSON object in arguments
                      if (toolCallBuffer.function.arguments.includes("}")) {
                        isCollectingToolCall = false;
                        console.log("Complete tool call:", toolCallBuffer); // Debug log

                        try {
                          const toolResponse = await handleToolCall(toolCallBuffer);
                          console.log("Message triggered tools:", needsTools);
                          console.log("Tool call received:", toolCall);
                          console.log("Tool response:", toolResponse);
                          controller.enqueue(encoder.encode("\n" + toolResponse + "\n"));
                          // Reset the buffer
                          toolCallBuffer = {
                            function: {
                              name: "",
                              arguments: "",
                            },
                          };
                        } catch (error) {
                          console.error("Tool call error:", error);
                          controller.enqueue(encoder.encode("\nSorry, I encountered an error fetching the price.\n"));
                        }
                      }
                    }
                  } catch (e) {
                    // Log the error but don't throw, allow processing to continue
                    if (!line.includes("[DONE]")) {
                      console.error("Error parsing SSE message:", e, "Line:", line);
                    }
                    continue;
                  }
                }
              }
            }
          } catch (error) {
            console.error("Stream processing error:", error);
            controller.error(error);
          } finally {
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
            }
            controller.close();
          }
        },
      });

      return new Response(stream, { headers });
    } else {
      // For general questions without tools
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      };

      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: model === "DeepSeek-R1" ? MODEL_DEEPSEEK : MODEL_LLAMA,
          messages: [
            {
              role: "system",
              content: nixoraSystemContent,
            },
            { role: "user", content: message },
          ],
          temperature: 0.5,
          max_tokens: 4000,
          stream: true,
        }),
      });

      let buffer = "";
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          buffer += text;
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonLine = line.slice(6).trim();
                // Skip empty lines or "[DONE]" messages
                if (!jsonLine || jsonLine === "[DONE]") continue;

                const jsonData = JSON.parse(jsonLine);
                const content = jsonData.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) {
                console.error("Error parsing SSE message:", e, "Line:", line);
                // Continue processing other lines even if one fails
                continue;
              }
            }
          }
        },
        flush(controller) {
          // Process any remaining data in the buffer
          if (buffer) {
            try {
              const jsonLine = buffer.slice(6).trim();
              if (jsonLine && jsonLine !== "[DONE]") {
                const jsonData = JSON.parse(jsonLine);
                const content = jsonData.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              }
            } catch (e) {
              console.error("Error processing final buffer:", e);
            }
          }
        },
      });

      return new Response(response.body.pipeThrough(transformStream), { headers });
    }
  } catch (error) {
    console.error("Nixora API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleToolCall(toolCall) {
  console.log("Processing complete tool call:", toolCall);

  if (toolCall.function.name === "getCryptoPrice") {
    try {
      const argsString = toolCall.function.arguments.replace(/\s+/g, " ").trim();
      const args = JSON.parse(argsString);
      const symbol = args.symbol?.toUpperCase();

      if (!symbol) {
        return "Sorry, I couldn't determine which cryptocurrency to look up.";
      }

      console.log("Fetching price for symbol:", symbol);
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/crypto-price?symbol=${symbol}`);
      const data = await response.json();

      if (data.error) {
        return `Sorry, I couldn't fetch the price for ${symbol}. ${data.error}`;
      }

      // Send the price data to AI for analysis
      const aiResponse = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_LLAMA,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful crypto market analyst. Analyze the given price data and provide insights about the price movements. Be concise but informative.",
            },
            {
              role: "user",
              content: `Please analyze this price data for ${symbol}:
                Current Price: $${data.price}
                24h Change: ${data.changePercent24h}%
                1h Change: ${data.changePercent1h}%
                Market Cap: $${data.marketCap}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 700,
        }),
      });

      const aiData = await aiResponse.json();
      return aiData.choices[0]?.message?.content || "Sorry, I couldn't analyze the price data.";
    } catch (error) {
      console.error("Error in getCryptoPrice:", error);
      return "Sorry, I encountered an error while fetching the cryptocurrency price.";
    }
  } else if (toolCall.function.name === "searchInternet") {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const response = await tvly.search(args.query, {
        search_depth: "advanced",
        max_tokens: 10,
        include_domains: [],
        exclude_domains: [],
        include_answer: true,
        include_raw_content: true,
        include_images: false,
        async: true,
      });

      // Structure and clean the content
      const cleanedResults = response.results
        .map((result) => ({
          content: result.content.trim(),
          snippet: result.snippet,
          score: result.score,
          title: result.title,
          url: result.url,
          published_date: result.published_date,
        }))
        .filter((result) => result.content && result.score > 0.5);

      // Sort by relevance score
      cleanedResults.sort((a, b) => b.score - a.score);

      // Combine relevant information with context
      const combinedContent = cleanedResults
        .slice(0, 3)
        .map((result) => `Context from ${result.title}:\n${result.content}`)
        .join("\n\n");

      // Generate a comprehensive summary using the combined content
      const summaryResponse = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_LLAMA,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that creates concise summaries. Synthesize the information from multiple sources into a coherent response. Focus on key points and maintain factual accuracy.",
            },
            {
              role: "user",
              content: `Provide a concise summary of this information about "${args.query}":\n\n${combinedContent}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      const summaryData = await summaryResponse.json();
      const summary = summaryData.choices[0]?.message?.content || "Summary unavailable.";

      let formattedResponse = `${summary.trim()}\n\n`;

      // Add sources with relevance scores
      formattedResponse += "Sources:\n";
      cleanedResults.slice(0, 3).forEach((result, index) => {
        const date = result.published_date ? ` (${result.published_date})` : "";
        formattedResponse += `${index + 1}. ${result.title}${date}\n`;
        formattedResponse += `   Relevance: ${result.score.toFixed(2)}\n`;
        formattedResponse += `   ${result.url}\n\n`;
      });

      return formattedResponse;
    } catch (error) {
      console.error("Error in searchInternet:", error);
      return "Sorry, I encountered an error while searching the internet.";
    }
  } else if (toolCall.function.name === "initiateSuiTransfer") {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const normalizedAmount = normalizeAmount(args.amount);

      if (!args.recipientAddress || normalizedAmount === undefined) {
        return "Missing required parameters for SUI transfer.";
      }

      const amountNum = parseFloat(normalizedAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return "Invalid transfer amount specified.";
      }

      if (amountNum > 100) {
        return `Transfer amount ${amountNum} SUI exceeds maximum limit of 100 SUI`;
      }

      if (amountNum < 0.000001) {
        return "Amount is too small. Minimum amount is 0.000001 SUI";
      }

      // Format and return the TRANSFER_REQUEST as a string
      const transferRequest = JSON.stringify({
        type: "TRANSFER_REQUEST",
        tool_calls: [
          {
            function: {
              name: "initiateSuiTransfer",
              arguments: JSON.stringify({
                recipientAddress: args.recipientAddress,
                amount: amountNum.toString(),
              }),
            },
          },
        ],
      });

      // Add SuiScan link to the message
      const suiscanLink = `https://suiscan.xyz/testnet/account/${args.recipientAddress}/activity`;

      return `${transferRequest}\nTransfer request prepared:
Amount: ${amountNum} SUI
To: ${args.recipientAddress}
Estimated gas: 0.000001 SUI
Please confirm this transaction in your wallet.
\nYou can view the recipient's activity here: ${suiscanLink}`;
    } catch (error) {
      console.error("Error in initiateSuiTransfer:", error);
      return "Sorry, I encountered an error while preparing the SUI transfer.";
    }
  } else if (toolCall.function.name === "getDefiYieldOpportunities") {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/navi`);
      const data = await response.json();

      if (!data.success) {
        return "Sorry, I couldn't fetch the DeFi yield information at this time.";
      }

      // Return both the AI analysis and raw data for context
      return `Here's the current DeFi yield analysis:\n\n${data.analysis}`;
    } catch (error) {
      console.error("Error in getDefiYieldOpportunities:", error);
      return "Sorry, I encountered an error while fetching DeFi yield information.";
    }
  }
  return "I'm not sure how to handle that request.";
}

function normalizeAmount(amount) {
  if (typeof amount === "string" && amount.startsWith("0.")) {
    return amount;
  }

  const amountStr = amount.toString();
  const parsedAmount = parseFloat(amountStr);

  if (parsedAmount < 1) {
    return parsedAmount.toFixed(Math.max(2, amountStr.split(".")[1]?.length || 0));
  }

  return parsedAmount.toString();
}
