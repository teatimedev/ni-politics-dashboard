import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { HansardWithMember, QuestionWithMember, SyncLogLatest } from "@/lib/db-types";
import { getPartyHex, getPartyShortName } from "@/lib/party-colours";
import { getCategoryLabel } from "@/lib/news-categories";
import { ChartCard } from "@/components/charts/chart-card";
import { AssemblySeatsChart } from "@/components/charts/assembly-seats-chart";
import { VotingActivityChart } from "@/components/charts/voting-activity-chart";
import { PartyVotingChart } from "@/components/charts/party-voting-chart";
import { NewsCategoriesChart } from "@/components/charts/news-categories-chart";
import { ActiveMlasChart } from "@/components/charts/active-mlas-chart";

export default async function HomePage() {
  const supabase = createServiceClient();

  // === Key stats ===
  const [
    { count: mlaCount },
    { count: divisionCount },
    { count: hansardCount },
    { count: questionCount },
    { count: interestCount },
    { count: donationCount },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("divisions").select("*", { count: "exact", head: true }),
    supabase.from("hansard_contributions").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("interests").select("*", { count: "exact", head: true }).eq("in_latest", true),
    supabase.from("party_donations").select("*", { count: "exact", head: true }),
  ]);

  // === Analytics data ===

  // Party seat counts
  const { data: partySeats } = await supabase
    .from("members")
    .select("party")
    .eq("active", true);

  const seatsByParty = new Map<string, number>();
  for (const m of partySeats ?? []) {
    const p = m.party ?? "Independent";
    seatsByParty.set(p, (seatsByParty.get(p) ?? 0) + 1);
  }
  const seatData = [...seatsByParty.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([party, count]) => ({
      party,
      short: getPartyShortName(party),
      count,
      color: getPartyHex(party),
    }));

  // Monthly division counts
  const { data: rawDivisions } = await supabase
    .from("divisions")
    .select("date")
    .order("date", { ascending: true });

  const monthCounts = new Map<string, number>();
  for (const d of rawDivisions ?? []) {
    if (!d.date) continue;
    const key = d.date.slice(0, 7); // YYYY-MM
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const monthData = [...monthCounts.entries()].map(([month, count]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    count,
  }));

  // Party voting patterns
  const { data: rawVotes } = await supabase
    .from("member_votes")
    .select("vote, members!inner(party)")
    .not("members.party", "is", null);

  const partyVotes = new Map<string, { aye: number; no: number; abstained: number }>();
  for (const v of (rawVotes ?? []) as unknown as { vote: string; members: { party: string } }[]) {
    const party = v.members.party;
    if (!partyVotes.has(party)) partyVotes.set(party, { aye: 0, no: 0, abstained: 0 });
    const pv = partyVotes.get(party)!;
    if (v.vote === "aye") pv.aye++;
    else if (v.vote === "no") pv.no++;
    else pv.abstained++;
  }
  const partyVoteData = [...partyVotes.entries()]
    .sort((a, b) => (b[1].aye + b[1].no + b[1].abstained) - (a[1].aye + a[1].no + a[1].abstained))
    .map(([party, votes]) => ({
      party,
      short: getPartyShortName(party),
      ...votes,
      color: getPartyHex(party),
    }));

  // News categories
  const { data: rawCategories } = await supabase
    .from("news_mentions")
    .select("category")
    .not("category", "is", null);

  const catCounts = new Map<string, number>();
  for (const n of rawCategories ?? []) {
    if (!n.category) continue;
    catCounts.set(n.category, (catCounts.get(n.category) ?? 0) + 1);
  }
  const categoryData = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      label: getCategoryLabel(category),
      count,
    }));

  // Most active MLAs
  const { data: rawActivity } = await supabase
    .from("members")
    .select("person_id, name, party, hansard_contributions(id), questions(id), member_votes(id)")
    .eq("active", true);

  const activityData = ((rawActivity ?? []) as unknown as {
    person_id: string;
    name: string;
    party: string;
    hansard_contributions: { id: string }[];
    questions: { id: string }[];
    member_votes: { id: string }[];
  }[])
    .map((m) => {
      const hansard = m.hansard_contributions?.length ?? 0;
      const questions = m.questions?.length ?? 0;
      const votes = m.member_votes?.length ?? 0;
      return {
        personId: m.person_id,
        name: m.name,
        party: m.party,
        partyShort: getPartyShortName(m.party),
        color: getPartyHex(m.party),
        hansard,
        questions,
        votes,
        score: hansard + questions + votes,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // === Recent activity (existing) ===
  const { data: recentDivisions } = await supabase
    .from("divisions")
    .select("division_id, title, date, outcome, ayes, noes")
    .order("date", { ascending: false })
    .limit(5);

  const { data: recentHansard } = await supabase
    .from("hansard_contributions")
    .select("id, person_id, date, debate_title, content, members!inner(name)")
    .order("date", { ascending: false })
    .limit(5);

  const { data: recentQuestions } = await supabase
    .from("questions")
    .select("id, person_id, date, question_text, department, question_type, members!inner(name)")
    .order("date", { ascending: false })
    .limit(5);

  // Sync status
  const { data: syncLogs } = await supabase
    .from("sync_log")
    .select("source, status, completed_at, records_updated")
    .order("completed_at", { ascending: false })
    .limit(10);

  const latestSyncs = new Map<string, SyncLogLatest>();
  for (const log of syncLogs ?? []) {
    if (!latestSyncs.has(log.source)) {
      latestSyncs.set(log.source, log);
    }
  }

  const stats = [
    { label: "MLAs", value: mlaCount ?? 0, href: "/mlas" },
    { label: "Divisions", value: divisionCount ?? 0, href: "/divisions" },
    { label: "Hansard", value: hansardCount ?? 0, href: "/hansard" },
    { label: "Questions", value: questionCount ?? 0, href: "/mlas" },
    { label: "Interests", value: interestCount ?? 0, href: "/money" },
    { label: "Donations", value: donationCount ?? 0, href: "/money" },
  ];

  return (
    <div className="animate-in-stagger min-w-0">
      <h1 className="text-4xl font-bold tracking-tight">
        Stormont Watch
      </h1>
      <p className="mt-1 text-muted-foreground text-lg">
        Northern Ireland Assembly politics dashboard
      </p>

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card-glow rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:bg-muted"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      {/* Analytics charts */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ChartCard title="Assembly Seats" subtitle="Current party representation">
          <AssemblySeatsChart data={seatData} />
        </ChartCard>

        <ChartCard title="Voting Activity" subtitle="Divisions per month">
          <VotingActivityChart data={monthData} />
        </ChartCard>

        <ChartCard title="Party Voting Patterns" subtitle="Aye / No / Abstain breakdown" className="sm:col-span-2">
          <PartyVotingChart data={partyVoteData} />
        </ChartCard>

        <ChartCard title="News Coverage" subtitle="Articles by category">
          <NewsCategoriesChart data={categoryData} />
        </ChartCard>

        <ChartCard title="Most Active MLAs" subtitle="Combined debate, questions & voting activity">
          <ActiveMlasChart data={activityData} />
        </ChartCard>
      </div>

      {/* Sync status */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Sync Status</h2>
        <div className="flex flex-wrap gap-2">
          {[...latestSyncs.entries()].map(([source, log]) => (
            <Badge
              key={source}
              variant="secondary"
              className={
                log.status === "success"
                  ? "bg-green-900/30 text-green-400"
                  : "bg-red-900/30 text-red-400"
              }
            >
              {source}: {log.records_updated} records
              {log.completed_at
                ? ` · ${new Date(log.completed_at).toLocaleDateString("en-GB")}`
                : ""}
            </Badge>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2 min-w-0">
        {/* Recent Divisions */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold mb-3">Recent Votes</h2>
          <div className="space-y-2">
            {(recentDivisions ?? []).map((d) => {
              const passed =
                d.outcome?.toLowerCase().includes("carried") ||
                d.outcome?.toLowerCase().includes("agreed");
              return (
                <div
                  key={d.division_id}
                  className="rounded-lg border border-border bg-card p-3 overflow-hidden"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.date} · {d.ayes}–{d.noes} ·{" "}
                    <span className={passed ? "text-green-400" : "text-red-400"}>
                      {passed ? "Carried" : "Rejected"}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
          <Link
            href="/divisions"
            className="mt-2 inline-block text-sm text-accent hover:underline"
          >
            View all divisions →
          </Link>
        </div>

        {/* Recent Hansard */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold mb-3">Recent Debate</h2>
          <div className="space-y-2">
            {((recentHansard ?? []) as unknown as HansardWithMember[]).map((h) => (
              <div
                key={h.id}
                className="rounded-lg border border-border bg-card p-3 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/mla/${h.person_id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    {h.members?.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {h.date}
                  </span>
                </div>
                {h.debate_title && (
                  <p className="text-xs text-muted-foreground mb-1 truncate">
                    {h.debate_title}
                  </p>
                )}
                <p className="text-sm text-foreground/80 line-clamp-2">
                  {h.content}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/hansard"
            className="mt-2 inline-block text-sm text-accent hover:underline"
          >
            Browse Hansard →
          </Link>
        </div>
      </div>

      {/* Recent Questions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Recent Questions</h2>
        <div className="space-y-2">
          {((recentQuestions ?? []) as unknown as QuestionWithMember[]).map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-border bg-card p-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link
                  href={`/mla/${q.person_id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {q.members?.name}
                </Link>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {q.question_type === "written" ? "Written" : "Oral"}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {q.department}
                </span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {q.date}
                </span>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2">
                {q.question_text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
