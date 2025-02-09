import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.atoma.network/v1",
  apiKey: process.env.ATOMA_API_KEY,
});

const model = "meta-llama/Llama-3.3-70B-Instruct";

export async function GET() {
  try {
    const response = await fetch("https://swap.api.sui-prod.bluefin.io/api/v1/pools/info");
    const poolData = await response.json();

    // Get up to 5 pools from the data
    const pools = Array.isArray(poolData) ? poolData.slice(0, 10) : [poolData];

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
      max_tokens: 1000,
    });

    const analysis = aiResponse.choices[0].message.content;

    return NextResponse.json({
      success: true,
      data: poolSummaries,
      analysis,
    });
  } catch (error) {
    console.error("Error analyzing pools:", error);

    // More specific error handling
    const errorMessage = error.error?.message || error.message || "Failed to analyze pool data";
    const statusCode = error.status || 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: statusCode }
    );
  }
}
