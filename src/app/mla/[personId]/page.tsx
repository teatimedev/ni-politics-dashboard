import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getPartyColourClass,
  getPartyShortName,
} from "@/lib/party-colours";
import { VotingRecordTab } from "@/components/voting-record-tab";
import { HansardContributionCard } from "@/components/hansard-contribution-card";
import { InterestCard } from "@/components/interest-card";
import type { Member, MemberRole, HansardContribution } from "@/lib/types";

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

  // Fetch Hansard contributions
  const { data: hansardData } = await supabase
    .from("hansard_contributions")
    .select("*")
    .eq("person_id", personId)
    .order("date", { ascending: false })
    .limit(50);

  // Fetch interests
  const { data: interestsData } = await supabase
    .from("interests")
    .select("*")
    .eq("person_id", personId)
    .eq("in_latest", true)
    .order("category", { ascending: true });

  // Fetch voting record with division details
  const { data: votes } = await supabase
    .from("member_votes")
    .select(
      "id, vote, designation, divisions(division_id, date, title, outcome, ayes, noes, division_type)"
    )
    .eq("person_id", personId)
    .order("id", { ascending: false });

  const mla = member as Member;
  const mlaRoles = (roles ?? []) as MemberRole[];
  const hansardContributions = (hansardData ?? []) as HansardContribution[];

  const memberInfo = {
    person_id: mla.person_id,
    name: mla.name,
    party: mla.party,
    photo_url: mla.photo_url,
  };

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

      {/* Tabs */}
      <Tabs defaultValue="voting" className="w-full">
        <TabsList>
          <TabsTrigger value="voting">
            Voting Record ({(votes ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="hansard">
            Hansard ({hansardContributions.length})
          </TabsTrigger>
          <TabsTrigger value="interests">
            Interests ({(interestsData ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="expenses" disabled>
            Expenses
          </TabsTrigger>
          <TabsTrigger value="questions" disabled>
            Questions
          </TabsTrigger>
          <TabsTrigger value="news" disabled>
            News
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voting" className="mt-4">
          <VotingRecordTab votes={(votes as any) ?? []} />
        </TabsContent>

        <TabsContent value="hansard" className="mt-4">
          {hansardContributions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No Hansard contributions found for this MLA.
            </p>
          ) : (
            <div className="space-y-3">
              {hansardContributions.map((c) => (
                <HansardContributionCard
                  key={c.id}
                  contribution={c}
                  member={memberInfo}
                  showDebateTitle
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interests" className="mt-4">
          {(interestsData ?? []).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No declared interests found for this MLA.
            </p>
          ) : (
            <div className="space-y-3">
              {(interestsData ?? []).map((interest: any) => (
                <InterestCard key={interest.id} interest={interest} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses">
          <p className="py-8 text-center text-muted-foreground">
            Coming in Phase 7.
          </p>
        </TabsContent>

        <TabsContent value="questions">
          <p className="py-8 text-center text-muted-foreground">
            Coming in Phase 6.
          </p>
        </TabsContent>

        <TabsContent value="news">
          <p className="py-8 text-center text-muted-foreground">
            Coming in Phase 5.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
