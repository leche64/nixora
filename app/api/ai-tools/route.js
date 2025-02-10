import OpenAI from "openai";
const { tavily } = require("@tavily/core");
import { nixoraSystemContent } from "@/lib/ai-agent/ai-nixora-system";
import { SuiClient } from "@mysten/sui.js/client";
import { getSuiNetworkConfig } from "@/lib/utils";

const openai = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || "http://localhost:11434/v1",
  apiKey: process.env.LLM_API_KEY || "ollama",
});

const model = process.env.LLM_ENV !== "PROD" ? "qwen2.5:3b" : "meta-llama/Llama-3.3-70B-Instruct";

const tools = [
  {
    type: "function",
    function: {
      name: "getDexScreenerData",
      description: "Get token price and trading information from DexScreener API",
      parameters: {
        type: "object",
        properties: {
          tokenAddress: {
            type: "string",
            description: "The token contract address to query",
          },
        },
        required: ["tokenAddress"],
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
      name: "getTrendingTokens",
      description: "Get trending tokens and their detailed information from DexScreener",
      parameters: {
        type: "object",
        properties: {}, // No parameters needed
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getWalletBalance",
      description: "Get SUI and token balances for a given wallet address",
      parameters: {
        type: "object",
        properties: {
          walletAddress: {
            type: "string",
            description: "The SUI wallet address to query",
          },
        },
        required: ["walletAddress"],
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
      description: "Get analysis of the best DeFi yield opportunities from Navi Protocol",
      parameters: {
        type: "object",
        properties: {}, // No parameters needed
        required: [],
      },
    },
  },
];

async function getDexScreenerData(tokenAddress) {
  const response = await fetch(`https://api.dexscreener.com/tokens/v1/sui/${tokenAddress}`);
  const data = await response.json();
  return data[0]; // Returns first pair data
}

async function searchInternet(query) {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const response = await tvly.search(query, {
    search_depth: "advanced",
    max_results: 10,
    include_domains: [], // Add trusted domains if needed
    exclude_domains: [], // Add domains to exclude if needed
    include_answer: true, // Get AI-generated answer
    include_raw_content: true, // Get full content
    include_images: false, // Skip images for faster response
    async: true, // Use async search for faster results
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
    .filter((result) => result.content && result.score > 0.5); // Filter low-quality results

  // Sort by relevance score
  cleanedResults.sort((a, b) => b.score - a.score);

  // Combine relevant information with context
  const combinedContent = cleanedResults
    .map((result) => `Context from ${result.title}:\n${result.content}`)
    .join("\n\n");

  return {
    answer: response.answer, // AI-generated answer from Tavily
    summary: combinedContent,
    sources: cleanedResults.map((result) => ({
      title: result.title,
      url: result.url,
      published_date: result.published_date,
      relevance_score: result.score,
    })),
    query_context: {
      original_query: query,
      timestamp: new Date().toISOString(),
      total_results: cleanedResults.length,
    },
  };
}

async function getWalletBalance(walletAddress) {
  try {
    const { rpcUrl } = getSuiNetworkConfig();
    const suiClient = new SuiClient({ url: rpcUrl });

    // Get the base URL for the API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Fetch balance, objects, and SUI price in parallel
    const [balance, objects, suiPriceResponse] = await Promise.all([
      suiClient.getBalance({
        owner: walletAddress,
      }),
      suiClient.getOwnedObjects({
        owner: walletAddress,
        options: {
          showType: true,
          showContent: true,
        },
      }),
      fetch(`${baseUrl}/api/sui-price`),
    ]);

    const suiPriceData = await suiPriceResponse.json();
    const suiPrice = suiPriceData.price;

    // Format SUI balance to show actual SUI amount (divide by 10^9)
    const formattedSuiBalance = (Number(balance.totalBalance) / 1_000_000_000).toFixed(2);
    const totalValueUsd = (Number(formattedSuiBalance) * suiPrice).toFixed(2);

    // Process objects and format token balances
    const tokens = objects.data
      .filter((obj) => obj.data?.type?.includes("::coin::"))
      .map((obj) => ({
        type: obj.data.type,
        balance: (Number(obj.data.content.fields.balance) / 1_000_000_000).toFixed(2),
        symbol: obj.data.type.split("::").pop(),
      }));

    return {
      address: walletAddress,
      sui_balance: formattedSuiBalance,
      sui_price_usd: suiPrice,
      total_value_usd: totalValueUsd,
      price_change_24h: suiPriceData.changePercent24h,
      price_change_1h: suiPriceData.changePercent1h,
      tokens,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return {
      error: error.message,
      address: walletAddress,
      timestamp: new Date().toISOString(),
    };
  }
}

function normalizeAmount(amount) {
  // If amount is a string that contains "0." at the start, preserve it exactly
  if (typeof amount === "string" && amount.startsWith("0.")) {
    return amount;
  }

  // Convert to string if it's a number
  const amountStr = amount.toString();

  // Parse float and ensure it maintains decimal precision
  const parsedAmount = parseFloat(amountStr);

  // If the original input was less than 1, ensure we keep the leading zeros
  if (parsedAmount < 1) {
    return parsedAmount.toFixed(Math.max(2, amountStr.split(".")[1]?.length || 0));
  }

  return parsedAmount.toString();
}

async function initiateSuiTransfer(recipientAddress, amount) {
  try {
    if (!recipientAddress || amount === undefined) {
      throw new Error("Missing required parameters");
    }

    // Parse amount carefully
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error("Invalid amount specified");
    }

    // Add validation for reasonable amounts
    if (amountNum > 100) {
      // Adjust this limit as needed
      throw new Error(`Transfer amount ${amountNum} SUI exceeds maximum limit of 100 SUI`);
    }

    // Add validation for minimum amount
    if (amountNum < 0.000001) {
      throw new Error("Amount is too small. Minimum amount is 0.000001 SUI");
    }

    return {
      status: "pending",
      type: "TRANSFER_REQUEST",
      details: {
        recipientAddress,
        amount: amountNum,
        token: "SUI",
        estimatedGas: "0.000001",
        networkFee: "0.00021",
      },
      transaction: {
        from: "user_wallet",
        to: recipientAddress,
        value: amountNum,
      },
      timestamp: new Date().toISOString(),
      message: `Request to transfer ${amountNum} SUI to ${recipientAddress}`,
    };
  } catch (error) {
    return {
      status: "error",
      type: "TRANSFER_REQUEST",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function getDefiYieldOpportunities() {
  try {
    // Get the base URL for the API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/navi`);

    if (!response.ok) {
      throw new Error("Failed to fetch DeFi opportunities");
    }

    const data = await response.json();

    return {
      success: true,
      analysis: data.analysis,
      opportunities: data.rawData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching DeFi opportunities:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function POST(req) {
  try {
    const { message } = await req.json();
    console.log("Incoming message:", message);

    const needsTools =
      message.toLowerCase().includes("price") ||
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
      const initialCompletion = await openai.chat.completions.create({
        model: model,
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
        max_tokens: 1000,
        stream: false,
      });

      const initialResponse = initialCompletion.choices[0].message;
      console.log("Initial response:", JSON.stringify(initialResponse, null, 2));

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (initialResponse.tool_calls?.length > 0) {
              const toolCall = initialResponse.tool_calls[0];
              console.log("Tool call:", JSON.stringify(toolCall, null, 2));

              let toolResult;
              const args = JSON.parse(toolCall.function.arguments);

              if (toolCall.function.name === "initiateSuiTransfer") {
                // Log original values
                console.log("Original amount from AI:", args.amount);

                // Normalize the amount while preserving decimal precision
                const normalizedAmount = normalizeAmount(args.amount);
                console.log("Normalized amount:", normalizedAmount);

                // Create a new tool call with the normalized amount
                const normalizedToolCall = {
                  ...toolCall,
                  function: {
                    ...toolCall.function,
                    arguments: JSON.stringify({
                      ...args,
                      amount: normalizedAmount,
                    }),
                  },
                };

                // Use the normalized tool call
                toolResult = await initiateSuiTransfer(args.recipientAddress, normalizedAmount);

                // Log the final tool call for debugging
                console.log("Final tool call:", JSON.stringify(normalizedToolCall, null, 2));

                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: "tool_result",
                      data: toolResult,
                    }) + "\n"
                  )
                );
              } else if (toolCall.function.name === "getDexScreenerData") {
                toolResult = await getDexScreenerData(args.tokenAddress);
              } else if (toolCall.function.name === "searchInternet") {
                toolResult = await searchInternet(args.query);
              } else if (toolCall.function.name === "getTrendingTokens") {
                toolResult = await getTrendingTokens();
              } else if (toolCall.function.name === "getWalletBalance") {
                toolResult = await getWalletBalance(args.walletAddress);
              } else if (toolCall.function.name === "getDefiYieldOpportunities") {
                toolResult = await getDefiYieldOpportunities();
              }

              console.log("Tool result:", toolResult);

              // Get final response with tool results
              const finalCompletion = await openai.chat.completions.create({
                model: model,
                messages: [
                  { role: "user", content: message },
                  initialResponse,
                  {
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_call_id: toolCall.id,
                  },
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: true,
              });

              // Stream the final response
              for await (const chunk of finalCompletion) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              }
            } else {
              // Stream the initial response if no tool calls were made
              controller.enqueue(encoder.encode(initialResponse.content));
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
      // For general questions, stream a direct response without tools
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: nixoraSystemContent,
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(encoder.encode(content));
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
    }
  } catch (error) {
    console.error("AI Tools Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

const TOKEN_PROFILES_API = "https://api.dexscreener.com/token-profiles/latest/v1";

/**
 * Fetches and processes trending tokens from DexScreener
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function getTrendingTokens() {
  try {
    // Fetch token profiles from DexScreener API
    const response = await fetch(TOKEN_PROFILES_API, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch token profiles");
    }

    const responseData = await response.json();

    // Validate that responseData is an array
    if (!Array.isArray(responseData)) {
      console.error("Invalid data structure received:", responseData);
      return {
        success: false,
        data: [],
        error: "Invalid data structure received from API",
      };
    }

    // Extract base address from all tokens
    const processedTokens = responseData
      .filter((token) => token && token.tokenAddress && token.chainId === "sui") // Updated to use tokenAddress
      .map((token) => ({
        ...token,
        address: token.tokenAddress, // Use tokenAddress directly
      }));

    console.log("Processed tokens:", processedTokens);

    // Get detailed data for each token
    const detailedTokenData = await Promise.all(
      processedTokens.map(async (token) => {
        try {
          const dexScreenerData = await getDexScreenerData(token.address);
          if (!dexScreenerData) {
            return {
              ...token,
              dexScreenerData: null,
              error: "No data found",
            };
          }
          return {
            ...token,
            dexScreenerData,
          };
        } catch (error) {
          console.error(`Error fetching detailed data for ${token.address}:`, error);
          return {
            ...token,
            dexScreenerData: null,
            error: error.message,
          };
        }
      })
    );

    return {
      success: true,
      data: detailedTokenData.filter((token) => token.dexScreenerData), // Only return tokens with valid data
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in getTrendingTokens:", error);
    return {
      success: false,
      data: [],
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
