-- Add component_id for deduplication against NI Assembly Hansard API
ALTER TABLE hansard_contributions
  ADD COLUMN IF NOT EXISTS component_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hansard_component_id
  ON hansard_contributions(component_id)
  WHERE component_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hansard_plenary ON hansard_contributions(plenary_id);
