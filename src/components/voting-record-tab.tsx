import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

interface VoteWithDivision {
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

interface VotingRecordTabProps {
  votes: VoteWithDivision[];
}

function VoteIcon({ vote }: { vote: string }) {
  switch (vote) {
    case "aye":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "no":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function VoteBadge({ vote }: { vote: string }) {
  const styles: Record<string, string> = {
    aye: "bg-green-900/30 text-green-400",
    no: "bg-red-900/30 text-red-400",
  };

  return (
    <Badge
      variant="secondary"
      className={styles[vote] ?? "bg-muted text-muted-foreground"}
    >
      {vote.toUpperCase()}
    </Badge>
  );
}

export function VotingRecordTab({ votes }: VotingRecordTabProps) {
  if (votes.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No voting records found for this MLA.
      </p>
    );
  }

  const totalVotes = votes.length;
  const ayeCount = votes.filter((v) => v.vote === "aye").length;
  const noCount = votes.filter((v) => v.vote === "no").length;

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">Total votes</p>
          <p className="text-lg font-semibold">{totalVotes}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">Aye</p>
          <p className="text-lg font-semibold text-green-400">{ayeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">No</p>
          <p className="text-lg font-semibold text-red-400">{noCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {votes.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <VoteIcon vote={v.vote} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {v.divisions.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {v.divisions.date} · {v.divisions.ayes}–{v.divisions.noes}
                {v.divisions.outcome?.toLowerCase().includes("carried") ||
                v.divisions.outcome?.toLowerCase().includes("agreed")
                  ? " · Carried"
                  : " · Rejected"}
              </p>
            </div>

            <VoteBadge vote={v.vote} />
          </div>
        ))}
      </div>
    </div>
  );
}
