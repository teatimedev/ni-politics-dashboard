import { createServiceClient } from "@/lib/supabase/server";
import { HansardFilters } from "@/components/hansard-filters";
import { HansardDebateView } from "@/components/hansard-debate-view";
import type { HansardContribution, Member } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    mla?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function HansardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 50;

  let query = supabase
    .from("hansard_contributions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("component_id", { ascending: true });

  if (params.mla) {
    query = query.eq("person_id", params.mla);
  }
  if (params.from) {
    query = query.gte("date", params.from);
  }
  if (params.to) {
    query = query.lte("date", params.to);
  }
  if (params.q) {
    query = query.or(
      `content.ilike.%${params.q}%,debate_title.ilike.%${params.q}%`
    );
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: contributions, count: totalCount } = await query;
  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);
  const typedContributions = (contributions ?? []) as HansardContribution[];

  // Collect unique person_ids to fetch member info
  const personIds = [
    ...new Set(typedContributions.map((c) => c.person_id)),
  ];

  const { data: members } =
    personIds.length > 0
      ? await supabase
          .from("members")
          .select("person_id, name, party, photo_url")
          .in("person_id", personIds)
      : { data: [] };

  const membersMap = new Map(
    (
      (members ?? []) as Pick<
        Member,
        "person_id" | "name" | "party" | "photo_url"
      >[]
    ).map((m) => [m.person_id, m])
  );

  // Get list of all MLAs who have Hansard contributions (for filter dropdown)
  const { data: allContributors } = await supabase
    .from("hansard_contributions")
    .select("person_id")
    .limit(1000);

  const contributorIds = [
    ...new Set((allContributors ?? []).map((c) => c.person_id)),
  ];

  const { data: contributorMembers } =
    contributorIds.length > 0
      ? await supabase
          .from("members")
          .select("person_id, name")
          .in("person_id", contributorIds)
          .order("name", { ascending: true })
      : { data: [] };

  const mlaNames = (contributorMembers ?? []) as {
    person_id: string;
    name: string;
  }[];

  // Group contributions by date for display
  const contributionsByDate = new Map<string, HansardContribution[]>();
  for (const c of typedContributions) {
    const existing = contributionsByDate.get(c.date) ?? [];
    existing.push(c);
    contributionsByDate.set(c.date, existing);
  }

  const sortedDates = [...contributionsByDate.keys()].sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Hansard Browser</h1>
        <p className="mt-1 text-muted-foreground">
          Full debate transcripts from the Northern Ireland Assembly
        </p>
      </div>

      <HansardFilters mlaNames={mlaNames} />

      <div className="mt-6 space-y-10">
        {sortedDates.map((date) => {
          const dateContributions = contributionsByDate.get(date)!;
          return (
            <div key={date}>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                {new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <HansardDebateView
                contributions={dateContributions}
                membersMap={membersMap}
              />
            </div>
          );
        })}

        {sortedDates.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            No Hansard contributions found. Try adjusting your filters or run
            the sync first.
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={`/hansard?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.mla ? { mla: params.mla } : {}), ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}), page: String(page - 1) }).toString()}`}
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
                href={`/hansard?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.mla ? { mla: params.mla } : {}), ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}), page: String(page + 1) }).toString()}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                Next
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
