import { NextResponse } from "next/server";

const NETWORK_URLS = {
  DEVNET: "https://fullnode.devnet.sui.io",
  TESTNET: "https://fullnode.testnet.sui.io",
  MAINNET: "https://fullnode.mainnet.sui.io",
};

const network = process.env.SUI_NETWORK?.toUpperCase() || "DEVNET"; // fallback to testnet if not specified
const NETWORK_URL = NETWORK_URLS[network];

export async function GET() {
  try {
    const response = await fetch(NETWORK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_getLatestSuiSystemState",
        params: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "RPC error occurred");
    }

    return NextResponse.json({
      epoch: data.result.epoch,
      network: network.toLowerCase(),
      referenceGasPrice: data.result.referenceGasPrice,
      protocolVersion: data.result.protocolVersion,
    });
  } catch (error) {
    console.error("SUI Epoch fetch error:", error.message);
    return NextResponse.json({ error: "Failed to fetch epoch data" }, { status: 500 });
  }
}
