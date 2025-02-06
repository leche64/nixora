import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * @typedef {Object} EthPriceData
 * @property {number} price - Current ETH price in USD
 * @property {number} changePercent24h - 24-hour price change percentage
 * @property {number} changePercent1h - 1-hour price change percentage
 */

export async function GET() {
  try {
    const response = await fetch("https://min-api.cryptocompare.com/data/pricemultifull?fsyms=SUI&tsyms=USD", {
      next: { revalidate: 0 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      price: data.RAW.SUI.USD.PRICE,
      changePercent24h: data.RAW.SUI.USD.CHANGEPCT24HOUR,
      changePercent1h: data.RAW.SUI.USD.CHANGEPCTHOUR,
    });
  } catch (error) {
    console.error("Error fetching SUI price:", error);
    return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
  }
}
