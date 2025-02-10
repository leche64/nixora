<h1 align="center" style="font-size: 3em;">𝙽𝙸𝚇𝙾𝚁𝙰 𝙰𝙸</h1>

<p align="center">
  <img src="./public/nixora-tools.svg" alt="Nixora Logo" width="800"/>
</p>

A full-stack DeFi AI Agent starter kit. Nixora is comes with numerous tools and features to help users build, interact and deploy their own DeFi AI agent on Sui blockchain within minutes. Powered by open source models ran locally via Ollama or Atoma Network.

<div style="overflow-x: auto; white-space: nowrap; padding: 10px 0;">
  <img src="./public/s1.png" alt="Screenshot 1" style="display: inline-block; height: 300px; margin-right: 10px;">
  <img src="./public/s2.png" alt="Screenshot 2" style="display: inline-block; height: 300px; margin-right: 10px;">
  <img src="./public/s3.png" alt="Screenshot 3" style="display: inline-block; height: 300px; margin-right: 10px;">
  <img src="./public/s4.png" alt="Screenshot 4" style="display: inline-block; height: 300px; margin-right: 10px;">
  <img src="./public/s5.png" alt="Screenshot 5" style="display: inline-block; height: 300px;">
</div>

## 🛠 Agent Tools / Capabilities

<p align="center">
  <img src="./public/nixora-diagram.png" alt="Nixora Architecture Diagram" width="800"/>
</p>

- Crypto Price Search
  - CryptoCompare API
- Internet Search
  - Tavily Search API
- DeFi Yield Search / Analysis
  - NAVI API
  - Bluefin API
- Transfer Sui To Wallet

## API(s)

### NAVI Protocol Integration

```http
GET /api/navi
```

This endpoint interacts with NAVI Protocol's API to retrieve comprehensive liquidity pool data. The data is then analyzed by Nixora AI agent to:

- Identify optimal yield farming opportunities
- Calculate potential returns and APY
- Assess pool stability and risks
- Monitor liquidity depth and trading volume
- Track historical performance metrics

#### Sample Response

```json
{
  "success": true,
  "analysis": "**Navi Protocol Analysis**\n\n1. **Highest Yield Farming (Supply) Opportunities**: The top three assets for yield farming on Navi Protocol are NS (28.863% APY), DEEP (22.241% APY), and NAVX (18.743% APY). These assets offer the highest supply APYs, making them attractive for users looking to maximize their yield.\n2. **Lowest Borrowing Rates**: The assets with the lowest borrowing rates on Navi Protocol are BTC (0.466% APY), CERT (0.843% APY), and HASUI (0.224% APY). These low borrowing rates make them ideal for users who need to borrow assets for trading or other purposes.\n3. Potocol's lending markets and Bluefin's DEX, users can identify arbitrage opportunities. For example, if the price of an asset is higher on Bluefin's DEX than on Navi Protocol, users can buy the asset on Navi Protocol and sell it on Bluefin's DEX, earning a profit from the price difference.\n\nView all Navi markets at https://app.naviprotocol.io/market\nExplore Bluefin's DEX at https://bluefin.io",
  "timing": {
    "total": 6100.980133000063,
    "dataProcessing": 0.0742629999294877,
    "aiAnalysis": 6097.904188999906
  }
}
```

### Bluefin Integration

```http
GET /api/bluefin
```

This endpoint interfaces with Bluefin's API to fetch real-time liquidity pool data and market insights. The data is analyzed by Nixora AI agent to:

- Monitor trading opportunities across spot and perpetual markets
- Analyze market depth and liquidity
- Track price movements and volatility
- Identify potential arbitrage opportunities
- Calculate trading fees and potential slippage

#### Sample Response

