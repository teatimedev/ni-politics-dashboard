export interface NiAssemblyMember {
  PersonId: string;
  AffiliationId: string;
  MemberName: string;
  MemberLastName: string;
  MemberFirstName: string;
  MemberFullDisplayName: string;
  MemberSortName: string;
  MemberTitle: string;
  PartyName: string;
  PartyOrganisationId: string;
  ConstituencyName: string;
  ConstituencyId: string;
  MemberImgUrl: string;
  MemberPrefix: string;
}

export interface NiAssemblyMembersResponse {
  AllMembersList: {
    Member: NiAssemblyMember[];
  };
}

export interface NiAssemblyRole {
  PersonId: string;
  AffiliationId: string;
  MemberFullDisplayName: string;
  RoleType: string;
  Role: string;
  OrganisationId: string;
  Organisation: string;
  AffiliationStart: string;
  AffiliationTitle: string;
}

export interface NiAssemblyRolesResponse {
  AllMembersRoles: {
    Role: NiAssemblyRole[];
  };
}

export interface NiAssemblyDivision {
  EventID: string;
  SessionID: string;
  DivisionSubject: string;
  DivisionDate: string;
  DocumentID: string;
  DivisonType: string; // Note: API misspells "Division" as "Divison"
  DivisionResult: string;
  MemberVoting: string;
}

export interface NiAssemblyDivisionsResponse {
  DivisionList: {
    Division: NiAssemblyDivision[];
  };
}

export interface NiAssemblyDivisionResult {
  EventId: string;
  EventDate: string;
  Title: string;
  DocumentID: string;
  DecisionMethod: string;
  Outcome: string;
  DecisionType: string;
  TotalAyes: string;
  NationalistAyes: string;
  UnionistAyes: string;
  OtherAyes: string;
  TotalNoes: string;
  NationalistNoes: string;
  UnionistNoes: string;
  OtherNoes: string;
  TotalAbstentions: string;
  NationalistAbstentions: string;
  UnionistAbstentions: string;
  OtherAbstentions: string;
  MemberVoting: string;
}

export interface NiAssemblyDivisionResultResponse {
  DivisionDetails: {
    Division: NiAssemblyDivisionResult;
  };
}

export interface NiAssemblyMemberVote {
  DocumentID: string;
  EventID: string;
  PersonID: string;
  MemberName: string;
  Vote: string;
  Designation: string;
  VoteInVacancy: string;
  MemberSortName: string;
}

export interface NiAssemblyMemberVotingResponse {
  MemberVoting: {
    Member: NiAssemblyMemberVote[];
  };
}
