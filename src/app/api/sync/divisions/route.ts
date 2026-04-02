import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getDivisions,
  getDivisionResult,
  getDivisionMemberVoting,
} from "@/lib/ni-assembly/api";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ source: "divisions", started_at: startedAt })
    .select("id")
    .single();

  try {
    // Get all known member person_ids so we can filter votes
    const { data: knownMembers } = await supabase
      .from("members")
      .select("person_id");
    const knownPersonIds = new Set(
      (knownMembers ?? []).map((m) => m.person_id)
    );

    // Fetch divisions from the current mandate (Feb 2024 onward)
    const mandateStart = "2024-02-03";
    const today = new Date().toISOString().split("T")[0];

    const divisionsResponse = await getDivisions(mandateStart, today);
    const apiDivisions = divisionsResponse.DivisionList.Division;

    if (!apiDivisions || apiDivisions.length === 0) {
      await supabase
        .from("sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status: "success",
          records_updated: 0,
        })
        .eq("id", logEntry!.id);

      return NextResponse.json({ success: true, divisions: 0, votes: 0 });
    }

    let totalVotes = 0;

    for (const division of apiDivisions) {
      const resultResponse = await getDivisionResult(division.DocumentID);
      const result = resultResponse.DivisionDetails.Division;

      const divisionRow = {
        division_id: division.DocumentID,
        date: division.DivisionDate.split("T")[0],
        title: division.DivisionSubject,
        motion_text: result.Title,
        outcome: result.Outcome,
        division_type: result.DecisionType,
        ayes: parseInt(result.TotalAyes, 10) || 0,
        noes: parseInt(result.TotalNoes, 10) || 0,
        abstentions: parseInt(result.TotalAbstentions, 10) || 0,
        nationalist_ayes: parseInt(result.NationalistAyes, 10) || 0,
        unionist_ayes: parseInt(result.UnionistAyes, 10) || 0,
        other_ayes: parseInt(result.OtherAyes, 10) || 0,
        nationalist_noes: parseInt(result.NationalistNoes, 10) || 0,
        unionist_noes: parseInt(result.UnionistNoes, 10) || 0,
        other_noes: parseInt(result.OtherNoes, 10) || 0,
      };

      const { error: divisionError } = await supabase
        .from("divisions")
        .upsert(divisionRow, { onConflict: "division_id" });

      if (divisionError) throw divisionError;

      // Fetch member votes for this division
      const votingResponse = await getDivisionMemberVoting(
        division.DocumentID
      );
      const apiVotes = votingResponse.MemberVoting.Member;

      if (apiVotes && apiVotes.length > 0) {
        await supabase
          .from("member_votes")
          .delete()
          .eq("division_id", division.DocumentID);

        const voteRows = apiVotes
          .filter((v) => knownPersonIds.has(v.PersonID))
          .map((v) => ({
            person_id: v.PersonID,
            division_id: division.DocumentID,
            vote: v.Vote.toLowerCase(),
            designation: v.Designation,
          }));

        for (let i = 0; i < voteRows.length; i += 500) {
          const chunk = voteRows.slice(i, i + 500);
          const { error: votesError } = await supabase
            .from("member_votes")
            .insert(chunk);
          if (votesError) throw votesError;
        }

        totalVotes += voteRows.length;
      }
    }

    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: apiDivisions.length,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      divisions: apiDivisions.length,
      votes: totalVotes,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}${error.cause ? ` | cause: ${error.cause}` : ""}`
        : JSON.stringify(error);

    if (logEntry) {
      await supabase
        .from("sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: message,
        })
        .eq("id", logEntry.id);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
