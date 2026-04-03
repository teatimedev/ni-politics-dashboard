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
