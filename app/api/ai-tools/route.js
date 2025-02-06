import OpenAI from "openai";
const { tavily } = require("@tavily/core");
import { nixoraSystemContent, nixoraToolsContent } from "@/lib/ai-agent/ai-nixora-system";

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});
// accurate and slow: qwen2.5:3b, llama3.2:3b
const model = "qwen2.5:3b";

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
      message.toLowerCase().includes("sui tokens");

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

              if (toolCall.function.name === "getDexScreenerData") {
                toolResult = await getDexScreenerData(args.tokenAddress);
              } else if (toolCall.function.name === "searchInternet") {
                toolResult = await searchInternet(args.query);
              } else if (toolCall.function.name === "getTrendingTokens") {
                toolResult = await getTrendingTokens();
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
