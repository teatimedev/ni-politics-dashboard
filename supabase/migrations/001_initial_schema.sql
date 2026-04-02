-- NI Politics Dashboard — Full Schema
-- All tables created upfront to avoid migration churn across phases

-- Core MLA table
CREATE TABLE members (
  person_id       TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  party           TEXT,
  party_id        TEXT,
  constituency    TEXT,
  constituency_id TEXT,
  photo_url       TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Roles (minister, committee chair, APG roles, etc.)
CREATE TABLE member_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  role_name       TEXT NOT NULL,
  role_type       TEXT,
  organisation    TEXT,
  organisation_id TEXT,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_member_roles_person ON member_roles(person_id);

-- Division (a single vote event)
CREATE TABLE divisions (
  division_id     TEXT PRIMARY KEY,
  date            DATE NOT NULL,
  title           TEXT,
  motion_text     TEXT,
  outcome         TEXT,
  ayes            INTEGER DEFAULT 0,
  noes            INTEGER DEFAULT 0,
  abstentions     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_divisions_date ON divisions(date);

-- How each MLA voted on each division
CREATE TABLE member_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  division_id     TEXT NOT NULL REFERENCES divisions(division_id) ON DELETE CASCADE,
  vote            TEXT NOT NULL,
  UNIQUE(person_id, division_id)
);

CREATE INDEX idx_member_votes_person ON member_votes(person_id);
CREATE INDEX idx_member_votes_division ON member_votes(division_id);

-- Register of Interests (from mySociety)
CREATE TABLE interests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  content         TEXT,
  date_published  DATE,
  first_register  DATE,
  last_register   DATE,
  in_latest       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interests_person ON interests(person_id);
CREATE INDEX idx_interests_category ON interests(category);

-- Annual expenses
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  year            TEXT NOT NULL,
  office_costs    NUMERIC,
  staffing_costs  NUMERIC,
  travel          NUMERIC,
  other           NUMERIC,
  total           NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id, year)
);

CREATE INDEX idx_expenses_person ON expenses(person_id);

-- Questions tabled by MLAs
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  question_text   TEXT,
  answer_text     TEXT,
  date            DATE,
  department      TEXT,
  question_type   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_person ON questions(person_id);
CREATE INDEX idx_questions_date ON questions(date);

-- Hansard contributions
CREATE TABLE hansard_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  debate_title    TEXT,
  content         TEXT,
  sentiment_score NUMERIC,
  plenary_id      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hansard_person ON hansard_contributions(person_id);
CREATE INDEX idx_hansard_date ON hansard_contributions(date);

-- Standards Commissioner investigations
CREATE TABLE standards_investigations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  ref             TEXT,
  date            DATE,
  subject         TEXT,
  outcome         TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_standards_person ON standards_investigations(person_id);

-- News mentions
CREATE TABLE news_mentions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline        TEXT,
  source          TEXT,
  url             TEXT UNIQUE,
  date            TIMESTAMPTZ,
  snippet         TEXT,
  article_sentiment NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_news_date ON news_mentions(date);

-- Junction: which MLAs were quoted in which articles
CREATE TABLE news_mla_quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id         UUID NOT NULL REFERENCES news_mentions(id) ON DELETE CASCADE,
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  quoted_text     TEXT,
  sentiment_score NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_news_quotes_person ON news_mla_quotes(person_id);
CREATE INDEX idx_news_quotes_news ON news_mla_quotes(news_id);

-- Party-level donations (Electoral Commission)
CREATE TABLE party_donations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party           TEXT,
  donor_name      TEXT,
  donor_status    TEXT,
  amount          NUMERIC,
  donation_type   TEXT,
  date_received   DATE,
  date_reported   DATE,
  date_accepted   DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_party_donations_party ON party_donations(party);

-- All-Party Groups
CREATE TABLE all_party_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name      TEXT NOT NULL,
  topic           TEXT,
  organisation_id TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- APG officers
CREATE TABLE apg_officers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES all_party_groups(id) ON DELETE CASCADE,
  person_id       TEXT NOT NULL REFERENCES members(person_id) ON DELETE CASCADE,
  role            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_apg_officers_person ON apg_officers(person_id);

-- Sync tracking
CREATE TABLE sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'running',
  records_updated INTEGER DEFAULT 0,
  error_message   TEXT
);

CREATE INDEX idx_sync_log_source ON sync_log(source);

-- Helper: update updated_at on members
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
