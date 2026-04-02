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

interface MlaFiltersProps {
  parties: string[];
  constituencies: string[];
}

export function MlaFilters({ parties, constituencies }: MlaFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/mlas?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search MLAs..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
        className="w-64 bg-card border-border"
      />
      <Select
        defaultValue={searchParams.get("party") ?? "all"}
        onValueChange={(v) => updateParam("party", v)}
      >
        <SelectTrigger className="w-48 bg-card border-border">
          <SelectValue placeholder="All parties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All parties</SelectItem>
          {parties.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("constituency") ?? "all"}
        onValueChange={(v) => updateParam("constituency", v)}
      >
        <SelectTrigger className="w-48 bg-card border-border">
          <SelectValue placeholder="All constituencies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All constituencies</SelectItem>
          {constituencies.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
