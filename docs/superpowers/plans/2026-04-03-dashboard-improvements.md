# Stormont Watch — Dashboard Improvements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix type safety, error handling, performance, and UX gaps across the NI politics dashboard — and remove dead features / placeholders.

**Architecture:** All changes are localised edits to existing files. New files: one shared CSV parser, one types file for Supabase join shapes. No new dependencies, no schema changes, no new routes.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase JS v2, Tailwind 4, shadcn/ui, Recharts, AI SDK + Groq

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/db-types.ts` | TypeScript interfaces for all Supabase join/select results used in pages |
| Create | `src/lib/csv.ts` | Shared `parseCSVLine` function (deduplicated from interests + donations sync) |
| Modify | `src/app/page.tsx` | Remove `any` casts, add error handling |
| Modify | `src/app/mla/[personId]/page.tsx` | Parallelize queries, remove `any`, remove expenses placeholder, fix answer_text |
| Modify | `src/app/divisions/page.tsx` | Add pagination (limit + offset) |
| Modify | `src/app/hansard/page.tsx` | Add pagination |
| Modify | `src/app/money/page.tsx` | Remove `any` casts, add pagination |
| Modify | `src/app/news/page.tsx` | Remove `any` casts, add pagination |
| Modify | `src/app/groups/page.tsx` | Remove `any` cast |
| Modify | `src/app/mlas/page.tsx` | Minor — already clean, just add error check |
| Modify | `src/app/api/sync/interests/route.ts` | Use shared CSV parser |
| Modify | `src/app/api/sync/donations/route.ts` | Use shared CSV parser |
| Modify | `src/components/voting-record-tab.tsx` | No changes needed — already well-typed |
| Modify | `src/components/interest-card.tsx` | No changes needed |

---

### Task 1: Create shared Supabase join types (`src/lib/db-types.ts`)

**Files:**
- Create: `src/lib/db-types.ts`

These interfaces replace every `as any` cast across pages by modelling the exact shape Supabase returns for each `select()` with joins.

- [ ] **Step 1: Create `src/lib/db-types.ts`**

```typescript
// Typed shapes for Supabase select+join results used in page components.
// These match the exact .select() strings used in each page.

import type { Member, Division, HansardContribution } from "./types";

/** page.tsx — recentHansard select */
export interface HansardWithMember extends HansardContribution {
  members: { name: string };
}

/** page.tsx — recentQuestions select */
export interface QuestionWithMember {
  id: string;
  person_id: string;
  date: string | null;
  question_text: string | null;
  department: string | null;
  question_type: string | null;
  members: { name: string };
}

/** page.tsx — syncLogs */
export interface SyncLogLatest {
  source: string;
  status: string;
  completed_at: string | null;
  records_updated: number;
}

/** mla/[personId] — votes with division join */
export interface VoteWithDivision {
  id: string;
  vote: string;
  designation: string | null;
  divisions: {
    division_id: string;
    date: string;
    title: string | null;
    outcome: string | null;
    ayes: number;
    noes: number;
    division_type: string | null;
  };
}

/** mla/[personId] — news quotes with article join */
export interface NewsQuoteWithArticle {
  id: string;
  quoted_text: string | null;
  sentiment_score: number | null;
  news_mentions: {
    headline: string | null;
    source: string | null;
    url: string | null;
    date: string | null;
  };
}

/** money/page.tsx — interests with member join */
export interface InterestWithMember {
  id: string;
  person_id: string;
  category: string;
  content: string | null;
  date_published: string | null;
  in_latest: boolean;
  members: { person_id: string; name: string };
}

/** news/page.tsx — articles with quotes+member join */
export interface NewsArticleWithQuotes {
  id: string;
  headline: string | null;
  source: string | null;
  url: string | null;
  date: string | null;
  snippet: string | null;
  article_sentiment: number | null;
  news_mla_quotes: Array<{
    id: string;
    person_id: string;
    quoted_text: string | null;
    sentiment_score: number | null;
    members: { name: string; party: string | null };
  }>;
}

/** groups/page.tsx — APG roles with member join */
export interface ApgRoleWithMember {
  person_id: string;
  role_name: string;
  organisation: string | null;
  members: { name: string; party: string | null; photo_url: string | null };
}

