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

interface MoneyFiltersProps {
  categories: string[];
  mlaNames: { person_id: string; name: string }[];
}

export function MoneyFilters({ categories, mlaNames }: MoneyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/money?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search interests..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
        className="w-64 bg-card border-border"
      />
      <Select
        defaultValue={searchParams.get("category") ?? "all"}
        onValueChange={(v) => updateParam("category", v)}
      >
        <SelectTrigger className="w-64 bg-card border-border">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    </div>
  );
}
