import { createServiceClient } from "@/lib/supabase/server";
import { DivisionRow } from "@/components/division-row";
import { DivisionFilters } from "@/components/division-filters";
import type { Division } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    outcome?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function DivisionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 50;

  let query = supabase
    .from("divisions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false });

  if (params.q) {
    query = query.ilike("title", `%${params.q}%`);
  }
  if (params.outcome === "carried") {
    query = query.or("outcome.ilike.%carried%,outcome.ilike.%agreed%");
  }
  if (params.outcome === "rejected") {
    query = query.or("outcome.ilike.%rejected%,outcome.ilike.%negatived%,outcome.ilike.%fell%");
  }
  if (params.type) {
    query = query.eq("division_type", params.type);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: divisions, count: totalCount } = await query;
  const totalPages = Math.ceil((totalCount ?? 0) / pageSize);

  // Get distinct division types for filter dropdown
  const { data: allDivisions } = await supabase
    .from("divisions")
    .select("division_type");

  const divisionTypes = [
    ...new Set(
      (allDivisions ?? []).map((d) => d.division_type).filter(Boolean)
    ),
  ].sort() as string[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Divisions</h1>
        <p className="mt-1 text-muted-foreground">
          {totalCount ?? 0} votes in the Northern Ireland Assembly
          {totalPages > 1 && ` \u2014 page ${page} of ${totalPages}`}
        </p>
      </div>

      <DivisionFilters divisionTypes={divisionTypes} />

      <div className="mt-6 rounded-lg border border-border bg-card">
        {((divisions as Division[]) ?? []).map((division) => (
          <DivisionRow key={division.division_id} division={division} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/divisions?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.outcome ? { outcome: params.outcome } : {}), ...(params.type ? { type: params.type } : {}), page: String(page - 1) }).toString()}`}
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
              href={`/divisions?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.outcome ? { outcome: params.outcome } : {}), ...(params.type ? { type: params.type } : {}), page: String(page + 1) }).toString()}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              Next
            </a>
          )}
        </div>
      )}

      {(divisions ?? []).length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">
          No divisions found. Try adjusting your filters or run the sync first.
        </p>
      )}
    </div>
  );
}
