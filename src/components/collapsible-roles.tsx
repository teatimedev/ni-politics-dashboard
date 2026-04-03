"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  rolesByType: Record<string, { id: string; role_name: string; organisation: string | null }[]>;
}

export function CollapsibleRoles({ rolesByType }: Props) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(rolesByType);
  const visibleEntries = expanded ? entries : entries.slice(0, 2);
  const hiddenCount = entries.length - 2;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-3">Roles</h2>
      <div className="space-y-4">
        {visibleEntries.map(([type, typeRoles]) => (
          <div key={type}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {type}
            </h3>
            <div className="flex flex-wrap gap-2">
              {typeRoles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.role_name}
                  {role.organisation ? ` — ${role.organisation}` : ""}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Show {hiddenCount} more role {hiddenCount === 1 ? "type" : "types"} <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
