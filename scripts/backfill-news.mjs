import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function extractWithCheerio(html, url) {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, noscript, iframe, svg, figure, figcaption, button").remove();
  $("[role='navigation'], [role='banner'], .social-links, .share-tools, .related-articles").remove();

  let paragraphs = [];

  if (url.includes("bbc.com") || url.includes("bbc.co.uk")) {
    $("[data-component='text-block'] p").each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 10) paragraphs.push(t);
    });
    if (!paragraphs.length) {
      $("article p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 20) paragraphs.push(t);
      });
    }
  } else if (url.includes("newsletter.co.uk")) {
    $("article p, .article-body p, #article-body p").each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 20) paragraphs.push(t);
    });
  }

  paragraphs = paragraphs.filter(
    (p) =>
      !p.match(/^(Share|Save|Copy link|Published|Updated|Sign up|Subscribe|Read more|Advertisement|Getty|PA|Reuters)/i) &&
      !p.match(/^\d+ (minutes?|hours?|days?) ago$/i) &&
      !p.match(/^Image (source|caption)/i) &&
      !p.match(/Did you know with a (Digital )?Subscription/i) &&
      !p.match(/unlimited access to the website/i) &&
      !p.match(/Assistant (Sports |News )?Editor$/i)
  );

  if (paragraphs.length < 2) return null;
  const text = paragraphs.join("\n\n");
  return text.length > 100 ? text.slice(0, 5000) : null;
}

const { data: articles } = await supabase
  .from("news_mentions")
  .select("id, url, source")
  .is("full_text", null)
  .in("source", ["BBC News NI", "News Letter"]);

console.log(`Backfilling ${articles?.length ?? 0} articles...`);
let ok = 0;

for (const a of articles ?? []) {
  try {
    const r = await fetch(a.url, {
      headers: { "User-Agent": "StormontWatch/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) continue;
    const html = await r.text();
    const text = extractWithCheerio(html, a.url);
    if (text) {
      await supabase.from("news_mentions").update({ full_text: text }).eq("id", a.id);
      ok++;
      process.stdout.write(".");
    } else {
      process.stdout.write("x");
    }
  } catch {
    process.stdout.write("!");
  }
}

console.log(`\nDone: ${ok} articles backfilled`);
