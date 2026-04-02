import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateText, Output } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";

export const maxDuration = 120;

const RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/news/northern_ireland/rss.xml",
    source: "BBC News NI",
  },
];

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

async function fetchRSSItems(
  feedUrl: string,
  source: string
): Promise<RSSItem[]> {
  const response = await fetch(feedUrl);
  if (!response.ok) return [];
  const xml = await response.text();

  // Simple XML parsing for RSS items
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

    if (title && link) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        link: link.trim(),
        description: description
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/<[^>]*>/g, "")
          .trim(),
        pubDate,
        source,
      });
    }
  }

  return items;
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
});

async function extractMlaQuotes(
  title: string,
  description: string,
  mlaNames: string[]
) {
  try {
    const { output } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      output: Output.object({ schema: mlaQuoteSchema }),
      prompt: `Analyze this Northern Ireland news article for quotes or statements by MLAs (Members of the Legislative Assembly).

Known NI MLAs: ${mlaNames.slice(0, 50).join(", ")}

Article title: ${title}
Article text: ${description}

Extract any direct or indirect quotes attributed to specific MLAs. If no MLAs are quoted, return an empty array. Only include quotes you are confident are from the article, not invented.`,
    });
    return output ?? { mla_quotes: [], article_sentiment: 0 };
  } catch {
    return { mla_quotes: [], article_sentiment: 0 };
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

    // Fetch RSS items from all feeds
    const allItems: RSSItem[] = [];
    for (const feed of RSS_FEEDS) {
      const items = await fetchRSSItems(feed.url, feed.source);
      allItems.push(...items);
    }

    // Get existing URLs to skip duplicates
    const { data: existingNews } = await supabase
      .from("news_mentions")
      .select("url");
    const existingUrls = new Set(
      (existingNews ?? []).map((n) => n.url)
    );

    const newItems = allItems.filter((item) => !existingUrls.has(item.link));

    let totalArticles = 0;
    let totalQuotes = 0;

    // Process each new article (limit to 20 per sync to stay within Groq limits)
    for (const item of newItems.slice(0, 20)) {
      // Run LLM extraction
      const extraction = await extractMlaQuotes(
        item.title,
        item.description,
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
          article_sentiment: extraction.article_sentiment,
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
      feed_items: allItems.length,
      new_articles: totalArticles,
      mla_quotes: totalQuotes,
      skipped_existing: allItems.length - newItems.length,
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
