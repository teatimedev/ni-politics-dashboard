"use client";

interface SimilarityCell {
  partyA: string;
  partyB: string;
  agreement: number;
}

interface Props {
  parties: { short: string; color: string }[];
  matrix: SimilarityCell[][];
}

function getHeatColor(pct: number): string {
  if (pct >= 80) return "oklch(0.65 0.15 145)"; // strong green
  if (pct >= 65) return "oklch(0.55 0.1 145)";  // muted green
  if (pct >= 50) return "oklch(0.45 0.05 80)";  // neutral gold
  if (pct >= 35) return "oklch(0.4 0.08 30)";   // muted red
  return "oklch(0.35 0.12 25)";                  // strong red
}

export function SimilarityHeatmap({ parties, matrix }: Props) {
  return (
    <div className="overflow-x-auto scrollbar-hide max-w-lg mx-auto">
      <div className="min-w-[280px]">
        {/* Header row */}
        <div className="flex">
          <div className="w-14 shrink-0" />
          {parties.map((p) => (
            <div
              key={p.short}
              className="flex-1 min-w-[32px] text-center"
            >
              <span
                className="text-[10px] font-bold"
                style={{ color: p.color }}
              >
                {p.short}
              </span>
            </div>
          ))}
        </div>

        {/* Matrix rows */}
        {parties.map((rowParty, ri) => (
          <div key={rowParty.short} className="flex items-center">
            <div className="w-14 shrink-0 text-right pr-2">
              <span
                className="text-[10px] font-bold"
                style={{ color: rowParty.color }}
              >
                {rowParty.short}
              </span>
            </div>
            {parties.map((colParty, ci) => {
              const isDiagonal = ri === ci;
              const agreement = matrix[ri]?.[ci]?.agreement ?? 0;

              return (
                <div
                  key={colParty.short}
                  className="flex-1 min-w-[32px] aspect-square flex items-center justify-center m-[1px] rounded-sm relative group"
                  style={{
                    backgroundColor: isDiagonal
                      ? "oklch(1 0 0 / 3%)"
                      : getHeatColor(agreement),
                    opacity: isDiagonal ? 1 : 0.9,
                  }}
                >
                  <span
                    className={`font-mono text-[11px] tabular-nums font-bold ${
                      isDiagonal
                        ? "text-muted-foreground/30"
                        : "text-white"
                    }`}
                  >
                    {isDiagonal ? "—" : `${agreement}`}
                  </span>
                  {/* Tooltip on hover */}
                  {!isDiagonal && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="rounded-md border border-[oklch(1_0_0/12%)] bg-[oklch(0.13_0.005_260)] px-2 py-1 shadow-xl whitespace-nowrap">
                        <p className="text-[10px] text-[oklch(0.93_0.005_80)]">
                          {rowParty.short} ↔ {colParty.short}: {agreement}% agreement
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground mr-1">Low</span>
          {[25, 40, 55, 70, 85].map((v) => (
            <div
              key={v}
              className="h-2.5 w-6 rounded-sm"
              style={{ backgroundColor: getHeatColor(v), opacity: 0.9 }}
            />
          ))}
          <span className="text-[9px] text-muted-foreground ml-1">High</span>
        </div>
      </div>
    </div>
  );
}
