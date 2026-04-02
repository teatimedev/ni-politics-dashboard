import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  getPartyColourClass,
  getPartyShortName,
} from "@/lib/party-colours";

export default async function GroupsPage() {
  const supabase = createServiceClient();

  // Get all APG roles from member_roles
  const { data: apgRoles } = await supabase
    .from("member_roles")
    .select("person_id, role_name, organisation, members!inner(name, party, photo_url)")
    .eq("role_type", "All Party Group Role")
    .order("organisation", { ascending: true });

  // Group by organisation
  const groups = new Map<
    string,
    { role_name: string; person_id: string; name: string; party: string | null; photo_url: string | null }[]
  >();

  for (const r of apgRoles ?? []) {
    const org = r.organisation ?? "Unknown";
    const existing = groups.get(org) ?? [];
    const m = r.members as any;
    existing.push({
      role_name: r.role_name,
      person_id: r.person_id,
      name: m?.name ?? "Unknown",
      party: m?.party ?? null,
      photo_url: m?.photo_url ?? null,
    });
    groups.set(org, existing);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          All-Party Groups
        </h1>
        <p className="mt-1 text-muted-foreground">
          {sortedGroups.length} cross-party groups in the Northern Ireland
          Assembly
        </p>
      </div>

      <div className="space-y-6">
        {sortedGroups.map(([groupName, members]) => (
          <div
            key={groupName}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold">{groupName}</h2>
              <Badge variant="secondary" className="text-xs">
                {members.length} members
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m, i) => (
                <Link
                  key={`${m.person_id}-${i}`}
                  href={`/mla/${m.person_id}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted" />
                  )}
                  <span className="text-foreground">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.role_name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`${getPartyColourClass(m.party)} text-white text-xs px-1.5 py-0`}
                  >
                    {getPartyShortName(m.party)}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
