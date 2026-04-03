import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { HansardWithMember, QuestionWithMember, SyncLogLatest } from "@/lib/db-types";

export default async function HomePage() {
  const supabase = createServiceClient();

  // Key stats
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

  // Recent divisions
  const { data: recentDivisions } = await supabase
    .from("divisions")
    .select("division_id, title, date, outcome, ayes, noes")
    .order("date", { ascending: false })
    .limit(5);

  // Recent Hansard
  const { data: recentHansard } = await supabase
    .from("hansard_contributions")
    .select("id, person_id, date, debate_title, content, members!inner(name)")
    .order("date", { ascending: false })
    .limit(5);

  // Recent questions
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

  // Deduplicate to latest per source
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
    <div className="animate-in-stagger">
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

      {/* Sync status */}
      <div className="mt-6">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Divisions */}
        <div>
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
        <div>
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
