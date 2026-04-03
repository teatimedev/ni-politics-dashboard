# News Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM-powered topic categories to news articles with a mobile-friendly chip filter bar.

**Architecture:** Extend the existing Groq LLM call in the news sync route to also classify articles into one of 9 fixed categories. Add a `category` column to the `news_mentions` table. Build a client-side filter component with horizontally scrollable chips. Backfill existing articles via a one-time API route.

**Tech Stack:** Next.js (App Router), Supabase, Groq (Llama 3.3-70B), Zod, Tailwind CSS, shadcn/ui Badge

---

### Task 1: Add category column to Supabase

**Files:**
- No code files — Supabase SQL via dashboard or management API

- [ ] **Step 1: Run SQL to add the column and index**

Execute this SQL against the Supabase project (via dashboard SQL editor or management API):

```sql
ALTER TABLE news_mentions ADD COLUMN category TEXT;
CREATE INDEX idx_news_category ON news_mentions(category);
```

- [ ] **Step 2: Verify the column exists**

Run this query to confirm:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'news_mentions' AND column_name = 'category';
```

Expected: one row with `category | text | YES`.

- [ ] **Step 3: Commit** (no code changes for this task — DB-only)

---

### Task 2: Create shared category constants

**Files:**
- Create: `src/lib/news-categories.ts`

- [ ] **Step 1: Create the constants file**

```typescript
export const NEWS_CATEGORIES = [
  { key: "health", label: "Health" },
  { key: "economy", label: "Economy" },
  { key: "education", label: "Education" },
  { key: "justice", label: "Justice" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "assembly", label: "Assembly" },
  { key: "legacy-identity", label: "Legacy & Identity" },
  { key: "environment", label: "Environment" },
  { key: "other", label: "Other" },
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = NEWS_CATEGORIES.map((c) => c.key);

export function getCategoryLabel(key: string): string {
  return NEWS_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/news-categories.ts
git commit -m "feat: add shared news category constants"
```

---

### Task 3: Extend Groq LLM schema and prompt in sync route

**Files:**
- Modify: `src/app/api/sync/news/route.ts`

- [ ] **Step 1: Add import for category keys**

At the top of the file, after existing imports, add:

```typescript
import { CATEGORY_KEYS } from "@/lib/news-categories";
```

- [ ] **Step 2: Add `category` to the Zod schema**

In the `mlaQuoteSchema` definition (line ~174), add a `category` field after `article_sentiment`:

```typescript
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
```

- [ ] **Step 3: Add category classification instruction to the prompt**

In the `extractMlaQuotes` function (line ~203), extend the prompt string. After the existing prompt text, add:

```typescript
prompt: `Analyze this Northern Ireland news article for quotes or statements by MLAs (Members of the Legislative Assembly).

Known NI MLAs: ${mlaNames.slice(0, 50).join(", ")}

Article title: ${title}
Article text: ${description}

Extract any direct or indirect quotes attributed to specific MLAs. If no MLAs are quoted, return an empty array. Only include quotes you are confident are from the article, not invented.

Also classify this article into exactly one category: health, economy, education, justice, infrastructure, assembly, legacy-identity, environment, or other. Pick the single best fit based on the primary topic.`,
```

- [ ] **Step 4: Update the fallback return to include category**

In the `extractMlaQuotes` function, update both return statements:

```typescript
return output ?? { mla_quotes: [], article_sentiment: 0, category: "other" as const };
```

And in the catch block:

```typescript
return { mla_quotes: [], article_sentiment: 0, category: "other" as const };
```

- [ ] **Step 5: Include category in the Supabase insert**

In the `GET` handler, where the article is inserted into `news_mentions` (line ~303), add `category` to the insert object:

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/sync/news/route.ts
git commit -m "feat: add category classification to news sync LLM call"
```

---

### Task 4: Build the backfill API route

**Files:**
- Create: `src/app/api/sync/news-backfill/route.ts`

- [ ] **Step 1: Create the backfill route**

```typescript
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

  // Process in batches of 10 with delays for rate limiting
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
```

- [ ] **Step 2: Test the backfill route locally**

Start the dev server if not running, then call the route:

```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/sync/news-backfill
```

Expected: JSON response with `processed` count matching the number of uncategorised articles. Check a few rows in Supabase to verify categories look sensible.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sync/news-backfill/route.ts
git commit -m "feat: add one-time news category backfill route"
```

---

### Task 5: Update types to include category

**Files:**
- Modify: `src/lib/db-types.ts`

- [ ] **Step 1: Add `category` to `NewsArticleWithQuotes`**

In `src/lib/db-types.ts`, add `category` to the `NewsArticleWithQuotes` interface (line ~72), after `article_sentiment`:

```typescript
export interface NewsArticleWithQuotes {
  id: string;
  headline: string | null;
  source: string | null;
  url: string | null;
  date: string | null;
  snippet: string | null;
  full_text: string | null;
  article_sentiment: number | null;
  category: string | null;
  news_mla_quotes: Array<{
    id: string;
    person_id: string;
    quoted_text: string | null;
    sentiment_score: number | null;
    members: { name: string; party: string | null };
  }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db-types.ts
git commit -m "feat: add category field to NewsArticleWithQuotes type"
```

---

### Task 6: Add category badge to ExpandableNewsCard

**Files:**
- Modify: `src/components/expandable-news-card.tsx`

- [ ] **Step 1: Add import for getCategoryLabel**

At the top of the file, after existing imports:

```typescript
import { getCategoryLabel } from "@/lib/news-categories";
```

- [ ] **Step 2: Add `category` to the article interface**

In the `ExpandableNewsCardProps` interface, add `category` after `article_sentiment`:

```typescript
interface ExpandableNewsCardProps {
  article: {
    id: string;
    headline: string | null;
    source: string | null;
    url: string | null;
    date: string | null;
    snippet: string | null;
    full_text: string | null;
    article_sentiment: number | null;
    category: string | null;
    news_mla_quotes: NewsQuote[];
  };
}
```

- [ ] **Step 3: Add category badge in the metadata row**

In the badge row (after the source Badge and date span, around line 62-73), add the category badge. Insert it right after the source `<Badge>`:

```tsx
<Badge variant="secondary" className="text-xs">
  {article.source}
</Badge>
{article.category && (
  <Badge
    variant="secondary"
    className="text-xs rounded-full bg-zinc-800 text-zinc-400"
  >
    {getCategoryLabel(article.category)}
  </Badge>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/expandable-news-card.tsx
git commit -m "feat: add category badge to news cards"
```

---

### Task 7: Build the news category filter bar and wire up filtering

**Important:** Use the `frontend-design` skill for this task to ensure the chip filter bar meets the editorial dark theme with gold accents and is properly mobile-responsive.

**Files:**
- Create: `src/components/news-category-filter.tsx`
- Modify: `src/app/news/page.tsx`

- [ ] **Step 1: Create the filter chip component**

Create `src/components/news-category-filter.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NEWS_CATEGORIES } from "@/lib/news-categories";

export function NewsCategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "all";

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("category");
    } else {
      params.set("category", key);
    }
    // Reset to page 1 on category change
    params.delete("page");
    router.push(`/news?${params.toString()}`);
  }

  const chipBase =
    "inline-flex items-center whitespace-nowrap rounded-full border px-3 min-h-[36px] text-sm font-medium transition-colors cursor-pointer select-none";
  const chipActive =
    "bg-amber-500/20 text-amber-400 border-amber-500/50";
  const chipInactive =
    "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-300";

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -webkit-overflow-scrolling-touch">
      <button
        onClick={() => select("all")}
        className={`${chipBase} ${active === "all" ? chipActive : chipInactive}`}
      >
        All
      </button>
      {NEWS_CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => select(cat.key)}
          className={`${chipBase} ${active === cat.key ? chipActive : chipInactive}`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update the news page to use filtering**

Replace the contents of `src/app/news/page.tsx` with:

```tsx
import { createServiceClient } from "@/lib/supabase/server";
import type { NewsArticleWithQuotes } from "@/lib/db-types";
import { ExpandableNewsCard } from "@/components/expandable-news-card";
import { NewsCategoryFilter } from "@/components/news-category-filter";
import { CATEGORY_KEYS } from "@/lib/news-categories";

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function NewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  // Validate category param
  const category =
    params.category && CATEGORY_KEYS.includes(params.category as any)
      ? params.category
      : null;

  let query = supabase
    .from("news_mentions")
    .select(
      "*, news_mla_quotes(id, person_id, quoted_text, sentiment_score, members!inner(name, party))",
      { count: "exact" }
    )
    .order("date", { ascending: false })
    .range(from, from + pageSize - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: news, count: totalCount } = await query;

  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);

  // Build pagination URLs preserving category filter
  function pageUrl(p: number) {
    const parts = [`page=${p}`];
    if (category) parts.push(`category=${category}`);
    return `/news?${parts.join("&")}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
        <p className="mt-1 text-muted-foreground">
          NI politics news with MLA quote extraction and sentiment analysis
        </p>
      </div>

      <div className="mb-4">
        <NewsCategoryFilter />
      </div>

      <div className="space-y-4">
        {((news ?? []) as unknown as NewsArticleWithQuotes[]).map(
          (article) => (
            <ExpandableNewsCard key={article.id} article={article} />
          )
        )}

        {(news ?? []).length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            No news articles found for this category.
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={pageUrl(page - 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                Previous
              </a>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={pageUrl(page + 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                Next
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add scrollbar-hide utility if not present**

Check `src/app/globals.css` for a `.scrollbar-hide` utility. If it doesn't exist, add to the end of the file:

```css
/* Hide scrollbar for chip filter rows */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

- [ ] **Step 4: Verify the page loads with no errors**

```bash
cd ~/ni-politics-dashboard && npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/news-category-filter.tsx src/app/news/page.tsx src/app/globals.css
git commit -m "feat: add news category filter bar with mobile-friendly chip UI"
```

---

### Task 8: Run backfill and verify end-to-end

- [ ] **Step 1: Start the dev server**

```bash
cd ~/ni-politics-dashboard && npm run dev
```

- [ ] **Step 2: Run the backfill**

```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/sync/news-backfill
```

Expected: JSON with `processed` count > 0, `failed` count low or 0.

- [ ] **Step 3: Verify categories in the database**

Check the distribution of categories:

```sql
SELECT category, COUNT(*) FROM news_mentions GROUP BY category ORDER BY count DESC;
```

Expected: Most articles categorised, no single category overwhelming unless the data warrants it.

- [ ] **Step 4: Test the filter UI**

Open `http://localhost:3000/news` in a browser:
- Verify "All" chip is gold-highlighted by default
- Click a category chip — articles filter, URL updates with `?category=X`
- Verify pagination works within a filtered category
- Check cards show category badges
- Test on mobile viewport (dev tools responsive mode) — chips scroll horizontally

- [ ] **Step 5: Test the sync route with a new article**

```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/sync/news
```

Verify a newly synced article has a `category` value in the database.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during news categories testing"
```
