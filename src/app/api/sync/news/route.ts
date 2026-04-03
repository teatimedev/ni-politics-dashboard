import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateText, Output } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { z } from "zod";
import * as cheerio from "cheerio";
import { CATEGORY_KEYS } from "@/lib/news-categories";

export const maxDuration = 120;

const RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/news/northern_ireland/rss.xml",
    source: "BBC News NI",
  },
  {
    url: "https://www.newsletter.co.uk/rss",
    source: "News Letter",
  },
  {
    url: "https://www.sluggerotoole.com/feed/",
    source: "Slugger O'Toole",
  },
  {
    url: "https://www.agendani.com/feed/",
    source: "agendaNi",
  },
];

interface RSSItem {
  title: string;
  link: string;
  description: string;
  contentEncoded: string | null;
  pubDate: string;
  source: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    // Remove script/style/nav/header/footer blocks entirely
    .replace(/<(script|style|nav|header|footer|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
    // Preserve line breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    // Remove all remaining tags
    .replace(/<[^>]*>/g, "")
    // Decode HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "...")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "") // catch remaining numeric entities
    .replace(/&\w+;/g, "") // catch remaining named entities
    // Clean up whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchRSSItems(
  feedUrl: string,
  source: string
): Promise<RSSItem[]> {
  const response = await fetch(feedUrl);
  if (!response.ok) return [];
  const xml = await response.text();

  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
    const description =
      itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const pubDate =
      itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const contentEncoded =
      itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1] ?? null;

    if (title && link) {
      items.push({
        title: stripHtml(title),
        link: link.trim(),
        description: stripHtml(description),
        contentEncoded: contentEncoded ? stripHtml(contentEncoded) : null,
        pubDate,
        source,
      });
    }
  }

  return items;
}

function extractWithCheerio(html: string, url: string): string | null {
  const $ = cheerio.load(html);

  // Remove noise elements across all sources
  $("script, style, nav, header, footer, aside, noscript, iframe, svg, figure, figcaption, button, [role='navigation'], [role='banner'], .social-links, .share-tools, .related-articles").remove();

  let paragraphs: string[] = [];

  if (url.includes("bbc.com") || url.includes("bbc.co.uk")) {
    // BBC: text blocks are marked with data-component="text-block"
    $("[data-component='text-block'] p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) paragraphs.push(text);
    });
    // Fallback: article > p
    if (paragraphs.length === 0) {
      $("article p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) paragraphs.push(text);
      });
    }
  } else if (url.includes("newsletter.co.uk")) {
    // News Letter: article body paragraphs
    $("article p, .article-body p, #article-body p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });
  } else {
    // Generic fallback
    $("article p, .post-content p, .entry-content p, main p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });
  }

  // Filter out common junk lines
  paragraphs = paragraphs.filter((p) =>
    !p.match(/^(Share|Save|Copy link|Published|Updated|Sign up|Subscribe|Read more|Advertisement|Getty|PA|Reuters|Alamy)/i) &&
    !p.match(/^\d+ (minutes?|hours?|days?) ago$/i) &&
    !p.match(/^Image (source|caption)/i) &&
    !p.match(/Did you know with a (Digital )?Subscription/i) &&
    !p.match(/unlimited access to the website/i) &&
    !p.match(/Assistant (Sports |News )?Editor$/i)
  );

  if (paragraphs.length < 2) return null;
  const text = paragraphs.join("\n\n");
  return text.length > 100 ? text : null;
}

async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "StormontWatch/1.0 (NI politics dashboard)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = extractWithCheerio(html, url);
    return text ? text.slice(0, 5000) : null;
  } catch {
    return null;
  }
}

const mlaQuoteSchema = z.object({
  mla_quotes: z.array(
    z.object({
      mla_name: z
        .string()
        .describe("Full name of the MLA as it would appear officially"),
      quoted_text: z
        .string()
        .describe("The direct or indirect quote attributed to the MLA"),
      sentiment: z
        .number()
        .min(-1)
        .max(1)
        .describe("Sentiment score from -1 (very negative) to 1 (very positive)"),
    })
  ),
  article_sentiment: z
    .number()
    .min(-1)
    .max(1)
    .describe("Overall article sentiment from -1 to 1"),
  category: z
    .enum(CATEGORY_KEYS as unknown as [string, ...string[]])
    .describe("Primary topic category for the article"),
});

