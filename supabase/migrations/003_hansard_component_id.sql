-- Add component_id for deduplication against NI Assembly Hansard API
ALTER TABLE hansard_contributions
  ADD COLUMN IF NOT EXISTS component_id TEXT;

ALTER TABLE hansard_contributions
  ADD CONSTRAINT hansard_contributions_component_id_key UNIQUE (component_id);

CREATE INDEX IF NOT EXISTS idx_hansard_plenary ON hansard_contributions(plenary_id);
