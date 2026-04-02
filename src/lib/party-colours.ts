const PARTY_COLOURS: Record<string, string> = {
  "Sinn Féin": "bg-party-sf",
  "Democratic Unionist Party": "bg-party-dup",
  "Alliance Party": "bg-party-alliance",
  "Ulster Unionist Party": "bg-party-uup",
  "Social Democratic and Labour Party": "bg-party-sdlp",
  "Traditional Unionist Voice": "bg-party-tuv",
  "People Before Profit Alliance": "bg-party-pbp",
  "Green Party": "bg-party-green",
};

export function getPartyColourClass(party: string | null): string {
  if (!party) return "bg-party-independent";
  return PARTY_COLOURS[party] ?? "bg-party-independent";
}

const PARTY_SHORT: Record<string, string> = {
  "Sinn Féin": "SF",
  "Democratic Unionist Party": "DUP",
  "Alliance Party": "Alliance",
  "Ulster Unionist Party": "UUP",
  "Social Democratic and Labour Party": "SDLP",
  "Traditional Unionist Voice": "TUV",
  "People Before Profit Alliance": "PBP",
  "Green Party": "Green",
};

export function getPartyShortName(party: string | null): string {
  if (!party) return "Ind";
  return PARTY_SHORT[party] ?? party;
}

// Hex colours for Recharts (which needs hex strings, not Tailwind classes)
const PARTY_HEX: Record<string, string> = {
  "Sinn Féin": "#326932",
  "Democratic Unionist Party": "#1b2a5b",
  "Alliance Party": "#d4a843",
  "Ulster Unionist Party": "#3b82f6",
  "Social Democratic and Labour Party": "#2d8c3c",
  "Traditional Unionist Voice": "#1e2952",
  "People Before Profit Alliance": "#dc2626",
  "Green Party": "#22c55e",
};

export function getPartyHex(party: string | null): string {
  if (!party) return "#71717a";
  return PARTY_HEX[party] ?? "#71717a";
}

const DESIGNATION_HEX: Record<string, string> = {
  Nationalist: "#326932",
  Unionist: "#1b2a5b",
  Other: "#d4a843",
};

export function getDesignationHex(designation: string): string {
  return DESIGNATION_HEX[designation] ?? "#71717a";
}
