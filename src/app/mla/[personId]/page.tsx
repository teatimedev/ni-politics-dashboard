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
import type { VoteWithDivision, NewsQuoteWithArticle } from "@/lib/db-types";

interface PageProps {
  params: Promise<{ personId: string }>;
}

export default async function MlaProfilePage({ params }: PageProps) {
  const { personId } = await params;
  const supabase = createServiceClient();

  const [
    { data: member },
    { data: roles },
    { data: hansardData },
    { data: questionsData },
    { data: newsQuotes },
    { data: interestsData },
    { data: votes },
  ] = await Promise.all([
    supabase.from("members").select("*").eq("person_id", personId).single(),
    supabase
      .from("member_roles")
      .select("*")
      .eq("person_id", personId)
      .order("start_date", { ascending: false }),
    supabase
      .from("hansard_contributions")
      .select("*")
      .eq("person_id", personId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("questions")
      .select("*")
      .eq("person_id", personId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("news_mla_quotes")
      .select("id, quoted_text, sentiment_score, news_mentions!inner(headline, source, url, date)")
      .eq("person_id", personId)
      .order("id", { ascending: false })
      .limit(20),
    supabase
      .from("interests")
      .select("*")
      .eq("person_id", personId)
      .eq("in_latest", true)
      .order("category", { ascending: true }),
    supabase
      .from("member_votes")
      .select(
        "id, vote, designation, divisions(division_id, date, title, outcome, ayes, noes, division_type)"
      )
      .eq("person_id", personId)
      .order("id", { ascending: false }),
  ]);

  if (!member) notFound();

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
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 text-center sm:text-left">
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
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="voting">
            Voting Record ({(votes ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="hansard">
            Hansard ({hansardContributions.length})
          </TabsTrigger>
          <TabsTrigger value="interests">
            Interests ({(interestsData ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({(questionsData ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="news">
            News ({(newsQuotes ?? []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voting" className="mt-4">
          <VotingRecordTab votes={(votes ?? []) as unknown as VoteWithDivision[]} />
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
              {(interestsData ?? []).map((interest) => (
                <InterestCard key={interest.id} interest={interest} />
              ))}
            </div>
          )}
        </TabsContent>


        <TabsContent value="questions" className="mt-4">
          {(questionsData ?? []).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No questions found for this MLA.
            </p>
          ) : (
            <div className="space-y-3">
              {(questionsData ?? []).map((q) => (
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
              {((newsQuotes ?? []) as unknown as NewsQuoteWithArticle[]).map((q) => {
                const article = q.news_mentions;
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <a
                      href={article?.url ?? "#"}
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
