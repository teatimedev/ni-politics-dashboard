"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PartyData {
  party: string;
  short: string;
  count: number;
  color: string;
}

interface Props {
  data: PartyData[];
}

export function AssemblySeatsChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="short"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as PartyData;
                return (
                  <div className="rounded-md border border-[oklch(1_0_0/12%)] bg-[oklch(0.13_0.005_260)] px-3 py-2 shadow-xl">
                    <p className="text-sm font-medium text-[oklch(0.93_0.005_80)]">{d.party}</p>
                    <p className="text-xs text-[oklch(0.62_0.01_80)]">{d.count} seats</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">seats</span>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
        {data.map((d) => (
          <div key={d.short} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-muted-foreground">
              {d.short}
            </span>
            <span className="text-xs font-medium text-foreground ml-auto tabular-nums">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
