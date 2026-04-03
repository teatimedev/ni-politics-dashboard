"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCategoryLabel, getCategoryColor } from "@/lib/news-categories";

interface NewsQuote {
  id: string;
  person_id: string;
  quoted_text: string | null;
  sentiment_score: number | null;
  members: { name: string; party: string | null };
}

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

export function ExpandableNewsCard({ article }: ExpandableNewsCardProps) {
  const [expanded, setExpanded] = useState(false);

  const quotes = article.news_mla_quotes ?? [];
  const sentiment = article.article_sentiment ?? 0;
  const sentimentClass =
    sentiment > 0.2
      ? "border-l-green-700/40"
      : sentiment < -0.2
        ? "border-l-red-700/40"
        : "border-l-border";

  const hasFullText = !!article.full_text;
  const canExpand = hasFullText || article.snippet;

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 border-l-4 ${sentimentClass}`}
    >
      <div className="flex items-start gap-3 overflow-hidden">
        <div className="flex-1 min-w-0">
          {/* Headline — clickable to expand if we have content */}
          <button
            onClick={() => canExpand && setExpanded(!expanded)}
            className="text-left w-full"
          >
            <span className="text-lg font-semibold text-foreground hover:text-accent transition-colors break-words">
              {article.headline}
            </span>
          </button>

          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {article.source}
            </Badge>
            {article.category && (
              <span
                className="inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: getCategoryColor(article.category) + "18",
                  color: getCategoryColor(article.category),
                }}
              >
                {getCategoryLabel(article.category)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {article.date
                ? new Date(article.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : ""}
            </span>
            {article.article_sentiment !== null && article.article_sentiment !== 0 && (
              <Badge
                variant="secondary"
                className={
                  sentiment > 0.2
                    ? "bg-green-900/30 text-green-400 text-xs"
                    : sentiment < -0.2
                      ? "bg-red-900/30 text-red-400 text-xs"
                      : "text-xs"
                }
              >
                {sentiment > 0 ? "+" : ""}
                {sentiment.toFixed(2)}
              </Badge>
            )}
            {canExpand && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? (
                  <>
                    Collapse <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Collapsed: show snippet */}
          {!expanded && article.snippet && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {article.snippet}
            </p>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t border-border pt-3 space-y-3">
          {/* Full article text */}
          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line max-h-96 overflow-y-auto">
            {article.full_text ?? article.snippet}
          </div>

          {/* Link to original */}
          <a
            href={article.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Read on {article.source} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* MLA Quotes — always visible */}
      {quotes.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            MLA Statements
          </p>
          {quotes.map((q) => {
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
}
