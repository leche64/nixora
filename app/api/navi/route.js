import { OpenAI } from "openai";
import { NextResponse } from "next/server";

// Initialize OpenAI client with Ollama
const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

const model = "qwen2.5:1.5b";

async function fetchPoolData() {
  try {
    const response = await fetch("https://open-api.naviprotocol.io/api/navi/pools");
    const data = await response.json();

    // Validate response structure
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid API response structure");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching pool data:", error);
    throw error;
  }
}

function formatPoolDataForAI(pools) {
  return pools
    .map((pool) => {
      // Add null checks and default values
      const tokenParts = pool.coinType?.split("::") || [];
      const token = tokenParts[tokenParts.length - 1] || "UNKNOWN";

      return {
        token,
        supplyAPY: parseFloat(pool.supplyIncentiveApyInfo?.apy || 0),
        borrowAPY: parseFloat(pool.borrowIncentiveApyInfo?.apy || 0),
        price: parseFloat(pool.oracle?.price || 0),
        totalSupply: parseFloat(pool.totalSupplyAmount || 0),
        availableBorrow: parseFloat(pool.availableBorrow || 0),
        ltv: parseInt(pool.ltv || 0) / 1e27,
        // Add additional useful metrics
        totalAPY:
          parseFloat(pool.supplyIncentiveApyInfo?.vaultApr || 0) +
          parseFloat(pool.supplyIncentiveApyInfo?.boostedApr || 0),
      };
    })
    .sort((a, b) => b.supplyAPY - a.supplyAPY)
    .slice(0, 5); // Only return top 5 pools
}

export async function GET() {
  const startTime = performance.now();
  try {
    console.log("🚀 Starting DeFi analysis process...");

    // Fetch pool data
    const fetchStartTime = performance.now();
    const poolData = await fetchPoolData();
    const formattedPools = formatPoolDataForAI(poolData);
    console.log("🔍 Formatted pools:", formattedPools);
    console.log(`📊 Pool data fetched and formatted in ${(performance.now() - fetchStartTime).toFixed(2)}ms`);

    // Create prompt for AI analysis
    const aiStartTime = performance.now();
    const prompt = `Analyze the following DeFi pools and provide the best opportunities for:
1. Highest yield farming (supply) opportunities
2. Lowest borrowing rates
3. Best risk-adjusted returns considering LTV ratios
4. Any notable arbitrage opportunities

Pool Data:
${JSON.stringify(formattedPools, null, 2)}

Please provide a concise analysis with specific recommendations.`;
    console.log("🔍 Prompt:", prompt);
    // Get AI analysis
    console.log("🤖 Requesting AI analysis...");
    const aiPromise = openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "You are a DeFi expert analyzing yield opportunities. Provide clear, actionable insights based on the data provided.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      timeout: 120000, // 2 minute timeout
    });

    const completion = await Promise.race([
      aiPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("AI analysis timeout")), 120000)),
    ]);
    console.log(`🎯 AI analysis completed in ${(performance.now() - aiStartTime).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(`✨ Total processing time: ${totalTime.toFixed(2)}ms`);

    // Return the analysis with timing information
    return NextResponse.json({
      success: true,
      analysis: completion.choices[0].message.content,
      rawData: formattedPools,
      timing: {
        total: totalTime,
        dataProcessing: fetchStartTime - startTime,
        aiAnalysis: performance.now() - aiStartTime,
      },
    });
  } catch (error) {
    const errorTime = performance.now() - startTime;
    console.error(`❌ Error in DeFi analysis after ${errorTime.toFixed(2)}ms:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze DeFi opportunities",
        timing: { total: errorTime },
      },
      { status: 500 }
    );
  }
}
