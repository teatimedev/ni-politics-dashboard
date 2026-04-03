# News Categories — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Overview

Add topic-based categorisation to the news feed. Each article gets a single primary category assigned by Groq LLM during sync. The news page gains a horizontally scrollable chip filter bar. Existing articles are backfilled via a one-time script.

## Categories

| Key                | Display Name        |
|--------------------|---------------------|
| `health`           | Health              |
| `economy`          | Economy             |
| `education`        | Education           |
| `justice`          | Justice             |
| `infrastructure`   | Infrastructure      |
| `assembly`         | Assembly            |
| `legacy-identity`  | Legacy & Identity   |
| `environment`      | Environment         |
| `other`            | Other               |

Single category per article. LLM picks the best fit.

## Data Layer

### Schema change

Add column to `news_mentions`:

```sql
ALTER TABLE news_mentions ADD COLUMN category TEXT;
CREATE INDEX idx_news_category ON news_mentions(category);
```

Nullable — `NULL` means uncategorised (pre-backfill). No foreign key; categories are a fixed enum in application code.

### Category constant

Define a shared `NEWS_CATEGORIES` array in `src/lib/constants.ts` (or similar) mapping keys to display names. Used by both the sync route and the frontend.

## LLM Integration

### Sync route changes (`src/app/api/sync/news/route.ts`)

Extend the existing Groq structured output schema:

```typescript
// Add to existing Zod schema
category: z.enum([
  'health', 'economy', 'education', 'justice',
  'infrastructure', 'assembly', 'legacy-identity',
  'environment', 'other'
])
```

Extend the system prompt to instruct the model:

> Classify this article into exactly one category: health, economy, education, justice, infrastructure, assembly, legacy-identity, environment, or other. Pick the single best fit based on the primary topic.

The `category` field is extracted from the LLM response and included in the Supabase insert alongside existing fields. No additional API call — same request that already does quote extraction.

## Backfill

### One-time API route (`src/app/api/sync/news-backfill/route.ts`)

1. Query `news_mentions` where `category IS NULL`, ordered by date desc
2. For each article, send title + snippet (first 500 chars) to Groq with a minimal prompt requesting only `category` (no quote extraction)
3. Update the row with the returned category
4. Process in batches of 10 with a 2-second delay between batches to respect Groq free tier rate limits (30 RPM on free tier)
5. Protected by `CRON_SECRET` bearer token (same as existing sync routes)
6. Returns count of processed/failed articles
7. Route is idempotent — re-running only processes remaining `NULL` rows

After backfill is verified, the route can be deleted.

## Frontend

### Filter bar (`src/app/news/page.tsx`)

Horizontal scrollable chip row placed between the page header and the article list:

- "All" chip on the left, selected by default
- One chip per category in the order listed above
- Selected chip: gold background (`bg-amber-500/20 text-amber-400 border-amber-500/50`), matching the existing editorial gold accent
- Unselected chips: muted dark (`bg-zinc-800/50 text-zinc-400 border-zinc-700`)
- Container: `flex overflow-x-auto gap-2 pb-2` with `scrollbar-hide` for clean mobile scroll
- No wrapping — horizontal scroll only on mobile, chips are naturally small enough to mostly fit on desktop

### Filtering logic

- Selection state managed via `useState` (client component or extracted filter component)
- When a category is selected, the Supabase query adds `.eq('category', selected)`
- "All" removes the filter
- Pagination resets to page 1 on category change

### Article card badge

- Small category badge on `<ExpandableNewsCard />`, displayed below the source badge
- Styled as a subtle pill: `text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400`
- Uses the display name from the category constant map

### Mobile considerations

- Chip row is touch-scrollable with momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Chips have `whitespace-nowrap` and adequate tap targets (`min-h-[36px] px-3`)
- No horizontal overflow issues — contained within page padding

## MLA Profile Page

No changes. The MLA news tab filters by `person_id` via the `news_mla_quotes` junction table, which is orthogonal to article categories.

## Out of Scope

- Multi-category assignment
- User-defined categories or manual re-categorisation
- Category-based analytics or counts on the overview dashboard
- Search within categories