```json
{
  "success": true,
  "data": [
    {
      "symbol": "suiUSDT/USDC",
      "tvl": "16972610.750106346357215",
      "dayStats": {
        "apr": {
          "total": "28.5039748739",
          "feeApr": "6.9764253",
          "rewardApr": "21.5275495739"
        },
        "volume": "32440584.593327047983354",
        "priceRange": {
          "min": "0.999714609",
          "max": "1.000270619"
        }
      },
      "weekStats": {
        "apr": {
          "total": "24.236259986",
          "feeApr": "2.76769",
          "rewardApr": "21.468569986"
        },
        "volume": "90336356.058227410852185"
      },
      "currentPrice": "0.999787666",
      "tokens": {
        "tokenA": {
          "symbol": "suiUSDT",
          "amount": "4322814255705"
        },
        "tokenB": {
          "symbol": "USDC",
          "amount": "12674712061885"
        }
      },
      "rewards": [
        {
          "token": "BLUE",
          "dailyRewardsUsd": "1616.8133672472789504"
        },
        {
          "token": "stSUI",
          "dailyRewardsUsd": "8393.562504590914944"
        }
      ]
    },
    {
      "symbol": "stSUI/USDC",
      "tvl": "889799.353530276596783576",
      "dayStats": {
        "apr": {
          "total": "111.8216636",
          "feeApr": "109.5212448",
          "rewardApr": "2.3004188"
        },
        "volume": "5339827.824026051669745192",
        "priceRange": {
          "min": "2.858779241",
          "max": "3.196590165"
        }
      },
      "weekStats": {
        "apr": {
          "total": "212.6746199",
          "feeApr": "210.3805036",
          "rewardApr": "2.2941163"
        },
        "volume": "71998585.313332665645604048"
      },
      "currentPrice": "3.14042285",
      "tokens": {
        "tokenA": {
          "symbol": "stSUI",
          "amount": "229581222922007"
        },
        "tokenB": {
          "symbol": "USDC",
          "amount": "168213112366"
        }
      },
      "rewards": [
        {
          "token": "BLUE",
          "dailyRewardsUsd": "56.0797584018805152"
        }
      ]
    }
  ],
  "analysis": "**DeFi Liquidity Pools Analysis on Bluefin**\n\n### 1. Overview\n\nThe top 5 liquidity pools on Bluefin have varying TVLs, with the suiUSDT/USDC pool having the highest TVL at $16,972,610.75, followed by the SUI/USDC pool at $8,134,226.78. The DEEP/SUI pool has the lowest TVL at $2,483,852.43. Trading conditions also differ, with the SUI/USDC pool having the highest daily volume at $8,491,040.76, while the wUSDT/USDC pool has the lowest at $6,227,362.20.\n\n### 2. APR Analysis\n\nThe DEEP/SUI pool has the highest total APR at 277.84%, with a fee APR of 190.29% and a reward APR of 87.55%. The SUI/USDC pool has the second-highest total APR at 116.95%, with a fee APR of 76.20% and a reward APR of 40.75%. The wUSDT/USDC pool has the lowest total APR at 18.59%, with a fee APR of 7.28% and a reward APR of 11.31%.\n\n### 3. Risk Assessment\n\nPrice stability varies across pools, with the wUSDT/USDC pool having the most stable price range (0.999814796 - 1.000346352). The DEEP/SUI pool has the most volatile price range (0.055930582 - 0.058670431). The SUI/USDC pool has a relatively stable price range (2.890277601 - 3.176872803).\n\n### 4. Recommendation\n\nBased on TVL, APR, and risk metrics, the ranking of the pools is:\n1. SUI/USDC: High TVL, high APR, and relatively stable price range.\n2. suiUSDT/USDC: High TVL, moderate APR, and stable price range.\n3. DEEP/SUI: Low TVL, high APR, but volatile price range.\n4. wUSDT/USDC: Low TVL, low APR, but stable price range.\n5. stSUI/USDC: Low TVL, high APR, but relatively stable price range.\n\nTo view more details on these liquidity pools and make informed investment decisions, visit the [Bluefin trading platform](https://trade.bluefin.io/liquidity-pools)."
}
```

## 🤖 Tech Stack

- **Framework:** Next.js 14 (App Router) React 18
- **Language:** JavaScript
- **Deployment:** Vercel
- **Blockchain Integration:**
  - Sui Network (@mysten/sui.js)
  - Suiet Wallet Kit
- **AI Integration:**
  - Atoma Network
    - [Llama 3.3 70B Instruct](https://ollama.com/library/llama3.3:70b)
    - [DeepSeek-R1](https://ollama.com/library/deepseek-r1)
  - Ollama
    - [qwen2.5:1.5b](https://ollama.com/library/qwen2.5:1.5b)
- **DeFi:**
  - NAVI
  - Bluefin
  - CryptoCompare
- **UI Components:**
  - Shadcn UI
  - Radix UI Primitives
  - Tailwind CSS for styling
  - Framer Motion for animations
- **State Management & Data Fetching:**
  - TanStack Query (React Query) v5

## ✨ Features

- Modern, responsive UI with micro-interactions and animations
- AI-powered functionality using multiple AI providers
- Blockchain integration with Sui Network
- Real-time data updates and caching with TanStack Query

## 🛠 Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/leche64/nixora.git
   cd nixora
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add necessary environment variables.

4. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔗 Useful Links

- [Sui Developer Portal](https://sui.io/developers#dev-tools) - Official Sui development resources and tools
- [Suiet Wallet Kit](https://github.com/suiet/wallet-kit) - React wallet adapter for Sui blockchain
- [NAVI Protocol](https://naviprotocol.gitbook.io/navi-protocol-developer-docs/navi-api-collection/navi-api) - DeFi protocol on Sui
- [Bluefin](https://bluefin-exchange.readme.io/reference/spot-api-introduction) - DeFi protocol on Sui
- [Atoma Network](https://atoma.network/) - Decentralized AI private cloud
- [Ollama](https://ollama.com/) - Local AI models

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
