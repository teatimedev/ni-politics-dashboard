"use client";

interface DesignationData {
  totalDivisions: number;
  alignedCount: number;
  alignedPct: number;
  splitCount: number;
  splitPct: number;
  nationalistWins: number;
  unionistWins: number;
  otherDecides: number;
}

interface Props {
  data: DesignationData;
}

export function DesignationAnalysis({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Overall alignment */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Cross-community agreement
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-[oklch(1_0_0/4%)]">
          <div
            className="h-full flex items-center justify-center"
            style={{
              width: `${data.alignedPct}%`,
              backgroundColor: "oklch(0.65 0.15 145 / 60%)",
            }}
          >
            {data.alignedPct > 15 && (
              <span className="font-mono text-[10px] font-bold text-white">
                {data.alignedPct}% aligned
              </span>
            )}
          </div>
          <div
            className="h-full flex items-center justify-center"
            style={{
              width: `${data.splitPct}%`,
              backgroundColor: "oklch(0.45 0.12 25 / 60%)",
            }}
          >
            {data.splitPct > 15 && (
              <span className="font-mono text-[10px] font-bold text-white">
                {data.splitPct}% split
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Nationalist and Unionist blocs voted the same way in {data.alignedCount} of {data.totalDivisions} divisions
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-[oklch(1_0_0/2%)] p-3 text-center">
          <p className="font-mono text-xl font-bold text-foreground tabular-nums">
            {data.nationalistWins}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Nat majority
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            won without Uni
          </p>
        </div>
        <div className="rounded-lg border border-border bg-[oklch(1_0_0/2%)] p-3 text-center">
          <p className="font-mono text-xl font-bold text-foreground tabular-nums">
            {data.unionistWins}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Uni majority
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            won without Nat
          </p>
        </div>
        <div className="rounded-lg border border-border bg-[oklch(1_0_0/2%)] p-3 text-center">
          <p className="font-mono text-xl font-bold text-[oklch(0.82_0.12_75)] tabular-nums">
            {data.otherDecides}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Other decides
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            casting vote bloc
          </p>
        </div>
      </div>
    </div>
  );
}
