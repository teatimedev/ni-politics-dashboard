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