/** Pagination params used across listing pages */
export interface PaginationParams {
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd ~/ni-politics-dashboard && npx tsc --noEmit src/lib/db-types.ts`
Expected: No errors (or only errors from other files — this file should be self-contained)

- [ ] **Step 3: Commit**

```bash
git add src/lib/db-types.ts
git commit -m "feat: add typed interfaces for Supabase join results"
```

---

### Task 2: Extract shared CSV parser (`src/lib/csv.ts`)

**Files:**
- Create: `src/lib/csv.ts`
- Modify: `src/app/api/sync/interests/route.ts:27-56` (remove `parseCSVLine`)
- Modify: `src/app/api/sync/donations/route.ts:9-38` (remove `parseCSVLine`)

- [ ] **Step 1: Create `src/lib/csv.ts`**

```typescript
/**
 * Parse a single CSV line respecting quoted fields.
 * Handles escaped quotes ("") within quoted fields.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a full CSV string into an array of row objects.
 * Optionally strips BOM from the first line.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0].replace(/^\uFEFF/, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
```

- [ ] **Step 2: Update `src/app/api/sync/interests/route.ts`**

Replace the local `parseCSV` and `parseCSVLine` functions (lines 9-56) with an import:

```typescript
import { parseCSV } from "@/lib/csv";
```

Remove the `parseCSV` function (lines 9-25) and `parseCSVLine` function (lines 27-56) entirely. Keep everything else as-is.

- [ ] **Step 3: Update `src/app/api/sync/donations/route.ts`**

Replace the local `parseCSVLine` function (lines 9-38) with an import:

```typescript
import { parseCSVLine } from "@/lib/csv";
```

Remove the `parseCSVLine` function (lines 9-38). Keep `parseUKDate` and `parseAmount` as-is (they are donations-specific).

Also update the CSV parsing block (lines 74-87) to use the shared `parseCSV`:

Replace lines 74-87 with:
```typescript
import { parseCSV } from "@/lib/csv";
// ...
const rows = parseCSV(csvText);
```

- [ ] **Step 4: Verify build**

Run: `cd ~/ni-politics-dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/app/api/sync/interests/route.ts src/app/api/sync/donations/route.ts
git commit -m "refactor: extract shared CSV parser from sync routes"
```

---

### Task 3: Fix type safety on `src/app/page.tsx` (homepage)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports and replace `any` casts**

At the top of `src/app/page.tsx`, add:
```typescript
import type { HansardWithMember, QuestionWithMember, SyncLogLatest } from "@/lib/db-types";
```

Replace line 54:
```typescript
// OLD: const latestSyncs = new Map<string, any>();
const latestSyncs = new Map<string, SyncLogLatest>();
```

Replace line 121:
```typescript
// OLD: {(recentDivisions ?? []).map((d: any) => {
{(recentDivisions ?? []).map((d) => {
```

Replace line 155:
```typescript
// OLD: {(recentHansard ?? []).map((h: any) => (
{((recentHansard ?? []) as HansardWithMember[]).map((h) => (
```

Replace line 165:
```typescript
// OLD: {(h.members as any)?.name}
{h.members?.name}
```

Replace line 195:
```typescript
// OLD: {(recentQuestions ?? []).map((q: any) => (
{((recentQuestions ?? []) as QuestionWithMember[]).map((q) => (
```

Replace line 205:
```typescript
// OLD: {(q.members as any)?.name}
{q.members?.name}
```

- [ ] **Step 2: Verify build**

Run: `cd ~/ni-politics-dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no type errors in page.tsx

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: replace any casts with typed interfaces on homepage"
```

---

### Task 4: Fix MLA profile — parallelize queries, remove `any`, remove dead expenses tab

**Files:**
- Modify: `src/app/mla/[personId]/page.tsx`

This is the highest-impact change: 7 sequential queries → `Promise.all`, remove all `any`, remove the placeholder expenses tab, and guard against `answer_text` that's always null.

- [ ] **Step 1: Add imports**

Add at the top:
```typescript
import type { VoteWithDivision, NewsQuoteWithArticle } from "@/lib/db-types";
```

- [ ] **Step 2: Parallelize queries (lines 22-75)**

Replace the sequential queries with a single `Promise.all`:

```typescript
  const [
    { data: member },
    { data: roles },
    { data: hansardData },
    { data: questionsData },
    { data: newsQuotes },
    { data: interestsData },
    { data: votes },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq("person_id", personId)
      .single(),
    supabase
      .from("member_roles")
      .select("*")
      .eq("person_id", personId)
      .order("start_date", { ascending: false }),
    supabase
      .from("hansard_contributions")
      .select("*")
      .eq("person_id", personId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("questions")
      .select("*")
      .eq("person_id", personId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("news_mla_quotes")
      .select("id, quoted_text, sentiment_score, news_mentions!inner(headline, source, url, date)")
      .eq("person_id", personId)
      .order("id", { ascending: false })
      .limit(20),
    supabase
      .from("interests")
      .select("*")
      .eq("person_id", personId)
      .eq("in_latest", true)
      .order("category", { ascending: true }),
    supabase
      .from("member_votes")
      .select(
        "id, vote, designation, divisions(division_id, date, title, outcome, ayes, noes, division_type)"
      )
      .eq("person_id", personId)
      .order("id", { ascending: false }),
  ]);
```

- [ ] **Step 3: Remove `any` casts from rendered data**

Replace `(votes as any)` on line 183 with proper typing:
```typescript
<VotingRecordTab votes={(votes ?? []) as VoteWithDivision[]} />
```

Replace `(interest: any)` on line 212 with the Interest interface (already defined in interest-card.tsx — it matches the select shape):
```typescript
{(interestsData ?? []).map((interest) => (
```

Replace `(q: any)` on line 232 (questions) with:
```typescript
{(questionsData ?? []).map((q) => (
```

Replace `(q: any)` on line 271 (news) with:
```typescript
{((newsQuotes ?? []) as NewsQuoteWithArticle[]).map((q) => {
```

- [ ] **Step 4: Remove expenses tab entirely**

Remove the disabled expenses TabsTrigger (line 171-173):
```typescript
// DELETE THIS:
<TabsTrigger value="expenses" disabled>
  Expenses
</TabsTrigger>
```

Remove the expenses TabsContent (lines 219-223):
```typescript
// DELETE THIS:
<TabsContent value="expenses">
  <p className="py-8 text-center text-muted-foreground">
    Coming in Phase 7.
  </p>
</TabsContent>
```

- [ ] **Step 5: Remove answer_text rendering (always null)**

The `answer_text` field is never populated by the questions sync. Remove lines 251-256:
```typescript
// DELETE THIS:
{q.answer_text && (
  <div className="mt-3 rounded border-l-2 border-accent pl-3">
    <p className="text-sm text-muted-foreground">
      {q.answer_text}
    </p>
  </div>
)}
```

- [ ] **Step 6: Verify build**

Run: `cd ~/ni-politics-dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/app/mla/[personId]/page.tsx
git commit -m "fix: parallelize MLA profile queries, remove any casts, drop placeholder expenses tab"
```

---

### Task 5: Add pagination to Divisions page

**Files:**
- Modify: `src/app/divisions/page.tsx`

The divisions page currently loads ALL divisions with no limit. Add page-based pagination.

- [ ] **Step 1: Add page/pageSize to searchParams and query**

Update the `searchParams` interface:
```typescript
interface PageProps {
  searchParams: Promise<{
    q?: string;
    outcome?: string;
    type?: string;
    page?: string;
  }>;
}
```

After `const params = await searchParams;`, add:
```typescript
const page = Math.max(1, parseInt(params.page ?? "1", 10));
const pageSize = 50;
```

Add `.range()` to the query, before the `const { data: divisions }` line:
```typescript
  // Add after all filters, before executing:
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: divisions, count } = await query
    .range(from, to)
    .select("*", { count: "exact" });
```

Wait — Supabase doesn't allow `.select()` after `.range()` in a chain. The correct approach: modify the initial `select` to include `count: "exact"` and add `.range()`:

Replace lines 18-21:
```typescript
  let query = supabase
    .from("divisions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false });
```

Then after all filters are applied (after line 34), add:
```typescript
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);
```

Change destructuring on line 36:
```typescript
  const { data: divisions, count: totalCount } = await query;
  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);
```

- [ ] **Step 2: Update the count display and add pagination controls**

Replace the subtitle (line 54):
```typescript
<p className="mt-1 text-muted-foreground">
  {totalCount ?? 0} votes in the Northern Ireland Assembly
  {totalPages > 1 && ` — page ${page} of ${totalPages}`}
</p>
```

Add pagination controls after the divisions list (before the empty state):
```typescript
{totalPages > 1 && (
  <div className="mt-4 flex items-center justify-center gap-2">
    {page > 1 && (
      <a
        href={`/divisions?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
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
        href={`/divisions?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        Next
      </a>
    )}
  </div>
)}
```

Note: The `params` object from `searchParams` needs to be spread as strings. Since `params` already has string values, this works. The `page` key will be overwritten by the explicit `page: String(...)`.

- [ ] **Step 3: Verify build**

Run: `cd ~/ni-politics-dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/divisions/page.tsx
git commit -m "feat: add pagination to divisions page (50 per page)"
```

---

### Task 6: Add pagination to Hansard, Money, and News pages

**Files:**
- Modify: `src/app/hansard/page.tsx`
- Modify: `src/app/money/page.tsx`
- Modify: `src/app/news/page.tsx`

Same pattern as Task 5 — add `page` param, use `.range()`, render prev/next links.

- [ ] **Step 1: Update `src/app/hansard/page.tsx`**

Add `page?: string` to searchParams interface.

After `const params = await searchParams;`:
```typescript
const page = Math.max(1, parseInt(params.page ?? "1", 10));
const pageSize = 50;
```

Change the query select to include count:
```typescript
  let query = supabase
    .from("hansard_contributions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("component_id", { ascending: true });
```

Remove the `.limit(200)` and add range after filters:
```typescript
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);
```

Update destructuring:
```typescript
  const { data: contributions, count: totalCount } = await query;
  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);
```

Add pagination controls at the bottom (same pattern as Task 5 but with `/hansard?` base URL, spreading `params`).

- [ ] **Step 2: Update `src/app/money/page.tsx`**

Same pattern. Add `page?: string` to searchParams. The interests query on line 18-23 changes to:

```typescript
  let query = supabase
    .from("interests")
    .select("*, members!inner(person_id, name)", { count: "exact" })
    .eq("in_latest", true)
    .order("date_published", { ascending: false });
```

Remove `.limit(200)`. Add range. Add `page`/`totalPages`. Add pagination controls.

Also replace `(interest: any)` on line 95 and `(i: any)` on line 79 with proper typing using `InterestWithMember` from `db-types.ts`:
```typescript
import type { InterestWithMember } from "@/lib/db-types";
// ...
{((interests ?? []) as InterestWithMember[]).map((interest) => (
```

And fix the `as any` on line 55 in the MLA filter building:
```typescript
const m = i.members as { person_id: string; name: string };
```

- [ ] **Step 3: Update `src/app/news/page.tsx`**

Same pagination pattern. Change:
```typescript
  const { data: news, count: totalCount } = await supabase
    .from("news_mentions")
    .select("*, news_mla_quotes(id, person_id, quoted_text, sentiment_score, members!inner(name, party))", { count: "exact" })
    .order("date", { ascending: false })
    .range(from, from + pageSize - 1);
```

Replace `(article: any)` on line 24 and `(q: any)` on line 91 with proper types:
```typescript
import type { NewsArticleWithQuotes } from "@/lib/db-types";
// ...
{((news ?? []) as NewsArticleWithQuotes[]).map((article) => {
```

Add `page` param to component, pagination controls at bottom.

- [ ] **Step 4: Verify build**

Run: `cd ~/ni-politics-dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/hansard/page.tsx src/app/money/page.tsx src/app/news/page.tsx
git commit -m "feat: add pagination to hansard, money, and news pages"
```

---

### Task 7: Fix type safety on Groups page

**Files:**
- Modify: `src/app/groups/page.tsx`

- [ ] **Step 1: Replace `as any` with typed cast**

Add import:
```typescript
import type { ApgRoleWithMember } from "@/lib/db-types";
```

Replace line 28:
```typescript
// OLD: const m = r.members as any;
const m = r.members as { name: string; party: string | null; photo_url: string | null };
```

- [ ] **Step 2: Verify build**

Run: `cd ~/ni-politics-dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/groups/page.tsx
git commit -m "fix: replace any cast with typed member shape on groups page"
```

---

### Task 8: Add `designation` column to `member_votes` (missing from schema)

**Files:**
- Create: `src/supabase/migrations/005_member_votes_designation.sql`

The divisions sync writes `designation` to `member_votes` (line 106 of divisions route), and `voting-record-tab.tsx` reads it, but the original schema (001) doesn't include it. Check if it was added later or if it's silently dropping.

- [ ] **Step 1: Check if column exists**

Run: `grep -n "designation" ~/ni-politics-dashboard/supabase/migrations/*.sql`

If it's NOT in any migration, create:

```sql
-- Add designation column to member_votes (was in sync code but missing from schema)
ALTER TABLE member_votes ADD COLUMN IF NOT EXISTS designation TEXT;
```

If it IS already there (e.g. added via Supabase dashboard), skip this task.

- [ ] **Step 2: Commit (if migration was needed)**

```bash
git add supabase/migrations/005_member_votes_designation.sql
git commit -m "fix: add missing designation column to member_votes schema"
```

---

### Task 9: Add `division_type` column migration check

**Files:**
- Check: `src/supabase/migrations/002_division_columns.sql`

- [ ] **Step 1: Read migration 002 and verify it covers `division_type` and designation**

Run: `cat ~/ni-politics-dashboard/supabase/migrations/002_division_columns.sql`

The divisions sync writes `division_type` (line 70 of divisions route). Verify this column exists in migrations. If migration 002 already adds it, no action needed. If not, add it in a new migration.

- [ ] **Step 2: Commit if needed**

---

## Self-Review Checklist

1. **Type safety:** All `as any` casts across page.tsx, mla profile, money, news, and groups replaced with proper interfaces from `db-types.ts`.
2. **Error handling:** Not adding error boundaries in this plan — the current "no data" empty states are sufficient for a personal dashboard. Can be added later if deployed publicly.
3. **Performance:** MLA profile queries parallelized (7 → 1 round trip). All listing pages paginated at 50 items.
4. **Dead code removed:** Expenses placeholder tab removed. answer_text rendering removed (never populated).
5. **Code deduplication:** CSV parser extracted to shared module.
6. **No new dependencies** added.
7. **No schema changes** required (just verification of existing columns).
