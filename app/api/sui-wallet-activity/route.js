import { SuiClient } from "@mysten/sui.js/client";
import { getSuiNetworkConfig } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Get address from query params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const cursor = searchParams.get("cursor"); // For pagination
    const limit = Number(searchParams.get("limit")) || 20; // Default to 20 transactions

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    // Get network configuration
    const { rpcUrl } = getSuiNetworkConfig();

    // Initialize SUI client
    const suiClient = new SuiClient({ url: rpcUrl });

    // Fetch transactions for the address
    const transactions = await suiClient.queryTransactionBlocks({
      filter: {
        // ToAddress: address,
        FromAddress: address,
      },
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
      },
      cursor: cursor,
      limit: limit,
    });

    return NextResponse.json({
      transactions: transactions.data,
      hasNextPage: transactions.hasNextPage,
      nextCursor: transactions.nextCursor,
    });
  } catch (error) {
    console.error("Error fetching wallet activity:", error);
    return NextResponse.json({ error: "Failed to fetch wallet activity" }, { status: 500 });
  }
}
