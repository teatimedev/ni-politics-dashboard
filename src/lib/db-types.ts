// Typed shapes for Supabase select+join results used in page components.
// These match the exact .select() strings used in each page.

import type { HansardContribution } from "./types";

/** page.tsx — recentHansard select */
export interface HansardWithMember extends HansardContribution {
  members: { name: string };
}

/** page.tsx — recentQuestions select */
export interface QuestionWithMember {
  id: string;
  person_id: string;
  date: string | null;
  question_text: string | null;
  department: string | null;
  question_type: string | null;
  members: { name: string };
}

/** page.tsx — syncLogs */
export interface SyncLogLatest {
  source: string;
  status: string;
  completed_at: string | null;
  records_updated: number;
}

/** mla/[personId] — votes with division join */
export interface VoteWithDivision {
  id: string;
  vote: string;
  designation: string | null;
  divisions: {
    division_id: string;
    date: string;
    title: string | null;
    outcome: string | null;
    ayes: number;
    noes: number;
    division_type: string | null;
  };
}

/** mla/[personId] — news quotes with article join */
export interface NewsQuoteWithArticle {
  id: string;
  quoted_text: string | null;
  sentiment_score: number | null;
  news_mentions: {
    headline: string | null;
    source: string | null;
    url: string | null;
    date: string | null;
  };
}

/** money/page.tsx — interests with member join */
export interface InterestWithMember {
  id: string;
  person_id: string;
  category: string;
  content: string | null;
  date_published: string | null;
  in_latest: boolean;
  members: { person_id: string; name: string };
}

/** news/page.tsx — articles with quotes+member join */
export interface NewsArticleWithQuotes {
  id: string;
  headline: string | null;
  source: string | null;
  url: string | null;
  date: string | null;
  snippet: string | null;
  full_text: string | null;
  article_sentiment: number | null;
  category: string | null;
  news_mla_quotes: Array<{
    id: string;
    person_id: string;
    quoted_text: string | null;
    sentiment_score: number | null;
    members: { name: string; party: string | null };
  }>;
}
