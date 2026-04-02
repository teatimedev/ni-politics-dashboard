"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getDesignationHex } from "@/lib/party-colours";

interface VoteBreakdownChartProps {
  nationalistAyes: number;
  unionistAyes: number;
  otherAyes: number;
  nationalistNoes: number;
  unionistNoes: number;
  otherNoes: number;
}

export function VoteBreakdownChart({
  nationalistAyes,
  unionistAyes,
  otherAyes,
  nationalistNoes,
  unionistNoes,
  otherNoes,
}: VoteBreakdownChartProps) {
  const data = [
    {
      vote: "Aye",
      Nationalist: nationalistAyes,
      Unionist: unionistAyes,
      Other: otherAyes,
    },
    {
      vote: "No",
      Nationalist: nationalistNoes,
      Unionist: unionistNoes,
      Other: otherNoes,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} layout="vertical" barCategoryGap="20%">
        <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="vote"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#121218",
            border: "1px solid #27272a",
            borderRadius: "0.5rem",
            color: "#e4e4e7",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
        <Bar
          dataKey="Nationalist"
          stackId="a"
          fill={getDesignationHex("Nationalist")}
        />
        <Bar
          dataKey="Unionist"
          stackId="a"
          fill={getDesignationHex("Unionist")}
        />
        <Bar
          dataKey="Other"
          stackId="a"
          fill={getDesignationHex("Other")}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
