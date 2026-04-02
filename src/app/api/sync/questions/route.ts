import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getWrittenQuestions, getOralQuestions } from "@/lib/ni-assembly/api";

export const maxDuration = 60;

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
    .insert({ source: "questions", started_at: startedAt })
    .select("id")
    .single();

  try {
    // Get known member IDs
    const { data: knownMembers } = await supabase
      .from("members")
      .select("person_id");
    const knownPersonIds = new Set(
      (knownMembers ?? []).map((m) => m.person_id)
    );

    // Sync last 90 days of questions (or ?days=N)
    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get("days") ?? "90", 10);
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    // Fetch both written and oral questions
    const [writtenRes, oralRes] = await Promise.all([
      getWrittenQuestions(startDate, endDate),
      getOralQuestions(startDate, endDate),
    ]);

    const writtenQuestions =
      writtenRes.QuestionsList?.Question ?? [];
    const oralQuestions =
      oralRes.QuestionsList?.Question ?? [];

    // Ensure arrays (API returns single object if only 1 result)
    const allWritten = Array.isArray(writtenQuestions)
      ? writtenQuestions
      : [writtenQuestions];
    const allOral = Array.isArray(oralQuestions)
      ? oralQuestions
      : [oralQuestions];

    const allQuestions = [
      ...allWritten.map((q) => ({ ...q, type: "written" })),
      ...allOral.map((q) => ({ ...q, type: "oral" })),
    ];

    // Deduplicate by document_id (oral and written may overlap)
    const seen = new Set<string>();
    const questionRows = allQuestions
      .filter((q) => q.TablerPersonId && knownPersonIds.has(q.TablerPersonId))
      .map((q) => ({
        document_id: q.DocumentId,
        person_id: q.TablerPersonId,
        question_text: q.QuestionText,
        answer_text: null,
        date: q.TabledDate?.split("T")[0] ?? null,
        department: q.Department,
        question_type: q.type,
      }))
      .filter((q) => {
        if (seen.has(q.document_id)) return false;
        seen.add(q.document_id);
        return true;
      });

    // Upsert in chunks
    for (let i = 0; i < questionRows.length; i += 500) {
      const chunk = questionRows.slice(i, i + 500);
      const { error } = await supabase
        .from("questions")
        .upsert(chunk, { onConflict: "document_id" });
      if (error) throw error;
    }

    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: questionRows.length,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      written: allWritten.length,
      oral: allOral.length,
      synced: questionRows.length,
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