async function extractMlaQuotes(
  title: string,
  description: string,
  mlaNames: string[]
) {
  try {
    const { output } = await generateText({
      model: cerebras("qwen-3-235b-a22b-instruct-2507"),
      output: Output.object({ schema: mlaQuoteSchema }),
      prompt: `Analyze this Northern Ireland news article for quotes or statements by MLAs (Members of the Legislative Assembly).

Known NI MLAs: ${mlaNames.slice(0, 50).join(", ")}

Article title: ${title}
Article text: ${description}

Extract any direct or indirect quotes attributed to specific MLAs. If no MLAs are quoted, return an empty array. Only include quotes you are confident are from the article, not invented.

Also classify this article into exactly one category: health, economy, education, justice, infrastructure, assembly, legacy-identity, environment, or other. Pick the single best fit based on the primary topic.`,
    });
    return output ?? { mla_quotes: [], article_sentiment: 0, category: "other" as const };
  } catch {
    return { mla_quotes: [], article_sentiment: 0, category: "other" as const };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ source: "news", started_at: startedAt })
    .select("id")
    .single();

  try {
    // Get MLA names and IDs for matching
    const { data: members } = await supabase
      .from("members")
      .select("person_id, name")
      .eq("active", true);

    const mlaNames = (members ?? []).map((m) => m.name);
    const nameToPersonId = new Map<string, string>();
    for (const m of members ?? []) {
      nameToPersonId.set(m.name.toLowerCase(), m.person_id);
      // Also index by last name for fuzzy matching
      const parts = m.name.split(" ");
      const lastName = parts[parts.length - 1].toLowerCase();
      nameToPersonId.set(lastName, m.person_id);
    }

    // Fetch RSS items from all feeds in parallel
    const feedResults = await Promise.all(
      RSS_FEEDS.map((feed) => fetchRSSItems(feed.url, feed.source))
    );
    // Get existing URLs to skip duplicates
    const { data: existingNews } = await supabase
      .from("news_mentions")
      .select("url");
    const existingUrls = new Set(
      (existingNews ?? []).map((n) => n.url)
    );

    // Filter each feed's new items, then interleave round-robin for fair coverage
    const newByFeed = feedResults.map((items) =>
      items.filter((item) => !existingUrls.has(item.link))
    );
    const newItems: RSSItem[] = [];
    const maxLen = Math.max(...newByFeed.map((f) => f.length));
    for (let i = 0; i < maxLen; i++) {
      for (const feed of newByFeed) {
        if (i < feed.length) newItems.push(feed[i]);
      }
    }

    let totalArticles = 0;
    let totalQuotes = 0;

    // Process each new article (limit to 40 per sync to stay within Groq limits)
    for (const item of newItems.slice(0, 40)) {
      // Get full article text: prefer content:encoded, then fetch from URL
      const fullText =
        item.contentEncoded ??
        (await fetchArticleText(item.link));

      // Use the best available text for LLM analysis
      const textForLlm = fullText
        ? fullText.slice(0, 3000)
        : item.description;

      // Run LLM extraction
      const extraction = await extractMlaQuotes(
        item.title,
        textForLlm,
        mlaNames
      );

      // Insert news mention
      const { data: newsRow, error: newsError } = await supabase
        .from("news_mentions")
        .insert({
          headline: item.title,
          source: item.source,
          url: item.link,
          date: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          snippet: item.description.slice(0, 500),
          full_text: fullText?.slice(0, 10000) ?? null,
          article_sentiment: extraction.article_sentiment,
          category: extraction.category,
        })
        .select("id")
        .single();

      if (newsError) continue; // skip on duplicate URL constraint

      totalArticles++;

      // Insert MLA quotes
      for (const quote of extraction.mla_quotes) {
        // Fuzzy match MLA name to person_id
        const personId =
          nameToPersonId.get(quote.mla_name.toLowerCase()) ??
          nameToPersonId.get(
            quote.mla_name.split(" ").pop()?.toLowerCase() ?? ""
          );

        if (personId && newsRow) {
          await supabase.from("news_mla_quotes").insert({
            news_id: newsRow.id,
            person_id: personId,
            quoted_text: quote.quoted_text,
            sentiment_score: quote.sentiment,
          });
          totalQuotes++;
        }
      }
    }

    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: totalArticles,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      feed_items: feedResults.reduce((n, f) => n + f.length, 0),
      new_articles: totalArticles,
      mla_quotes: totalQuotes,
      new_candidates: newItems.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}${error.cause ? ` | cause: ${error.cause}` : ""}`
        : JSON.stringify(error);

    if (logEntry) {
      await supabase
        .from("sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: message,
        })
        .eq("id", logEntry.id);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
