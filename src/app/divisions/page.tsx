import { createServiceClient } from "@/lib/supabase/server";
import { DivisionRow } from "@/components/division-row";
import { DivisionFilters } from "@/components/division-filters";
import type { Division } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    outcome?: string;
    type?: string;
  }>;
}

export default async function DivisionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("divisions")
    .select("*")
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

  const { data: divisions } = await query;

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
          {(divisions ?? []).length} votes in the Northern Ireland Assembly
        </p>
      </div>

      <DivisionFilters divisionTypes={divisionTypes} />

      <div className="mt-6 rounded-lg border border-border bg-card">
        {((divisions as Division[]) ?? []).map((division) => (
          <DivisionRow key={division.division_id} division={division} />
        ))}
      </div>

      {(divisions ?? []).length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">
          No divisions found. Try adjusting your filters or run the sync first.
        </p>
      )}
    </div>
  );
}
