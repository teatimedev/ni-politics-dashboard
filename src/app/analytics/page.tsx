import { createServiceClient } from "@/lib/supabase/server";
import { getPartyHex, getPartyShortName } from "@/lib/party-colours";
import { SectionHeader } from "@/components/analytics/section-header";
import { CohesionBars } from "@/components/analytics/cohesion-bars";
import { SimilarityHeatmap } from "@/components/analytics/similarity-heatmap";
import { DivisiveVotes } from "@/components/analytics/divisive-votes";
import { RebelTracker } from "@/components/analytics/rebel-tracker";
import { DesignationAnalysis } from "@/components/analytics/designation-analysis";
import { ChartCard } from "@/components/charts/chart-card";

// Parties with enough members for meaningful analysis
const ANALYSIS_PARTIES = [
  "Sinn Féin",
  "Democratic Unionist Party",
  "Alliance Party",
  "Ulster Unionist Party",
  "Social Democratic and Labour Party",
];

const ALL_PARTIES = [
  ...ANALYSIS_PARTIES,
  "Traditional Unionist Voice",
  "People Before Profit Alliance",
];

export default async function AnalyticsPage() {
  const supabase = createServiceClient();

  // Fetch all votes with party + designation info
  const { data: rawVotes } = await supabase
    .from("member_votes")
    .select("division_id, person_id, vote, designation, members!inner(name, party)")
    .not("members.party", "is", null);

  const allVotes = (rawVotes ?? []) as unknown as {
    division_id: string;
    person_id: string;
    vote: string;
    designation: string | null;
    members: { name: string; party: string };
  }[];

  // Fetch division metadata
  const { data: rawDivisions } = await supabase
    .from("divisions")
    .select("division_id, title, date, outcome, ayes, noes")
    .order("date", { ascending: false });

  const divisions = rawDivisions ?? [];
  const divisionMap = new Map(divisions.map((d) => [d.division_id, d]));

  // Get all active members
  const { data: rawMembers } = await supabase
    .from("members")
    .select("person_id, name, party")
    .eq("active", true);

  const members = rawMembers ?? [];

  // === Group votes by division ===
  const votesByDivision = new Map<
    string,
    { personId: string; party: string; name: string; vote: string; designation: string | null }[]
  >();

  for (const v of allVotes) {
    if (!votesByDivision.has(v.division_id)) votesByDivision.set(v.division_id, []);
    votesByDivision.get(v.division_id)!.push({
      personId: v.person_id,
      party: v.members.party,
      name: v.members.name,
      vote: v.vote,
      designation: v.designation,
    });
  }

  // === 1. Party Cohesion ===
  const cohesionData = ALL_PARTIES.map((party) => {
    let unanimous = 0;
    let total = 0;

    for (const [, divVotes] of votesByDivision) {
      const partyVotes = divVotes.filter((v) => v.party === party);
      if (partyVotes.length < 2) continue; // need at least 2 voters
      total++;
      const allSame = partyVotes.every((v) => v.vote === partyVotes[0].vote);
      if (allSame) unanimous++;
    }

    return {
      party,
      short: getPartyShortName(party),
      color: getPartyHex(party),
      cohesion: total > 0 ? Math.round((unanimous / total) * 100) : 0,
      unanimousCount: unanimous,
      totalDivisions: total,
    };
  }).sort((a, b) => b.cohesion - a.cohesion);

  // === 2. Cross-Party Similarity ===
  const partyList = ALL_PARTIES.map((p) => ({
    short: getPartyShortName(p),
    color: getPartyHex(p),
    full: p,
  }));

  // For each pair of parties, calculate % of divisions where majority voted the same way
  function getPartyMajority(
    divVotes: { party: string; vote: string }[],
    party: string
  ): string | null {
    const pv = divVotes.filter((v) => v.party === party);
    if (pv.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const v of pv) {
      counts[v.vote] = (counts[v.vote] ?? 0) + 1;
    }
    let max = 0;
    let majority = "aye";
    for (const [vote, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        majority = vote;
      }
    }
    return majority;
  }

  const similarityMatrix = partyList.map((rowParty) =>
    partyList.map((colParty) => {
      if (rowParty.full === colParty.full) {
        return { partyA: rowParty.short, partyB: colParty.short, agreement: 100 };
      }

      let agreed = 0;
      let total = 0;

      for (const [, divVotes] of votesByDivision) {
        const majA = getPartyMajority(divVotes as any, rowParty.full);
        const majB = getPartyMajority(divVotes as any, colParty.full);
        if (majA === null || majB === null) continue;
        total++;
        if (majA === majB) agreed++;
      }

      return {
        partyA: rowParty.short,
        partyB: colParty.short,
        agreement: total > 0 ? Math.round((agreed / total) * 100) : 0,
      };
    })
  );

  // === 3. Most Divisive Votes ===
  const divisiveVotes = divisions
    .map((d) => {
      const margin = Math.abs(d.ayes - d.noes);
      const divVotes = votesByDivision.get(d.division_id) ?? [];

      // Designation breakdown
      let nationalistAye = 0, nationalistNo = 0;
      let unionistAye = 0, unionistNo = 0;
      let otherAye = 0, otherNo = 0;

      for (const v of divVotes) {
        const des = v.designation?.toLowerCase() ?? "other";
        if (des === "nationalist") {
          if (v.vote === "aye") nationalistAye++;
          else if (v.vote === "no") nationalistNo++;
        } else if (des === "unionist") {
          if (v.vote === "aye") unionistAye++;
          else if (v.vote === "no") unionistNo++;
        } else {
          if (v.vote === "aye") otherAye++;
          else if (v.vote === "no") otherNo++;
        }
      }

      return {
        divisionId: d.division_id,
        title: d.title ?? "Untitled",
        date: d.date ?? "",
        ayes: d.ayes,
        noes: d.noes,
        margin,
        outcome: d.outcome ?? "",
        nationalistAye,
        nationalistNo,
        unionistAye,
        unionistNo,
        otherAye,
        otherNo,
      };
    })
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 10);

  // === 4. Rebel Tracker ===
  // For each MLA, count how often they voted against their party majority
  const mlaRebelCounts = new Map<string, { rebel: number; total: number }>();

  for (const [, divVotes] of votesByDivision) {
    // Calculate party majorities for this division
    const partyMajorities = new Map<string, string>();
    const partyVoteCounts = new Map<string, Map<string, number>>();

    for (const v of divVotes) {
      if (!partyVoteCounts.has(v.party)) partyVoteCounts.set(v.party, new Map());
      const counts = partyVoteCounts.get(v.party)!;
      counts.set(v.vote, (counts.get(v.vote) ?? 0) + 1);
    }

    for (const [party, counts] of partyVoteCounts) {
      let maxVote = "aye";
      let maxCount = 0;
      for (const [vote, count] of counts) {
        if (count > maxCount) {
          maxVote = vote;
          maxCount = count;
        }
      }
      // Only set majority if there are at least 2 party members voting
      const totalPartyVotes = [...counts.values()].reduce((a, b) => a + b, 0);
      if (totalPartyVotes >= 2) {
        partyMajorities.set(party, maxVote);
      }
    }

    // Check each MLA's vote against party majority
    for (const v of divVotes) {
      const majority = partyMajorities.get(v.party);
      if (!majority) continue;

      if (!mlaRebelCounts.has(v.personId)) {
        mlaRebelCounts.set(v.personId, { rebel: 0, total: 0 });
      }
      const counts = mlaRebelCounts.get(v.personId)!;
      counts.total++;
      if (v.vote !== majority) counts.rebel++;
    }
  }

  const memberMap = new Map(members.map((m) => [m.person_id, m]));

  const rebels = [...mlaRebelCounts.entries()]
    .map(([personId, counts]) => {
      const m = memberMap.get(personId);
      if (!m) return null;
      return {
        personId,
        name: m.name,
        party: m.party ?? "Independent",
        partyShort: getPartyShortName(m.party),
        partyColor: getPartyHex(m.party),
        rebelVotes: counts.rebel,
        totalVotes: counts.total,
        rebelPct: counts.total > 0 ? Math.round((counts.rebel / counts.total) * 100) : 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.rebelVotes > 0)
    .sort((a, b) => b.rebelPct - a.rebelPct)
    .slice(0, 15);

  // === 5. Designation Analysis ===
  let alignedCount = 0;
  let splitCount = 0;
  let nationalistWins = 0;
  let unionistWins = 0;
  let otherDecides = 0;

  for (const [divId, divVotes] of votesByDivision) {
    // Get majority for each designation
    const desCounts: Record<string, { aye: number; no: number }> = {
      nationalist: { aye: 0, no: 0 },
      unionist: { aye: 0, no: 0 },
      other: { aye: 0, no: 0 },
    };

    for (const v of divVotes) {
      const des = (v.designation?.toLowerCase() ?? "other") as keyof typeof desCounts;
      const bucket = desCounts[des] ?? desCounts.other;
      if (v.vote === "aye") bucket.aye++;
      else if (v.vote === "no") bucket.no++;
    }

    const natMaj = desCounts.nationalist.aye > desCounts.nationalist.no ? "aye" : "no";
    const uniMaj = desCounts.unionist.aye > desCounts.unionist.no ? "aye" : "no";
    const othMaj = desCounts.other.aye > desCounts.other.no ? "aye" : "no";

    if (natMaj === uniMaj) {
      alignedCount++;
    } else {
      splitCount++;
      // Did one side win?
      const div = divisionMap.get(divId);
      if (div) {
        const passed =
          div.outcome?.toLowerCase().includes("carried") ||
          div.outcome?.toLowerCase().includes("agreed");
        const winningVote = passed ? "aye" : "no";

        if (natMaj === winningVote && uniMaj !== winningVote) nationalistWins++;
        if (uniMaj === winningVote && natMaj !== winningVote) unionistWins++;
        if (othMaj === winningVote && natMaj !== winningVote && uniMaj !== winningVote) {
          otherDecides++;
        } else if (othMaj === winningVote && natMaj !== uniMaj) {
          otherDecides++;
        }
      }
    }
  }

  const totalAnalysed = alignedCount + splitCount;

  return (
    <div className="animate-in-stagger min-w-0">
      <h1 className="text-4xl font-bold tracking-tight">Voting Analytics</h1>
      <p className="mt-1 text-muted-foreground text-lg">
        Deep analysis of {votesByDivision.size} divisions and {allVotes.length.toLocaleString()} individual votes
      </p>

      <div className="mt-10 space-y-12">
        {/* Section 1: Party Cohesion */}
        <section>
          <SectionHeader
            number="01"
            title="Party Cohesion"
            subtitle="How often does each party vote as a unified bloc?"
          />
          <ChartCard title="Unanimity Rate" subtitle="% of divisions where all party members voted the same way">
            <CohesionBars data={cohesionData} />
          </ChartCard>
        </section>

        {/* Section 2: Cross-Party Similarity */}
        <section>
          <SectionHeader
            number="02"
            title="Cross-Party Similarity"
            subtitle="How often do party majorities vote the same way?"
          />
          <ChartCard title="Agreement Matrix" subtitle="% of divisions where two parties' majority positions matched">
            <SimilarityHeatmap parties={partyList} matrix={similarityMatrix} />
          </ChartCard>
        </section>

        {/* Section 3: Designation Analysis */}
        <section>
          <SectionHeader
            number="03"
            title="Community Divisions"
            subtitle="Nationalist vs Unionist vs Other designation voting patterns"
          />
          <ChartCard
            title="Cross-Community Alignment"
            subtitle={`Analysis of ${totalAnalysed} divisions by designation bloc`}
          >
            <DesignationAnalysis
              data={{
                totalDivisions: totalAnalysed,
                alignedCount,
                alignedPct: totalAnalysed > 0 ? Math.round((alignedCount / totalAnalysed) * 100) : 0,
                splitCount,
                splitPct: totalAnalysed > 0 ? Math.round((splitCount / totalAnalysed) * 100) : 0,
                nationalistWins,
                unionistWins,
                otherDecides,
              }}
            />
          </ChartCard>
        </section>

        {/* Section 4: Most Divisive Votes */}
        <section>
          <SectionHeader
            number="04"
            title="Most Divisive Votes"
            subtitle="The closest divisions with designation breakdowns"
          />
          <DivisiveVotes data={divisiveVotes} />
        </section>

        {/* Section 5: Rebel Tracker */}
        <section>
          <SectionHeader
            number="05"
            title="Rebel Tracker"
            subtitle="MLAs who break party line most frequently"
          />
          <ChartCard title="Party Line Rebels" subtitle="Votes against party majority as % of total votes cast">
            <RebelTracker data={rebels} />
          </ChartCard>
        </section>
      </div>
    </div>
  );
}
