export interface Member {
  person_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  party: string | null;
  party_id: string | null;
  constituency: string | null;
  constituency_id: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberRole {
  id: string;
  person_id: string;
  role_name: string;
  role_type: string | null;
  organisation: string | null;
  organisation_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface SyncLogEntry {
  id: string;
  source: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_updated: number;
  error_message: string | null;
}
