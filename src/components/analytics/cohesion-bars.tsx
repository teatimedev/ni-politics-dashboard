"use client";

interface PartyScore {
  party: string;
  short: string;
  color: string;
  cohesion: number;
  unanimousCount: number;
  totalDivisions: number;
}

interface Props {
  data: PartyScore[];
}

export function CohesionBars({ data }: Props) {
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.short}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm font-medium text-foreground">
                {d.short}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {d.cohesion}%
              </span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                ({d.unanimousCount}/{d.totalDivisions})
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-[oklch(1_0_0/4%)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${d.cohesion}%`,
                backgroundColor: d.color,
                opacity: 0.75,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
