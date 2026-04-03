import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateText, Output } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { CATEGORY_KEYS } from "@/lib/news-categories";

export const maxDuration = 300;

const categorySchema = z.object({
  category: z
    .enum(CATEGORY_KEYS as unknown as [string, ...string[]])
    .describe("Primary topic category for the article"),
});

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all uncategorised articles
  const { data: articles, error } = await supabase
    .from("news_mentions")
    .select("id, headline, snippet")
    .is("category", null)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ message: "No articles to backfill", processed: 0 });
  }

  let processed = 0;
  let failed = 0;

  // Process with delays for rate limiting
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    // 2-second delay between requests (except the first)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    try {
      const { output } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        output: Output.object({ schema: categorySchema }),
        prompt: `Classify this Northern Ireland news article into exactly one category: health, economy, education, justice, infrastructure, assembly, legacy-identity, environment, or other. Pick the single best fit based on the primary topic.

Article title: ${article.headline ?? ""}
Article text: ${(article.snippet ?? "").slice(0, 500)}`,
      });

      if (output?.category) {
        await supabase
          .from("news_mentions")
          .update({ category: output.category })
          .eq("id", article.id);
        processed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    message: "Backfill complete",
    total: articles.length,
    processed,
    failed,
  });
}
