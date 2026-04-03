import Link from "next/link";

interface DivisiveVote {
  divisionId: string;
  title: string;
  date: string;
  ayes: number;
  noes: number;
  margin: number;
  outcome: string;
  nationalistAye: number;
  nationalistNo: number;
  unionistAye: number;
  unionistNo: number;
  otherAye: number;
  otherNo: number;
}

interface Props {
  data: DivisiveVote[];
}

function DesignationBar({
  label,
  aye,
  no,
  color,
}: {
  label: string;
  aye: number;
  no: number;
  color: string;
}) {
  const total = aye + no;
  if (total === 0) return null;
  const ayePct = (aye / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-10 text-right text-muted-foreground shrink-0">
        {label}
      </span>
      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-[oklch(1_0_0/4%)]">
        <div
          className="h-full"
          style={{ width: `${ayePct}%`, backgroundColor: color, opacity: 0.7 }}
        />
        <div
          className="h-full"
          style={{ width: `${100 - ayePct}%`, backgroundColor: "#f87171", opacity: 0.5 }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-10 shrink-0">
        {aye}-{no}
      </span>
    </div>
  );
}

export function DivisiveVotes({ data }: Props) {
  return (
    <div className="space-y-4">
      {data.map((vote) => {
        const passed =
          vote.outcome.toLowerCase().includes("carried") ||
          vote.outcome.toLowerCase().includes("agreed");

        return (
          <div
            key={vote.divisionId}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/divisions`}
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-2"
                >
                  {vote.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {vote.date}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                  {vote.ayes}–{vote.noes}
                </span>
                <p className={`text-[10px] font-medium ${passed ? "text-emerald-400" : "text-red-400"}`}>
                  {passed ? "CARRIED" : "REJECTED"}
                  <span className="text-muted-foreground"> · margin {vote.margin}</span>
                </p>
              </div>
            </div>

            {/* Designation breakdown */}
            <div className="space-y-1 mt-3 pt-3 border-t border-border">
              <DesignationBar label="Nat" aye={vote.nationalistAye} no={vote.nationalistNo} color="#326932" />
              <DesignationBar label="Uni" aye={vote.unionistAye} no={vote.unionistNo} color="#1b2a5b" />
              <DesignationBar label="Other" aye={vote.otherAye} no={vote.otherNo} color="#d4a843" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
