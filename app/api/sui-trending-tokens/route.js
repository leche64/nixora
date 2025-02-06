import { NextResponse } from "next/server";

const TOKEN_PROFILES_API = "https://api.dexscreener.com/token-profiles/latest/v1";

export async function GET() {
  try {
    // Fetch token profiles from DexScreener API
    const response = await fetch(TOKEN_PROFILES_API, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch token profiles");
    }

    const data = await response.json();

    // Filter for Sui tokens and map to required format
    const suiTokens = data
      .filter((token) => token.chainId === "sui")
      // Take top 10 tokens
      .slice(0, 10)
      // Map to required token information
      .map((token) => ({
        address: token.tokenAddress,
        name: token.description || token.tokenAddress,
        symbol: token.tokenAddress.split("::").pop(), // Extract symbol from token address
        icon: token.icon,
        description: token.description,
        links: token.links,
      }));

    return NextResponse.json({
      success: true,
      data: suiTokens,
    });
  } catch (error) {
    console.error("Error fetching token profiles:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch token profiles",
      },
      { status: 500 }
    );
  }
}
