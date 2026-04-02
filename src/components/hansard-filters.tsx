"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HansardFiltersProps {
  mlaNames: { person_id: string; name: string }[];
}

export function HansardFilters({ mlaNames }: HansardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/hansard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search debates..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
        className="w-64 bg-card border-border"
      />
      <Select
        defaultValue={searchParams.get("mla") ?? "all"}
        onValueChange={(v) => updateParam("mla", v)}
      >
        <SelectTrigger className="w-56 bg-card border-border">
          <SelectValue placeholder="All MLAs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All MLAs</SelectItem>
          {mlaNames.map((m) => (
            <SelectItem key={m.person_id} value={m.person_id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={(e) => updateParam("from", e.target.value)}
        className="w-40 bg-card border-border"
        aria-label="From date"
      />
      <Input
        type="date"
        defaultValue={searchParams.get("to") ?? ""}
        onChange={(e) => updateParam("to", e.target.value)}
        className="w-40 bg-card border-border"
        aria-label="To date"
      />
    </div>
  );
}
