import { SuiClient } from "@mysten/sui.js/client";
import { getSuiNetworkConfig } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Get address from query params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    // Get network configuration
    const { rpcUrl } = getSuiNetworkConfig();

    // Initialize SUI client
    const suiClient = new SuiClient({ url: rpcUrl });

    // Fetch balance and owned objects in parallel
    const [balance, objects] = await Promise.all([
      suiClient.getBalance({
        owner: address,
      }),
      suiClient.getOwnedObjects({
        owner: address,
        options: {
          showType: true,
          showContent: true,
        },
      }),
    ]);

    return NextResponse.json({
      balance: balance,
      objects: objects.data,
    });
  } catch (error) {
    console.error("Error fetching SUI account data:", error);
    return NextResponse.json({ error: "Failed to fetch account data" }, { status: 500 });
  }
}
