import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed sources from our config
  const sources = [
    { name: "r/Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/hot.json?limit=20", type: "subreddit", category: "entrepreneurship" },
    { name: "r/startups", url: "https://www.reddit.com/r/startups/hot.json?limit=20", type: "subreddit", category: "startups" },
    { name: "r/SideProject", url: "https://www.reddit.com/r/SideProject/hot.json?limit=20", type: "subreddit", category: "side-projects" },
    { name: "r/smallbusiness", url: "https://www.reddit.com/r/smallbusiness/hot.json?limit=20", type: "subreddit", category: "small-business" },
    { name: "Hacker News (Show HN)", url: "https://hacker-news.firebaseio.com/v0/showstories.json", type: "forum", category: "tech-startups" },
    { name: "Hacker News (Top)", url: "https://hacker-news.firebaseio.com/v0/topstories.json", type: "forum", category: "tech" },
    { name: "Indie Hackers", url: "https://www.indiehackers.com/", type: "forum", category: "indie-business" },
    { name: "Product Hunt", url: "https://www.producthunt.com/", type: "product", category: "new-products" },
    { name: "TechCrunch (Startups)", url: "https://techcrunch.com/category/startups/", type: "blog", category: "startup-news" },
    { name: "Entrepreneur.com", url: "https://www.entrepreneur.com/latest", type: "blog", category: "business" },
    { name: "Y Combinator Blog", url: "https://www.ycombinator.com/blog", type: "blog", category: "vc-startups" },
  ];

  for (const source of sources) {
    await db.source.upsert({
      where: { url: source.url },
      create: source,
      update: { name: source.name },
    });
  }

  console.log(`✅ Seeded ${sources.length} sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
