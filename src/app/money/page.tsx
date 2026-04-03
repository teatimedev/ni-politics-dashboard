import { createServiceClient } from "@/lib/supabase/server";
import { InterestCard } from "@/components/interest-card";
import { MoneyFilters } from "@/components/money-filters";
import { Badge } from "@/components/ui/badge";
import type { InterestWithMember } from "@/lib/db-types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    mla?: string;
    page?: string;
  }>;
}

export default async function MoneyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 50;

  let query = supabase
    .from("interests")
    .select("*, members!inner(person_id, name)", { count: "exact" })
    .eq("in_latest", true)
    .order("date_published", { ascending: false });

  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.mla) {
    query = query.eq("person_id", params.mla);
  }
  if (params.q) {
    query = query.ilike("content", `%${params.q}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: interests, count: totalCount } = await query;
  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);

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
    const m = i.members as unknown as { person_id: string; name: string };
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
            (i) => (i as InterestWithMember).category === cat
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
        {((interests ?? []) as InterestWithMember[]).map((interest) => (
          <InterestCard
            key={interest.id}
            interest={interest}
            showMember={interest.members}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/money?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.category ? { category: params.category } : {}), ...(params.mla ? { mla: params.mla } : {}), page: String(page - 1) }).toString()}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              Previous
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/money?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.category ? { category: params.category } : {}), ...(params.mla ? { mla: params.mla } : {}), page: String(page + 1) }).toString()}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              Next
            </a>
          )}
        </div>
      )}

      {(interests ?? []).length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">
          No interests found. Try adjusting your filters or run the sync first.
        </p>
      )}

      {/* Party Donations Section */}
      <PartyDonationsSection />
    </div>
  );
}

async function PartyDonationsSection() {
  const supabase = createServiceClient();

  const { data: donations } = await supabase
    .from("party_donations")
    .select("*")
    .order("date_accepted", { ascending: false })
    .limit(50);

  if (!donations || donations.length === 0) return null;

  // Group by party for summary
  const partyTotals = new Map<string, number>();
  for (const d of donations) {
    const current = partyTotals.get(d.party) ?? 0;
    partyTotals.set(d.party, current + (d.amount ?? 0));
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold tracking-tight mb-2">
        Party Donations
      </h2>
      <p className="text-muted-foreground mb-4">
        Donations to NI political parties (Electoral Commission data, from July 2017)
      </p>

      {/* Party totals */}
      <div className="mb-6 flex flex-wrap gap-3">
        {[...partyTotals.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([party, total]) => (
            <div
              key={party}
              className="rounded-lg border border-border bg-card px-4 py-2"
            >
              <p className="text-xs text-muted-foreground">{party}</p>
              <p className="text-lg font-semibold">
                £{total.toLocaleString("en-GB", { minimumFractionDigits: 0 })}
              </p>
            </div>
          ))}
      </div>

      {/* Recent donations list */}
      <div className="space-y-2">
        {donations.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {d.donor_name || "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground">
                {d.party} · {d.donation_type} · {d.donor_status}
              </p>
            </div>
            <Badge variant="secondary" className="bg-amber-900/30 text-amber-400">
              £{(d.amount ?? 0).toLocaleString("en-GB")}
            </Badge>
            <span className="text-xs text-muted-foreground w-24 text-right">
              {d.date_accepted}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
