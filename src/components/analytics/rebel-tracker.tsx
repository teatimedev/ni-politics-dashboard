import Link from "next/link";

interface Rebel {
  personId: string;
  name: string;
  party: string;
  partyShort: string;
  partyColor: string;
  rebelVotes: number;
  totalVotes: number;
  rebelPct: number;
}

interface Props {
  data: Rebel[];
}

export function RebelTracker({ data }: Props) {
  return (
    <div className="space-y-2.5">
      {data.map((rebel, i) => (
        <div
          key={rebel.personId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <span className="font-mono text-[10px] text-muted-foreground/50 w-4 text-right shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/mla/${rebel.personId}`}
                className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate"
              >
                {rebel.name}
              </Link>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                style={{
                  backgroundColor: rebel.partyColor + "30",
                  color: rebel.partyColor,
                }}
              >
                {rebel.partyShort}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-[oklch(1_0_0/4%)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${rebel.rebelPct}%`,
                    backgroundColor: rebel.rebelPct > 15 ? "#f87171" : rebel.rebelPct > 8 ? "#fb923c" : "oklch(0.82 0.12 75)",
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                {rebel.rebelPct}%
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-xs tabular-nums text-red-400">
              {rebel.rebelVotes}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              /{rebel.totalVotes}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
