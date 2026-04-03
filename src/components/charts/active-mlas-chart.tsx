"use client";

import Link from "next/link";

interface MlaActivity {
  personId: string;
  name: string;
  party: string;
  partyShort: string;
  color: string;
  hansard: number;
  questions: number;
  votes: number;
  score: number;
}

interface Props {
  data: MlaActivity[];
}

export function ActiveMlasChart({ data }: Props) {
  const maxScore = Math.max(...data.map((d) => d.score));

  return (
    <div className="space-y-2.5">
      {data.map((mla, i) => {
        const pct = (mla.score / maxScore) * 100;
        return (
          <div key={mla.personId} className="group">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 text-[10px] tabular-nums text-muted-foreground text-right">
                {i + 1}
              </span>
              <Link
                href={`/mla/${mla.personId}`}
                className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate flex-1"
              >
                {mla.name}
              </Link>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: mla.color + "30", color: mla.color }}
              >
                {mla.partyShort}
              </span>
            </div>
            <div className="ml-6 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-[oklch(1_0_0/4%)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: mla.color,
                    opacity: 0.7,
                  }}
                />
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground text-right shrink-0 hidden sm:flex gap-2">
                <span>{mla.hansard} debates</span>
                <span>{mla.questions} Qs</span>
                <span>{mla.votes} votes</span>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0 sm:hidden">
                {mla.score}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
