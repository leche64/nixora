import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.atoma.network/v1",
  apiKey: process.env.ATOMA_API_KEY,
});

const model = "meta-llama/Llama-3.3-70B-Instruct";

export async function GET() {
  try {
    // Add request start timestamp
    const startTime = Date.now();
    console.log("[Bluefin API] Starting request at:", new Date().toISOString());

    console.log("[Bluefin API] Attempting to fetch pool data...");
    const response = await fetch("https://swap.api.sui-prod.bluefin.io/api/v1/pools/info");

    console.log("[Bluefin API] Response received:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      console.error("[Bluefin API] Response not OK:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      throw new Error(`Bluefin API error: ${response.status} ${response.statusText}`);
    }

    console.log("[Bluefin API] Attempting to parse response body...");
    const poolData = await response.json();
    console.log("[Bluefin API] Pool data parsed:", {
      dataType: typeof poolData,
      isArray: Array.isArray(poolData),
      length: Array.isArray(poolData) ? poolData.length : "N/A",
      sampleData: Array.isArray(poolData) ? poolData[0] : poolData,
    });

    // Get up to 5 pools from the data
    const pools = Array.isArray(poolData) ? poolData.slice(0, 5) : [poolData];

    // Map each pool to our structured format
    const poolSummaries = pools.map((pool) => ({
      symbol: pool.symbol || "Unknown",
      tvl: pool.tvl || 0,
      dayStats: {
        apr: {
          total: pool.day?.apr?.total || 0,
          feeApr: pool.day?.apr?.feeApr || 0,
          rewardApr: pool.day?.apr?.rewardApr || 0,
        },
        volume: pool.day?.volume || 0,
        priceRange: {
          min: pool.day?.priceMin || 0,
          max: pool.day?.priceMax || 0,
        },
      },
      weekStats: {
        apr: {
          total: pool.week?.apr?.total || 0,
          feeApr: pool.week?.apr?.feeApr || 0,
          rewardApr: pool.week?.apr?.rewardApr || 0,
        },
        volume: pool.week?.volume || 0,
      },
      currentPrice: pool.price || 0,
      tokens: {
        tokenA: {
          symbol: pool.tokenA?.info?.symbol || "",
          amount: pool.tokenA?.amount || 0,
        },
        tokenB: {
          symbol: pool.tokenB?.info?.symbol || "",
          amount: pool.tokenB?.amount || 0,
        },
      },
      rewards:
        pool.rewards?.map((r) => ({
          token: r.token?.symbol || "",
          dailyRewardsUsd: r.dailyRewardsUsd || 0,
        })) || [],
    }));

    const prompt = `Analyze these DeFi liquidity pools data from Bluefin (https://trade.bluefin.io/liquidity-pools):
    ${JSON.stringify(poolSummaries, null, 2)}
    
    Please provide a concise comparative analysis with these sections:
    1. Overview: Compare TVL and trading conditions across the top ${poolSummaries.length} pools
    2. APR Analysis: Highlight the pools with the best fee and reward APRs
    3. Risk Assessment: Compare price stability across pools
    4. Recommendation: Rank the pools based on TVL, APR, and risk metrics
    
    Note: Include a link to view more details at https://trade.bluefin.io/liquidity-pools`;

    console.log("[OpenAI] Initializing request...");
    console.log("[OpenAI] Checking API configuration:", {
      baseURL: openai.baseURL,
      hasApiKey: !!process.env.ATOMA_API_KEY,
      model,
    });

    console.log("Sending request to OpenAI API...");
    const aiResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a DeFi analyst specializing in Bluefin liquidity pools. Provide brief, data-driven analysis and always include a reference to view more details on the Bluefin trading platform.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    console.log("[OpenAI] Response received:", {
      status: "success",
      choicesLength: aiResponse.choices.length,
      modelUsed: aiResponse.model,
    });

    // Log execution time
    console.log("[Bluefin API] Request completed in:", Date.now() - startTime, "ms");

    console.log("Successfully received OpenAI response");
    const analysis = aiResponse.choices[0].message.content;

    return NextResponse.json({
      success: true,
      data: poolSummaries,
      analysis,
    });
  } catch (error) {
    console.error("[Bluefin API] Detailed error information:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      response: error.response?.data,
      status: error.status,
      type: error.type,
      // Add fetch-specific error properties
      fetchError: error instanceof TypeError ? "Network Error" : undefined,
      // Add OpenAI specific error properties
      openAiError: error.response?.status
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          }
        : undefined,
    });

    // Determine if it's an API error or OpenAI error
    let errorMessage = "Internal server error occurred";
    let statusCode = 500;

    if (error.message.includes("Bluefin API error")) {
      errorMessage = "Failed to fetch pool data from Bluefin";
      statusCode = error.status || 502; // Bad Gateway for external API failures
    } else if (error.message.includes("OpenAI")) {
      errorMessage = "Failed to generate analysis";
      statusCode = error.status || 503; // Service Unavailable for AI service issues
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? {
                message: error.message,
                cause: error.cause?.message,
                stack: error.stack,
              }
            : undefined,
      },
      { status: statusCode }
    );
  }
}
