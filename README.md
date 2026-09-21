# 📡 BizScanner — Business Opportunity Radar

An AI-powered Telegram bot that scans the web's top business discussion sites, forums, and blogs to extract insights on new business opportunities, process them into a daily digest, and deliver briefings via Telegram.

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Dashboard                      │
│         (React frontend + API routes)                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Scraper  │→ │  AI Analyzer │→ │  Digest Builder  │   │
│  │  Engine   │  │  (OpenAI)    │  │  + Formatter     │   │
│  └──────────┘  └──────────────┘  └──────────────────┘   │
│       ↑                                ↓                  │
│  ┌──────────┐                   ┌──────────────┐         │
│  │ 11 Sources│                   │  Telegram Bot │         │
│  │ (config)  │                   │  (Telegraf)   │         │
│  └──────────┘                   └──────────────┘         │
│       ↓                                ↓                  │
│  ┌──────────────────────────────────────────────────┐    │
│  │            SQLite (via Prisma ORM)                │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 📦 Tech Stack

| Layer         | Technology          |
|---------------|---------------------|
| Frontend      | Next.js 15, React 19, Tailwind CSS |
| Backend       | Node.js, Next.js API Routes |
| Bot Framework | Telegraf |
| Database      | SQLite + Prisma ORM |
| AI Analysis   | OpenAI GPT-4o-mini |
| Scraping      | Axios + Cheerio |
| Scheduling    | node-cron |

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:
- `TELEGRAM_BOT_TOKEN` — Get from [@BotFather](https://t.me/BotFather)
- `OPENAI_API_KEY` — Get from [OpenAI Platform](https://platform.openai.com)

### 3. Initialize database

```bash
npm run setup
```

### 4. Seed sources (optional)

```bash
npm run db:seed
```

### 5. Run the Telegram bot

```bash
npm run bot:start
```

### 6. Run the dashboard (in a separate terminal)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

## 🤖 Bot Commands

| Command     | Description                        |
|-------------|------------------------------------|
| `/start`    | Subscribe and see welcome message  |
| `/scan`     | Run an immediate scan of all sources |
| `/digest`   | Get today's opportunity digest     |
| `/top`      | Quick view of top 5 opportunities  |
| `/sources`  | List all monitored sources         |
| `/stop`     | Unsubscribe from daily digests     |

## 📡 Monitored Sources

| Source               | Category        | Type       |
|---------------------|-----------------|------------|
| r/Entrepreneur      | entrepreneurship| subreddit  |
| r/startups          | startups        | subreddit  |
| r/SideProject       | side-projects   | subreddit  |
| r/smallbusiness     | small-business  | subreddit  |
| Hacker News (Show)  | tech-startups   | forum      |
| Hacker News (Top)   | tech            | forum      |
| Indie Hackers       | indie-business  | forum      |
| Product Hunt        | new-products    | product    |
| TechCrunch          | startup-news    | blog       |
| Entrepreneur.com    | business        | blog       |
| Y Combinator Blog   | vc-startups     | blog       |

## 🧠 How the AI Analysis Works

Each scraped item is analyzed by GPT-4o-mini for:

1. **Opportunity Type** — market gap, trending, underserved market, emerging tech, regulation change, consumer shift
2. **Score** (0-10) — how promising and actionable
3. **Key Insight** — one-sentence takeaway
4. **Target Audience** — who would buy/benefit
5. **Market Size** — tiny to huge
6. **Actionable Steps** — what someone could do

Only items scoring 5+ are included in digests.

## 📁 Project Structure

```
biz-scanner-bot/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Source seeder
├── src/
│   ├── analyzer/
│   │   └── opportunity.ts # OpenAI opportunity analysis
│   ├── app/
│   │   ├── layout.tsx     # Root layout with nav
│   │   ├── page.tsx       # Dashboard (stats + top items)
│   │   ├── globals.css    # Tailwind + custom styles
│   │   ├── opportunities/ # Opportunities listing page
│   │   ├── sources/       # Sources listing page
│   │   ├── digests/       # Past digests page
│   │   └── api/scan/      # API endpoint for manual scan
│   ├── digest/
│   │   └── builder.ts     # Digest formatting + storage
│   ├── lib/
│   │   ├── config.ts      # Centralized config
│   │   ├── db.ts          # Prisma client singleton
│   │   └── openai.ts      # OpenAI client singleton
│   ├── scraper/
│   │   ├── engine.ts      # Multi-source scraper
│   │   └── sources.ts     # Source configurations
│   ├── scripts/
│   │   ├── run-scan.ts    # CLI: run scan without bot
│   │   └── run-digest.ts  # CLI: generate digest
│   ├── telegram/
│   │   └── bot.ts         # Telegraf bot + cron jobs
│   └── types/
│       └── index.ts       # TypeScript types
├── .env.example           # Environment template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## ⚙️ Configuration

Key `.env` variables:

| Variable           | Default        | Description                    |
|-------------------|----------------|--------------------------------|
| `TELEGRAM_BOT_TOKEN` | (required)   | Telegram bot token             |
| `OPENAI_API_KEY`     | (required)   | OpenAI API key for analysis    |
| `OPENAI_MODEL`       | `gpt-4o-mini`| Model for opportunity analysis |
| `DATABASE_URL`       | `file:./dev.db` | SQLite database path       |
| `SCAN_CRON`         | `0 */6 * * *`| How often to scan (every 6h)   |
| `DIGEST_CRON`       | `0 8 * * *`  | When to send digest (8am)      |
| `DIGEST_TIMEZONE`   | `UTC`        | Timezone for digest scheduling |

## 🔧 Extending

### Add a new source

Edit `src/scraper/sources.ts` and add a `SourceConfig`:

```typescript
{
  name: "My Forum",
  url: "https://myforum.com/latest",
  type: "forum",
  category: "my-category",
  selector: {
    item: ".post-item",
    title: "h2 a",
    link: "h2 a[href]",
    summary: ".excerpt",
    author: ".username",
    score: ".votes",
  },
  baseUrl: "https://myforum.com",
}
```

### Add custom analysis prompts

Edit `src/analyzer/opportunity.ts` to change the `ANALYSIS_PROMPT`.

### Run standalone (no bot)

```bash
# Scan only
npm run scan:run

# Generate digest only
npm run digest:run
```

## 📝 License

MIT
