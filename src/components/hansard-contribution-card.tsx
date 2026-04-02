import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { HansardContribution, Member } from "@/lib/types";

interface HansardContributionCardProps {
  contribution: HansardContribution;
  member?: Pick<Member, "person_id" | "name" | "party" | "photo_url">;
  showDebateTitle?: boolean;
}

function getSentimentClass(score: number | null): string {
  if (score === null) return "";
  if (score >= 0.3) return "border-l-green-700/40";
  if (score <= -0.3) return "border-l-red-700/40";
  return "border-l-zinc-600/40";
}

export function HansardContributionCard({
  contribution,
  member,
  showDebateTitle = false,
}: HansardContributionCardProps) {
  const sentimentClass = getSentimentClass(contribution.sentiment_score);

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 border-l-4 ${sentimentClass || "border-l-border"}`}
    >
      <div className="mb-2 flex items-center gap-3">
        {member?.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            ?
          </div>
        )}
        <div className="flex-1 min-w-0">
          {member ? (
            <Link
              href={`/mla/${member.person_id}`}
              className="font-medium text-accent hover:underline"
            >
              {member.name}
            </Link>
          ) : (
            <span className="font-medium text-muted-foreground">
              Unknown Member
            </span>
          )}
          {member?.party && (
            <span className="ml-2 text-xs text-muted-foreground">
              {member.party}
            </span>
          )}
        </div>
        <time className="text-xs text-muted-foreground">
          {contribution.date}
        </time>
      </div>

      {showDebateTitle && contribution.debate_title && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {contribution.debate_title}
        </p>
      )}

      <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
        {contribution.content}
      </div>

      {contribution.sentiment_score !== null && (
        <div className="mt-2 flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            Sentiment: {contribution.sentiment_score > 0 ? "+" : ""}
            {contribution.sentiment_score.toFixed(2)}
          </Badge>
        </div>
      )}
    </div>
  );
}
