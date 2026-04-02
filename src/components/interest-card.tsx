import { Badge } from "@/components/ui/badge";

interface Interest {
  id: string;
  person_id: string;
  category: string;
  content: string | null;
  date_published: string | null;
  in_latest: boolean;
}

interface InterestCardProps {
  interest: Interest;
  showMember?: { name: string; person_id: string } | null;
}

const CATEGORY_COLOURS: Record<string, string> = {
  "Donations and other support": "bg-amber-900/30 text-amber-400",
  "Employment and Earnings": "bg-blue-900/30 text-blue-400",
  "Gifts, benefits and hospitality": "bg-purple-900/30 text-purple-400",
  "Land and Property": "bg-green-900/30 text-green-400",
  Shareholdings: "bg-cyan-900/30 text-cyan-400",
  Visits: "bg-rose-900/30 text-rose-400",
  "Unremunerated interests": "bg-zinc-800/50 text-zinc-400",
  Miscellaneous: "bg-zinc-800/50 text-zinc-400",
  "Family members who benefit from Office Cost Expenditure":
    "bg-orange-900/30 text-orange-400",
};

export function InterestCard({ interest, showMember }: InterestCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <Badge
          variant="secondary"
          className={
            CATEGORY_COLOURS[interest.category] ??
            "bg-zinc-800/50 text-zinc-400"
          }
        >
          {interest.category}
        </Badge>
        {showMember && (
          <a
            href={`/mla/${showMember.person_id}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            {showMember.name}
          </a>
        )}
        {interest.date_published && (
          <span className="text-xs text-muted-foreground ml-auto">
            Published: {interest.date_published}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">
        {interest.content}
      </p>
    </div>
  );
}
