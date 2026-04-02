import type {
  NiAssemblyMembersResponse,
  NiAssemblyRolesResponse,
  NiAssemblyDivisionsResponse,
  NiAssemblyDivisionResultResponse,
  NiAssemblyMemberVotingResponse,
  NiAssemblyHansardReportsResponse,
  NiAssemblyHansardComponentsResponse,
  NiAssemblyQuestionsResponse,
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

export async function getDivisions(
  startDate: string,
  endDate: string
): Promise<NiAssemblyDivisionsResponse> {
  return fetchJson<NiAssemblyDivisionsResponse>(
    `/plenary_json.ashx?m=GetVotesOnDivision&startDate=${startDate}&endDate=${endDate}`
  );
}

export async function getDivisionResult(
  documentId: string
): Promise<NiAssemblyDivisionResultResponse> {
  return fetchJson<NiAssemblyDivisionResultResponse>(
    `/plenary_json.ashx?m=GetDivisionResult&documentId=${documentId}`
  );
}

export async function getDivisionMemberVoting(
  documentId: string
): Promise<NiAssemblyMemberVotingResponse> {
  return fetchJson<NiAssemblyMemberVotingResponse>(
    `/plenary_json.ashx?m=GetDivisionMemberVoting&documentId=${documentId}`
  );
}

export async function getAllHansardReports(): Promise<NiAssemblyHansardReportsResponse> {
  return fetchJson<NiAssemblyHansardReportsResponse>(
    "/hansard.asmx/GetAllHansardReports_JSON"
  );
}

export async function getHansardComponentsByPlenaryDate(
  plenaryDate: string
): Promise<NiAssemblyHansardComponentsResponse> {
  return fetchJson<NiAssemblyHansardComponentsResponse>(
    `/hansard.asmx/GetHansardComponentsByPlenaryDate_JSON?plenaryDate=${plenaryDate}`
  );
}

export async function getWrittenQuestions(
  startDate: string,
  endDate: string
): Promise<NiAssemblyQuestionsResponse> {
  return fetchJson<NiAssemblyQuestionsResponse>(
    `/questions_json.ashx?m=GetQuestionsForWrittenAnswer_TabledInRange&startDate=${startDate}&endDate=${endDate}`
  );
}

export async function getOralQuestions(
  startDate: string,
  endDate: string
): Promise<NiAssemblyQuestionsResponse> {
  return fetchJson<NiAssemblyQuestionsResponse>(
    `/questions_json.ashx?m=GetQuestionsForOralAnswer_TabledInRange&startDate=${startDate}&endDate=${endDate}`
  );
}
