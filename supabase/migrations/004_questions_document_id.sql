-- Add document_id for deduplication against NI Assembly Questions API
ALTER TABLE questions ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE questions ADD CONSTRAINT questions_document_id_key UNIQUE (document_id);
