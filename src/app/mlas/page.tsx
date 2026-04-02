import { createServiceClient } from "@/lib/supabase/server";
import { MlaCard } from "@/components/mla-card";
import { MlaFilters } from "@/components/mla-filters";
import type { Member } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    party?: string;
    constituency?: string;
  }>;
}

export default async function MlasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createServiceClient();

  // Fetch all active members
  let query = supabase
    .from("members")
    .select("*")
    .eq("active", true)
    .order("last_name", { ascending: true });

  if (params.party) {
    query = query.eq("party", params.party);
  }
  if (params.constituency) {
    query = query.eq("constituency", params.constituency);
  }
  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }

  const { data: members } = await query;

  // Get distinct parties and constituencies for filters
  const { data: allMembers } = await supabase
    .from("members")
    .select("party, constituency")
    .eq("active", true);

  const parties = [
    ...new Set((allMembers ?? []).map((m) => m.party).filter(Boolean)),
  ].sort() as string[];

  const constituencies = [
    ...new Set(
      (allMembers ?? []).map((m) => m.constituency).filter(Boolean)
    ),
  ].sort() as string[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">MLAs</h1>
        <p className="mt-1 text-muted-foreground">
          {(members ?? []).length} members of the Northern Ireland Assembly
        </p>
      </div>

      <MlaFilters parties={parties} constituencies={constituencies} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {((members as Member[]) ?? []).map((member) => (
          <MlaCard key={member.person_id} member={member} />
        ))}
      </div>

      {(members ?? []).length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">
          No MLAs found. Try adjusting your filters or run the sync first.
        </p>
      )}
    </div>
  );
}
