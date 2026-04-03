import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseCSV } from "@/lib/csv";

export const maxDuration = 60;

const EC_CSV_URL =
  "https://search.electoralcommission.org.uk/api/csv/Donations?start=0&rows=5000&query=&sort=AcceptedDate&order=desc&et=pp&register=ni&period=&from=&to=&rptPd=&donorStatus=&prePoll=false&postPoll=false&isIrishSourceYes=&isIrishSourceNo=";

function parseUKDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/[£,]/g, "")) || 0;
}

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
    .insert({ source: "donations", started_at: startedAt })
    .select("id")
    .single();

  try {
    const response = await fetch(EC_CSV_URL);
    if (!response.ok) throw new Error(`EC CSV fetch failed: ${response.status}`);
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // Clear and re-insert (full replacement)
    await supabase
      .from("party_donations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const donationRows = rows.map((r) => ({
      party: r.RegulatedEntityName,
      donor_name: r.DonorName,
      donor_status: r.DonorStatus,
      amount: parseAmount(r.Value),
      donation_type: r.DonationType,
      date_received: parseUKDate(r.ReceivedDate),
      date_reported: parseUKDate(r.ReportedDate),
      date_accepted: parseUKDate(r.AcceptedDate),
    }));

    for (let i = 0; i < donationRows.length; i += 500) {
      const chunk = donationRows.slice(i, i + 500);
      const { error } = await supabase.from("party_donations").insert(chunk);
      if (error) throw error;
    }

    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: donationRows.length,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      donations: donationRows.length,
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
