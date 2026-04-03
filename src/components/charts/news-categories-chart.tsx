"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface CategoryData {
  category: string;
  label: string;
  count: number;
}

interface Props {
  data: CategoryData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  health: "#f87171",
  economy: "#34d399",
  education: "#60a5fa",
  justice: "#c084fc",
  infrastructure: "#fb923c",
  assembly: "oklch(0.82 0.12 75)",
  "legacy-identity": "#f472b6",
  environment: "#4ade80",
  other: "oklch(0.5 0.01 80)",
};

export function NewsCategoriesChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(1 0 0 / 6%)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "oklch(0.5 0.01 80)", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "oklch(1 0 0 / 8%)" }}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fill: "oklch(0.5 0.01 80)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload as CategoryData;
            return (
              <div className="rounded-md border border-[oklch(1_0_0/12%)] bg-[oklch(0.13_0.005_260)] px-3 py-2 shadow-xl">
                <p className="text-sm font-medium text-[oklch(0.93_0.005_80)]">{d.label}</p>
                <p className="text-xs text-[oklch(0.62_0.01_80)]">{d.count} articles</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category] ?? "oklch(0.5 0.01 80)"}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
