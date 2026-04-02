import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getPartyColourClass,
  getPartyShortName,
} from "@/lib/party-colours";
import type { Member, MemberRole } from "@/lib/types";

interface PageProps {
  params: Promise<{ personId: string }>;
}

export default async function MlaProfilePage({ params }: PageProps) {
  const { personId } = await params;
  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("person_id", personId)
    .single();

  if (!member) notFound();

  const { data: roles } = await supabase
    .from("member_roles")
    .select("*")
    .eq("person_id", personId)
    .order("start_date", { ascending: false });

  const mla = member as Member;
  const mlaRoles = (roles ?? []) as MemberRole[];

  // Group roles by type
  const rolesByType = mlaRoles.reduce(
    (acc, role) => {
      const type = role.role_type ?? "Other";
      if (!acc[type]) acc[type] = [];
      acc[type].push(role);
      return acc;
    },
    {} as Record<string, MemberRole[]>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        {mla.photo_url ? (
          <img
            src={mla.photo_url}
            alt={mla.name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-medium text-muted-foreground">
            {mla.first_name?.[0]}
            {mla.last_name?.[0]}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{mla.name}</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            {mla.constituency}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              className={`${getPartyColourClass(mla.party)} text-white`}
            >
              {getPartyShortName(mla.party)}
            </Badge>
            {!mla.active && (
              <Badge variant="secondary" className="bg-red-900/30 text-red-400">
                Former MLA
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Roles */}
      {Object.keys(rolesByType).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Roles</h2>
          <div className="space-y-4">
            {Object.entries(rolesByType).map(([type, typeRoles]) => (
              <div key={type}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {type}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {typeRoles.map((role) => (
                    <Badge key={role.id} variant="secondary">
                      {role.role_name}
                      {role.organisation ? ` — ${role.organisation}` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs placeholder — filled in by later phases */}
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        <p>
          Voting record, Hansard, interests, expenses, questions, news, and
          standards tabs will be added in subsequent phases.
        </p>
      </div>
    </div>
  );
}
