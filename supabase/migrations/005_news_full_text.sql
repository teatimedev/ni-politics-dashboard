-- Add full article text to news_mentions for in-app reading
ALTER TABLE news_mentions ADD COLUMN IF NOT EXISTS full_text TEXT;
