export const NEWS_CATEGORIES = [
  { key: "health", label: "Health" },
  { key: "economy", label: "Economy" },
  { key: "education", label: "Education" },
  { key: "justice", label: "Justice" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "assembly", label: "Assembly" },
  { key: "legacy-identity", label: "Legacy & Identity" },
  { key: "environment", label: "Environment" },
  { key: "other", label: "Other" },
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = NEWS_CATEGORIES.map((c) => c.key);

export function getCategoryLabel(key: string): string {
  return NEWS_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

const CATEGORY_COLORS: Record<string, string> = {
  health: "#f87171",
  economy: "#34d399",
  education: "#60a5fa",
  justice: "#c084fc",
  infrastructure: "#fb923c",
  assembly: "#d4a843",
  "legacy-identity": "#f472b6",
  environment: "#4ade80",
  other: "#71717a",
};

export function getCategoryColor(key: string): string {
  return CATEGORY_COLORS[key] ?? "#71717a";
}
