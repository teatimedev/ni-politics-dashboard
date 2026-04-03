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
