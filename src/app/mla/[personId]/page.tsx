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

  // Fetch questions
  const { data: questionsData } = await supabase
    .from("questions")
    .select("*")
    .eq("person_id", personId)
    .order("date", { ascending: false })
    .limit(50);

  // Fetch news quotes for this MLA
  const { data: newsQuotes } = await supabase
    .from("news_mla_quotes")
    .select("id, quoted_text, sentiment_score, news_mentions!inner(headline, source, url, date)")
    .eq("person_id", personId)
    .order("id", { ascending: false })
    .limit(20);

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
          <TabsTrigger value="questions">
            Questions ({(questionsData ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="news">
            News ({(newsQuotes ?? []).length})
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

        <TabsContent value="questions" className="mt-4">
          {(questionsData ?? []).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No questions found for this MLA.
            </p>
          ) : (
            <div className="space-y-3">
              {(questionsData ?? []).map((q: any) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {q.question_type === "written" ? "Written" : "Oral"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {q.department}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {q.date}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {q.question_text}
                  </p>
                  {q.answer_text && (
                    <div className="mt-3 rounded border-l-2 border-accent pl-3">
                      <p className="text-sm text-muted-foreground">
                        {q.answer_text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          {(newsQuotes ?? []).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No news mentions found for this MLA.
            </p>
          ) : (
            <div className="space-y-3">
              {(newsQuotes ?? []).map((q: any) => {
                const article = q.news_mentions;
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <a
                      href={article?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {article?.headline}
                    </a>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {article?.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {article?.date
                          ? new Date(article.date).toLocaleDateString("en-GB")
                          : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/80 italic">
                      &ldquo;{q.quoted_text}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
