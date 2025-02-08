import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * @typedef {Object} CryptoPriceData
 * @property {number} price - Current crypto price in USD
 * @property {number} changePercent24h - 24-hour price change percentage
 * @property {number} changePercent1h - 1-hour price change percentage
 * @property {number} marketCap - Market capitalization in USD
 */

export async function GET(request) {
  try {
    // Get the crypto symbol from the URL search params
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.toUpperCase();

    if (!symbol) {
      return NextResponse.json({ error: "Cryptocurrency symbol is required" }, { status: 400 });
    }

    const response = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`, {
      next: { revalidate: 0 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if the cryptocurrency data exists
    if (!data.RAW?.[symbol]?.USD) {
      return NextResponse.json({ error: "Cryptocurrency not found" }, { status: 404 });
    }

    return NextResponse.json({
      price: data.RAW[symbol].USD.PRICE,
      changePercent24h: data.RAW[symbol].USD.CHANGEPCT24HOUR,
      changePercent1h: data.RAW[symbol].USD.CHANGEPCTHOUR,
      marketCap: data.RAW[symbol].USD.MKTCAP,
    });
  } catch (error) {
    console.error(`Error fetching ${symbol} price:`, error);
    return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
  }
}
