"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VoteBreakdownChart } from "@/components/vote-breakdown-chart";
import type { Division } from "@/lib/types";

interface DivisionRowProps {
  division: Division;
}

export function DivisionRow({ division }: DivisionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const passed =
    division.outcome?.toLowerCase().includes("carried") ||
    division.outcome?.toLowerCase().includes("agreed");

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
          {division.title}
        </span>

        <Badge variant="secondary" className="shrink-0 text-xs">
          {division.division_type ?? "Vote"}
        </Badge>

        <span className="shrink-0 text-xs text-muted-foreground w-24 text-right">
          {division.date}
        </span>

        {passed ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
        )}

        <span className="shrink-0 text-xs text-muted-foreground w-20 text-right">
          {division.ayes}–{division.noes}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-11 space-y-3">
          {division.motion_text && (
            <p className="text-sm text-muted-foreground">
              {division.motion_text}
            </p>
          )}

          <p className="text-sm">
            <span className="text-muted-foreground">Outcome: </span>
            <span className={passed ? "text-green-400" : "text-red-400"}>
              {division.outcome}
            </span>
          </p>

          <div className="max-w-md">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Vote breakdown by designation
            </p>
            <VoteBreakdownChart
              nationalistAyes={division.nationalist_ayes}
              unionistAyes={division.unionist_ayes}
              otherAyes={division.other_ayes}
              nationalistNoes={division.nationalist_noes}
              unionistNoes={division.unionist_noes}
              otherNoes={division.other_noes}
            />
          </div>
        </div>
      )}
    </div>
  );
}
