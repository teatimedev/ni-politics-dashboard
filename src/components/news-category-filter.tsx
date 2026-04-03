"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NEWS_CATEGORIES } from "@/lib/news-categories";

export function NewsCategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "all";

  function select(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("category");
    } else {
      params.set("category", key);
    }
    params.delete("page");
    router.push(`/news?${params.toString()}`);
  }

  return (
    <div
      className="relative flex gap-2 overflow-x-auto pb-3 scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <ChipButton
        label="All"
        isActive={active === "all"}
        onClick={() => select("all")}
      />
      {NEWS_CATEGORIES.map((cat) => (
        <ChipButton
          key={cat.key}
          label={cat.label}
          isActive={active === cat.key}
          onClick={() => select(cat.key)}
        />
      ))}
    </div>
  );
}

function ChipButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center whitespace-nowrap rounded-full
        min-h-[36px] px-4 text-sm font-medium
        border transition-all duration-200 cursor-pointer select-none
        ${
          isActive
            ? "bg-[oklch(0.82_0.12_75_/_15%)] text-[oklch(0.88_0.1_75)] border-[oklch(0.82_0.12_75_/_40%)] shadow-[0_0_12px_-3px_oklch(0.82_0.12_75_/_25%)]"
            : "bg-[oklch(1_0_0_/_4%)] text-[oklch(0.55_0.01_80)] border-[oklch(1_0_0_/_8%)] hover:bg-[oklch(1_0_0_/_8%)] hover:text-[oklch(0.7_0.01_80)] hover:border-[oklch(1_0_0_/_12%)]"
        }
      `}
    >
      {label}
    </button>
  );
}
