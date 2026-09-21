import type { SourceConfig } from "@/types";

/**
 * Pre-configured sources for business opportunity scanning.
 * Each source defines how to extract items from its HTML.
 *
 * Note: Selectors may need updating as sites change their markup.
 * Reddit/HN/ProductHunt have JSON APIs we prefer when available.
 */
export const BUSINESS_SOURCES: SourceConfig[] = [
  // ── Reddit ────────────────────────────────────────────
  {
    name: "r/Entrepreneur",
    url: "https://www.reddit.com/r/Entrepreneur/hot.json?limit=20",
    type: "subreddit",
    category: "entrepreneurship",
    selector: {
      item: "data.children",
      title: "data.title",
      link: "data.permalink",
      summary: "data.selftext",
      author: "data.author",
      score: "data.score",
      commentCount: "data.num_comments",
    },
    baseUrl: "https://www.reddit.com",
  },
  {
    name: "r/startups",
    url: "https://www.reddit.com/r/startups/hot.json?limit=20",
    type: "subreddit",
    category: "startups",
    selector: {
      item: "data.children",
      title: "data.title",
      link: "data.permalink",
      summary: "data.selftext",
      author: "data.author",
      score: "data.score",
      commentCount: "data.num_comments",
    },
    baseUrl: "https://www.reddit.com",
  },
  {
    name: "r/SideProject",
    url: "https://www.reddit.com/r/SideProject/hot.json?limit=20",
    type: "subreddit",
    category: "side-projects",
    selector: {
      item: "data.children",
      title: "data.title",
      link: "data.permalink",
      summary: "data.selftext",
      author: "data.author",
      score: "data.score",
      commentCount: "data.num_comments",
    },
    baseUrl: "https://www.reddit.com",
  },
  {
    name: "r/smallbusiness",
    url: "https://www.reddit.com/r/smallbusiness/hot.json?limit=20",
    type: "subreddit",
    category: "small-business",
    selector: {
      item: "data.children",
      title: "data.title",
      link: "data.permalink",
      summary: "data.selftext",
      author: "data.author",
      score: "data.score",
      commentCount: "data.num_comments",
    },
    baseUrl: "https://www.reddit.com",
  },

  // ── Hacker News ───────────────────────────────────────
  {
    name: "Hacker News (Show HN)",
    url: "https://hacker-news.firebaseio.com/v0/showstories.json",
    type: "forum",
    category: "tech-startups",
    selector: {
      item: "", // array of IDs
      title: "", // fetched per item
      link: "",
      summary: "",
      author: "",
      score: "",
    },
  },
  {
    name: "Hacker News (Top)",
    url: "https://hacker-news.firebaseio.com/v0/topstories.json",
    type: "forum",
    category: "tech",
    selector: {
      item: "",
      title: "",
      link: "",
      summary: "",
      author: "",
      score: "",
    },
  },

  // ── Indie Hackers ─────────────────────────────────────
  {
    name: "Indie Hackers",
    url: "https://www.indiehackers.com/",
    type: "forum",
    category: "indie-business",
    selector: {
      item: "[class*='post-preview'], article, [data-testid='post']",
      title: "h2 a, h3 a, [class*='title'] a",
      link: "h2 a[href], h3 a[href], [class*='title'] a[href]",
      summary: "[class*='summary'], [class*='description'], p",
      author: "[class*='author'], [class*='username']",
      score: "[class*='votes'], [class*='score']",
    },
    baseUrl: "https://www.indiehackers.com",
  },

  // ── Product Hunt ──────────────────────────────────────
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com/",
    type: "product",
    category: "new-products",
    selector: {
      item: "[data-test='post-item'], [class*='styles_item']",
      title: "[data-test='post-name'], h3, [class*='title']",
      link: "a[href*='/posts/']",
      summary: "[data-test='post-tagline'], [class*='tagline'], p",
      score: "[data-test='vote-count'], [class*='vote']",
    },
    baseUrl: "https://www.producthunt.com",
  },

  // ── Business News / Blogs ─────────────────────────────
  {
    name: "TechCrunch (Startups)",
    url: "https://techcrunch.com/category/startups/",
    type: "blog",
    category: "startup-news",
    selector: {
      item: "article, [class*='post-block']",
      title: "h2 a, h3 a, [class*='post-block__title'] a",
      link: "h2 a[href], h3 a[href], [class*='post-block__title'] a[href]",
      summary: "[class*='post-block__content'], .wp-block-excerpt, p",
      author: "[class*='post-block__author'], [rel='author']",
    },
    baseUrl: "https://techcrunch.com",
  },
  {
    name: "Entrepreneur.com",
    url: "https://www.entrepreneur.com/latest",
    type: "blog",
    category: "business",
    selector: {
      item: "[class*='card'], article",
      title: "h3 a, h2 a, [class*='title'] a",
      link: "h3 a[href], h2 a[href], [class*='title'] a[href]",
      summary: "[class*='description'], [class*='dek'], p",
      author: "[class*='author']",
    },
    baseUrl: "https://www.entrepreneur.com",
  },
  {
    name: "Y Combinator Blog",
    url: "https://www.ycombinator.com/blog",
    type: "blog",
    category: "vc-startups",
    selector: {
      item: "article, [class*='post'], [class*='blog-post']",
      title: "h2 a, h3 a, [class*='title'] a",
      link: "h2 a[href], h3 a[href], [class*='title'] a[href]",
      summary: "[class*='excerpt'], [class*='summary'], p",
    },
    baseUrl: "https://www.ycombinator.com",
  },
];

/**
 * Get all enabled sources, optionally filtered by category
 */
export function getSources(category?: string): SourceConfig[] {
  if (category && category !== "all") {
    return BUSINESS_SOURCES.filter((s) => s.category === category);
  }
  return BUSINESS_SOURCES;
}
