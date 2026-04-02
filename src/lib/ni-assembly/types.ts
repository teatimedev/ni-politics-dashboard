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
