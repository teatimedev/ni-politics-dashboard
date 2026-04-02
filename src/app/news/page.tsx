import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function NewsPage() {
  const supabase = createServiceClient();

  const { data: news } = await supabase
    .from("news_mentions")
    .select("*, news_mla_quotes(id, person_id, quoted_text, sentiment_score, members!inner(name, party))")
    .order("date", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
        <p className="mt-1 text-muted-foreground">
          NI politics news with MLA quote extraction and sentiment analysis
        </p>
      </div>

      <div className="space-y-4">
        {(news ?? []).map((article: any) => {
          const quotes = article.news_mla_quotes ?? [];
          const sentimentClass =
            article.article_sentiment > 0.2
              ? "border-l-green-700/40"
              : article.article_sentiment < -0.2
                ? "border-l-red-700/40"
                : "border-l-border";

          return (
            <div
              key={article.id}
              className={`rounded-lg border border-border bg-card p-4 border-l-4 ${sentimentClass}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-foreground hover:text-accent transition-colors"
                  >
                    {article.headline}
                  </a>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {article.source}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {article.date
                        ? new Date(article.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                    {article.article_sentiment !== null && (
                      <Badge
                        variant="secondary"
                        className={
                          article.article_sentiment > 0.2
                            ? "bg-green-900/30 text-green-400 text-xs"
                            : article.article_sentiment < -0.2
                              ? "bg-red-900/30 text-red-400 text-xs"
                              : "text-xs"
                        }
                      >
                        {article.article_sentiment > 0 ? "+" : ""}
                        {article.article_sentiment?.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {article.snippet && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {article.snippet}
                    </p>
                  )}
                </div>
              </div>

              {/* MLA Quotes */}
              {quotes.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    MLA Statements
                  </p>
                  {quotes.map((q: any) => {
                    const m = q.members;
                    return (
                      <div
                        key={q.id}
                        className="flex items-start gap-2 rounded border border-border/50 bg-muted/30 p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/mla/${q.person_id}`}
                              className="text-sm font-medium text-accent hover:underline"
                            >
                              {m?.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {m?.party}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-foreground/80 italic">
                            &ldquo;{q.quoted_text}&rdquo;
                          </p>
                        </div>
                        {q.sentiment_score !== null && (
                          <Badge
                            variant="secondary"
                            className={
                              q.sentiment_score > 0.2
                                ? "bg-green-900/30 text-green-400 text-xs shrink-0"
                                : q.sentiment_score < -0.2
                                  ? "bg-red-900/30 text-red-400 text-xs shrink-0"
                                  : "text-xs shrink-0"
                            }
                          >
                            {q.sentiment_score > 0 ? "+" : ""}
                            {q.sentiment_score?.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {(news ?? []).length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            No news articles found. Run the news sync to populate.
          </p>
        )}
      </div>
    </div>
  );
}
