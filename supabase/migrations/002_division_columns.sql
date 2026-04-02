-- Add columns missing from Phase 1 schema that the API provides

-- Division type (Simple Majority, Cross-Community, etc.)
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS division_type TEXT;

-- Designation breakdowns from GetDivisionResult
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS nationalist_ayes INTEGER DEFAULT 0;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS unionist_ayes INTEGER DEFAULT 0;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS other_ayes INTEGER DEFAULT 0;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS nationalist_noes INTEGER DEFAULT 0;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS unionist_noes INTEGER DEFAULT 0;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS other_noes INTEGER DEFAULT 0;

-- Member votes: add designation column
ALTER TABLE member_votes ADD COLUMN IF NOT EXISTS designation TEXT;
