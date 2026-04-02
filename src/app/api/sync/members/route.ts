import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllCurrentMembers, getAllMemberRoles } from "@/lib/ni-assembly/api";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  // Create sync log entry
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ source: "members", started_at: startedAt })
    .select("id")
    .single();

  try {
    // Fetch current members from NI Assembly API
    const membersResponse = await getAllCurrentMembers();
    const apiMembers = membersResponse.AllMembersList.Member;

    // Mark all members as inactive first, then re-activate current ones
    await supabase
      .from("members")
      .update({ active: false })
      .neq("person_id", "");

    // Upsert members
    const memberRows = apiMembers.map((m) => ({
      person_id: m.PersonId,
      name: m.MemberFullDisplayName,
      first_name: m.MemberFirstName,
      last_name: m.MemberLastName,
      party: m.PartyName,
      party_id: m.PartyOrganisationId,
      constituency: m.ConstituencyName,
      constituency_id: m.ConstituencyId,
      photo_url: m.MemberImgUrl || null,
      active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error: membersError } = await supabase
      .from("members")
      .upsert(memberRows, { onConflict: "person_id" });

    if (membersError) throw membersError;

    // Fetch and sync roles
    const rolesResponse = await getAllMemberRoles();
    const apiRoles = rolesResponse.AllMembersRoles.Role;

    // Get current member person_ids for filtering
    const currentPersonIds = new Set(apiMembers.map((m) => m.PersonId));

    // Delete existing roles for current members and re-insert
    // (roles don't have stable IDs, so replace is simpler than diffing)
    await supabase
      .from("member_roles")
      .delete()
      .in("person_id", Array.from(currentPersonIds));

    const roleRows = apiRoles
      .filter((r) => currentPersonIds.has(r.PersonId))
      .map((r) => ({
        person_id: r.PersonId,
        role_name: r.Role,
        role_type: r.RoleType,
        organisation: r.Organisation,
        organisation_id: r.OrganisationId,
        start_date: r.AffiliationStart
          ? r.AffiliationStart.split("T")[0]
          : null,
      }));

    // Batch insert in chunks of 500 (Supabase limit)
    for (let i = 0; i < roleRows.length; i += 500) {
      const chunk = roleRows.slice(i, i + 500);
      const { error: rolesError } = await supabase
        .from("member_roles")
        .insert(chunk);
      if (rolesError) throw rolesError;
    }

    // Update sync log
    await supabase
      .from("sync_log")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_updated: memberRows.length,
      })
      .eq("id", logEntry!.id);

    return NextResponse.json({
      success: true,
      members: memberRows.length,
      roles: roleRows.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

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
