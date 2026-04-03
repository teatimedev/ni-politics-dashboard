import { createServiceClient } from "@/lib/supabase/server";
import type { NewsArticleWithQuotes } from "@/lib/db-types";
import { ExpandableNewsCard } from "@/components/expandable-news-card";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function NewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const { data: news, count: totalCount } = await supabase
    .from("news_mentions")
    .select("*, news_mla_quotes(id, person_id, quoted_text, sentiment_score, members!inner(name, party))", { count: "exact" })
    .order("date", { ascending: false })
    .range(from, from + pageSize - 1);

  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
        <p className="mt-1 text-muted-foreground">
          NI politics news with MLA quote extraction and sentiment analysis
        </p>
      </div>

      <div className="space-y-4">
        {((news ?? []) as unknown as NewsArticleWithQuotes[]).map((article) => (
          <ExpandableNewsCard key={article.id} article={article} />
        ))}

        {(news ?? []).length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            No news articles found. Run the news sync to populate.
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={`/news?page=${page - 1}`}
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
                href={`/news?page=${page + 1}`}
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
