import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseCSV } from "@/lib/csv";

export const maxDuration = 60;

const CSV_URL =
  "https://pages.mysociety.org/parl_register_interests/data/northern_ireland_assembly_register_of_interests/latest/entries.csv";

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
    .insert({ source: "interests", started_at: startedAt })
    .select("id")
    .single();

  try {
    // Fetch the CSV
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // Build name → person_id lookup from our members table
    const { data: members } = await supabase
      .from("members")
      .select("person_id, name");

    const nameToPersonId = new Map<string, string>();
    for (const m of members ?? []) {
      nameToPersonId.set(m.name, m.person_id);
    }

    // Clear existing interests and re-insert (full replacement sync)
    await supabase.from("interests").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const interestRows = rows
      .filter((r) => r.null_entry !== "true")
      .map((r) => {
        const personId = nameToPersonId.get(r.person_name);
        if (!personId) return null;
        return {
          person_id: personId,
          category: r.category_name,
          content: r.content,
          date_published: r.date_published || null,
          first_register: r.first_register || null,
          last_register: r.last_register || null,
          in_latest: r.in_latest_register === "true",
        };
      })
      .filter(Boolean);

    // Batch insert
    for (let i = 0; i < interestRows.length; i += 500) {
      const chunk = interestRows.slice(i, i + 500);
      const { error } = await supabase.from("interests").insert(chunk);
      if (error) throw error;
    }

    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: interestRows.length,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      total_csv_rows: rows.length,
      interests_synced: interestRows.length,
      unmatched_names: rows.length - interestRows.length,
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
