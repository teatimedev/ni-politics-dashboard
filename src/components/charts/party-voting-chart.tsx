"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface PartyVoteData {
  party: string;
  short: string;
  aye: number;
  no: number;
  abstained: number;
  color: string;
}

interface Props {
  data: PartyVoteData[];
}

export function PartyVotingChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 30}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
        barGap={0}
        barCategoryGap="24%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(1 0 0 / 6%)"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fill: "oklch(0.5 0.01 80)", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "oklch(1 0 0 / 8%)" }}
        />
        <YAxis
          type="category"
          dataKey="short"
          tick={{ fill: "oklch(0.62 0.01 80)", fontSize: 12, fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          width={58}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload as PartyVoteData;
            const total = d.aye + d.no + d.abstained;
            return (
              <div className="rounded-md border border-[oklch(1_0_0/12%)] bg-[oklch(0.13_0.005_260)] px-3 py-2 shadow-xl">
                <p className="text-sm font-medium text-[oklch(0.93_0.005_80)]">{d.party}</p>
                <div className="mt-1 space-y-0.5 text-xs">
                  <p className="text-emerald-400">Aye: {d.aye} ({((d.aye / total) * 100).toFixed(0)}%)</p>
                  <p className="text-red-400">No: {d.no} ({((d.no / total) * 100).toFixed(0)}%)</p>
                  <p className="text-[oklch(0.62_0.01_80)]">Abstained: {d.abstained}</p>
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="aye" stackId="votes" fill="#34d399" radius={[0, 0, 0, 0]} />
        <Bar dataKey="no" stackId="votes" fill="#f87171" radius={[0, 0, 0, 0]} />
        <Bar dataKey="abstained" stackId="votes" fill="oklch(0.4 0.01 80)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
