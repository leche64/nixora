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
    console.log(poolData);
    // Ensure we're accessing the first pool from the array if it's an array
    const pools = Array.isArray(poolData) ? poolData[0] : poolData;

    // Create a more structured and concise prompt with specific pool metrics
    const poolSummary = {
      symbol: pools.symbol || "Unknown",
      tvl: pools.tvl || 0,
      dayStats: {
        apr: {
          total: pools.day?.apr?.total || 0,
          feeApr: pools.day?.apr?.feeApr || 0,
          rewardApr: pools.day?.apr?.rewardApr || 0,
        },
        volume: pools.day?.volume || 0,
        priceRange: {
          min: pools.day?.priceMin || 0,
          max: pools.day?.priceMax || 0,
        },
      },
      weekStats: {
        apr: {
          total: pools.week?.apr?.total || 0,
          feeApr: pools.week?.apr?.feeApr || 0,
          rewardApr: pools.week?.apr?.rewardApr || 0,
        },
        volume: pools.week?.volume || 0,
      },
      currentPrice: pools.price || 0,
      tokens: {
        tokenA: {
          symbol: pools.tokenA?.info?.symbol || "",
          amount: pools.tokenA?.amount || 0,
        },
        tokenB: {
          symbol: pools.tokenB?.info?.symbol || "",
          amount: pools.tokenB?.amount || 0,
        },
      },
      rewards:
        pools.rewards?.map((r) => ({
          token: r.token?.symbol || "",
          dailyRewardsUsd: r.dailyRewardsUsd || 0,
        })) || [],
    };

    const prompt = `Analyze this DeFi liquidity pool data from Bluefin (https://trade.bluefin.io/liquidity-pools) and provide a brief summary focusing on key metrics:
    ${JSON.stringify(poolSummary, null, 2)}
    
    Please provide a concise analysis with these sections:
    1. Pool Overview: Describe the ${poolSummary.symbol} pool's TVL and current trading conditions on Bluefin
    2. APR Analysis: Break down the fee APR (${poolSummary.dayStats.apr.feeApr}%) and reward APR (${
      poolSummary.dayStats.apr.rewardApr
    }%)
    3. Risk Assessment: Evaluate price stability (range: ${poolSummary.dayStats.priceRange.min} - ${
      poolSummary.dayStats.priceRange.max
    })
    4. Recommendation: Based on TVL, APR, and risk metrics
    
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
      max_tokens: 300,
    });

    const analysis = aiResponse.choices[0].message.content;

    return NextResponse.json({
      success: true,
      data: poolSummary,
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
