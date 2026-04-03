"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface MonthData {
  month: string;
  label: string;
  count: number;
}

interface Props {
  data: MonthData[];
}

export function VotingActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.12 75)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="oklch(0.82 0.12 75)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(1 0 0 / 6%)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "oklch(0.5 0.01 80)", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "oklch(1 0 0 / 8%)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "oklch(0.5 0.01 80)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.[0]) return null;
            return (
              <div className="rounded-md border border-[oklch(1_0_0/12%)] bg-[oklch(0.13_0.005_260)] px-3 py-2 shadow-xl">
                <p className="text-xs text-[oklch(0.62_0.01_80)]">{label}</p>
                <p className="text-sm font-medium text-[oklch(0.93_0.005_80)]">
                  {payload[0].value} divisions
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="oklch(0.82 0.12 75)"
          strokeWidth={2}
          fill="url(#goldGradient)"
          dot={false}
          activeDot={{
            r: 4,
            fill: "oklch(0.82 0.12 75)",
            stroke: "oklch(0.13 0.005 260)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
