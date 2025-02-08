import { NextResponse } from "next/server";
const { tavily } = require("@tavily/core");
import { nixoraSystemContent } from "@/lib/ai-agent/ai-nixora-system";
import { SuiClient } from "@mysten/sui.js/client";
import { getSuiNetworkConfig } from "@/lib/utils";

const BASE_URL = "https://api.atoma.network/v1";
const API_KEY = "gKuPUDzvVkcRfNo5rctfB9wQ8a7Ls3";
const MODEL = "meta-llama/Llama-3.3-70B-Instruct";

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
];

export async function POST(req) {
  try {
    const { message } = await req.json();
    console.log("Incoming message:", message);

    const needsTools =
      message.toLowerCase().includes("price") ||
      message.toLowerCase().includes("how much") ||
      message.toLowerCase().includes("token") ||
      message.toLowerCase().includes("search") ||
      message.toLowerCase().includes("find") ||
      message.toLowerCase().includes("what is") ||
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
      const initialResponse = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
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
          max_tokens: 128,
          stream: true,
        }),
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (!initialResponse.ok) {
              throw new Error(`Atoma API error: ${initialResponse.statusText}`);
            }

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
              if (done) break;

              buffer += new TextDecoder().decode(value);
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const jsonData = JSON.parse(line.slice(6));
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
                    console.error("Error parsing SSE message:", e);
                    continue;
                  }
                }
              }
            }

            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream);
    } else {
      // For general questions without tools
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: nixoraSystemContent,
            },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 128,
          stream: true,
        }),
      });

      // Create a transformed stream that processes the SSE format
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                const content = jsonData.choices[0]?.delta?.content || "";
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) {
                console.error("Error parsing SSE message:", e);
                continue;
              }
            }
          }
        },
      });

      return new Response(response.body.pipeThrough(transformStream));
    }
  } catch (error) {
    console.error("Nixora API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleToolCall(toolCall) {
  console.log("Processing complete tool call:", toolCall); // Debug log

  if (toolCall.function.name === "getCryptoPrice") {
    try {
      // Clean up the arguments string to ensure valid JSON
      const argsString = toolCall.function.arguments.replace(/\s+/g, " ").trim();
      const args = JSON.parse(argsString);
      const symbol = args.symbol?.toUpperCase();

      if (!symbol) {
        return "Sorry, I couldn't determine which cryptocurrency to look up.";
      }

      console.log("Fetching price for symbol:", symbol); // Debug log
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/crypto-price?symbol=${symbol}`);
      const data = await response.json();

      if (data.error) {
        return `Sorry, I couldn't fetch the price for ${symbol}. ${data.error}`;
      }

      return `The current price of ${symbol} is $${data.price.toFixed(2)}. 
24h change: ${data.changePercent24h.toFixed(2)}%
1h change: ${data.changePercent1h.toFixed(2)}%`;
    } catch (error) {
      console.error("Error in getCryptoPrice:", error);
      return "Sorry, I encountered an error while fetching the cryptocurrency price.";
    }
  }
  return "I'm not sure how to handle that request.";
}
