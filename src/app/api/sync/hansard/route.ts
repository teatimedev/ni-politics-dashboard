import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getAllHansardReports,
  getHansardComponentsByPlenaryDate,
} from "@/lib/ni-assembly/api";
import type { NiAssemblyHansardComponent } from "@/lib/ni-assembly/types";

export const maxDuration = 60;

/** Speaker ComponentType values that identify an MLA contribution */
const SPEAKER_TYPES = new Set([
  "Speaker (MlaName)",
  "Speaker (MinisterAndName)",
  "Speaker (ChairAndName)",
  "Speaker (PrincipalDeputySpeaker)",
]);

/** Extract MLA contributions from ordered Hansard components */
function extractContributions(
  components: NiAssemblyHansardComponent[],
  plenaryDate: string,
  reportDocId: string
) {
  const contributions: {
    component_id: string;
    person_id: string;
    date: string;
    debate_title: string | null;
    content: string;
    plenary_id: string;
  }[] = [];

  let currentDebateTitle: string | null = null;

  for (let i = 0; i < components.length; i++) {
    const comp = components[i];

    // Track the current debate section heading
    if (
      comp.ComponentType === "Header" ||
      comp.ComponentType === "Plenary Item Text"
    ) {
      currentDebateTitle = comp.ComponentText;
      continue;
    }

    // When we hit a Speaker line for an MLA, gather following Spoken Text
    if (SPEAKER_TYPES.has(comp.ComponentType) && comp.RelatedItemId) {
      const personId = comp.RelatedItemId;
      const textParts: string[] = [];

      // Collect all Spoken Text and Quote components that follow this speaker
      for (let j = i + 1; j < components.length; j++) {
        const next = components[j];
        if (
          next.ComponentType === "Spoken Text" ||
          next.ComponentType === "Quote"
        ) {
          textParts.push(next.ComponentText);
        } else {
          break;
        }
      }

      if (textParts.length > 0) {
        contributions.push({
          component_id: comp.ComponentId,
          person_id: personId,
          date: plenaryDate,
          debate_title: currentDebateTitle,
          content: textParts.join("\n\n"),
          plenary_id: reportDocId,
        });
      }
    }
  }

  return contributions;
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
    .insert({ source: "hansard", started_at: startedAt })
    .select("id")
    .single();

  try {
    // Get known member IDs for FK filtering
    const { data: knownMembers } = await supabase
      .from("members")
      .select("person_id");
    const knownPersonIds = new Set(
      (knownMembers ?? []).map((m) => m.person_id)
    );

    // Fetch all Hansard reports to get plenary dates
    const reportsResponse = await getAllHansardReports();
    const reports =
      reportsResponse.AllHansardComponentsList.HansardComponent;

    // Only sync reports from the last N days (default 30, configurable via ?days=N)
    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get("days") ?? "30", 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const recentReports = reports.filter((r) => {
      const plenaryDate = new Date(r.PlenaryDate);
      return plenaryDate >= cutoffDate;
    });

    let totalContributions = 0;

    for (const report of recentReports) {
      const plenaryDate = report.PlenaryDate.split("T")[0];

      const componentsResponse =
        await getHansardComponentsByPlenaryDate(plenaryDate);
      const components =
        componentsResponse.AllHansardComponentsList.HansardComponent;

      if (!components || components.length === 0) continue;

      const contributions = extractContributions(
        components,
        plenaryDate,
        report.ReportDocId
      ).filter((c) => knownPersonIds.has(c.person_id));

      if (contributions.length === 0) continue;

      for (let i = 0; i < contributions.length; i += 500) {
        const chunk = contributions.slice(i, i + 500);
        const { error } = await supabase
          .from("hansard_contributions")
          .upsert(chunk, { onConflict: "component_id" });
        if (error) throw error;
      }

      totalContributions += contributions.length;
    }

    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: totalContributions,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      reports_processed: recentReports.length,
      contributions: totalContributions,
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
