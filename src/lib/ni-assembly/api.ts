import type {
  NiAssemblyMembersResponse,
  NiAssemblyRolesResponse,
} from "./types";

const BASE_URL = "https://data.niassembly.gov.uk";

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `NI Assembly API error: ${response.status} ${response.statusText} for ${endpoint}`
    );
  }
  return response.json();
}

export async function getAllCurrentMembers(): Promise<NiAssemblyMembersResponse> {
  return fetchJson<NiAssemblyMembersResponse>(
    "/members_json.ashx?m=GetAllCurrentMembers"
  );
}

export async function getAllMembers(): Promise<NiAssemblyMembersResponse> {
  return fetchJson<NiAssemblyMembersResponse>(
    "/members_json.ashx?m=GetAllMembers"
  );
}

export async function getAllMemberRoles(): Promise<NiAssemblyRolesResponse> {
  return fetchJson<NiAssemblyRolesResponse>(
    "/members_json.ashx?m=GetAllMemberRoles"
  );
}
