import { createServiceClient } from "@/lib/supabase/server";
import { InterestCard } from "@/components/interest-card";
import { MoneyFilters } from "@/components/money-filters";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    mla?: string;
  }>;
}

export default async function MoneyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("interests")
    .select("*, members!inner(person_id, name)")
    .eq("in_latest", true)
    .order("date_published", { ascending: false })
    .limit(200);

  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.mla) {
    query = query.eq("person_id", params.mla);
  }
  if (params.q) {
    query = query.ilike("content", `%${params.q}%`);
  }

  const { data: interests } = await query;

  // Get distinct categories for filter
  const { data: allInterests } = await supabase
    .from("interests")
    .select("category")
    .eq("in_latest", true);

  const categories = [
    ...new Set((allInterests ?? []).map((i) => i.category).filter(Boolean)),
  ].sort();

  // Get MLAs who have interests for filter
  const { data: interestMembers } = await supabase
    .from("interests")
    .select("person_id, members!inner(person_id, name)")
    .eq("in_latest", true);

  const mlaMap = new Map<string, string>();
  for (const i of interestMembers ?? []) {
    const m = i.members as any;
    if (m?.name) mlaMap.set(m.person_id, m.name);
  }
  const mlaNames = [...mlaMap.entries()]
    .map(([id, name]) => ({ person_id: id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Money & Interests
        </h1>
        <p className="mt-1 text-muted-foreground">
          Register of Interests for Northern Ireland Assembly members
        </p>
      </div>

      <MoneyFilters categories={categories} mlaNames={mlaNames} />

      {/* Category summary */}
      <div className="mt-4 mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = (interests ?? []).filter(
            (i: any) => i.category === cat
          ).length;
          if (count === 0) return null;
          return (
            <a
              key={cat}
              href={`/money?category=${encodeURIComponent(cat)}`}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {cat} ({count})
            </a>
          );
        })}
      </div>

      <div className="space-y-3">
        {(interests ?? []).map((interest: any) => (
          <InterestCard
            key={interest.id}
            interest={interest}
            showMember={interest.members}
          />
        ))}
      </div>

      {(interests ?? []).length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">
          No interests found. Try adjusting your filters or run the sync first.
        </p>
      )}
    </div>
  );
}
