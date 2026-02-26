import type { Request } from 'express';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    orgId: string;
    role: string;
  }
}

export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    userId: string;
    orgId: string;
    role: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  avatar_url: string | null;
  email_verified: boolean;
  invite_token: string | null;
  reset_token: string | null;
  reset_token_exp: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Candidate {
  id: string;
  org_id: string;
  name: string;
  email: string;
  phone: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  current_title: string | null;
  current_company: string | null;
  total_experience_years: number | null;
  seniority_level: string | null;
  summary: string | null;
  skills: string[];
  extracted_data: CandidateExtractedData | null;
  resume_file_url: string;
  resume_file_name: string | null;
  resume_file_hash: string | null;
  resume_raw_text: string | null;
  processing_status: 'pending' | 'extracting' | 'embedding' | 'ready' | 'failed';
  processing_error: string | null;
  source: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CandidateExtractedData {
  workExperience: WorkExperience[];
  education: Education[];
  skills: SkillDetail[];
  certifications: string[];
  languages: string[];
  resumeSummaryForEmbedding: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  highlights: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number | null;
}

export interface SkillDetail {
  name: string;
  category: string;
  years: number | null;
  proficiency: string | null;
}

export interface CandidateEmbedding {
  id: string;
  candidate_id: string;
  embedding_type: string;
  embedding: number[];
  model_version: string;
  created_at: Date;
}

export interface JobDescription {
  id: string;
  org_id: string;
  created_by: string;
  title: string;
  description: string;
  requirements: Record<string, unknown> | null;
  embedding: number[] | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Shortlist {
  id: string;
  org_id: string;
  created_by: string;
  job_id: string | null;
  name: string;
  share_token: string | null;
  share_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ShortlistCandidate {
  id: string;
  shortlist_id: string;
  candidate_id: string;
  rank: number | null;
  match_score: number | null;
  match_reasoning: string | null;
  strengths: string[];
  gaps: string[];
  status: string;
  reviewer_notes: string | null;
  created_at: Date;
}

export interface SearchQuery {
  id: string;
  org_id: string;
  user_id: string;
  query_text: string;
  parsed_intent: ParsedSearchIntent | null;
  result_count: number | null;
  created_at: Date;
}

export interface ParsedSearchIntent {
  semanticQuery: string;
  filters: {
    minExperienceYears?: number;
    maxExperienceYears?: number;
    locationCity?: string;
    locationState?: string;
    requiredSkills?: string[];
    preferredSkills?: string[];
    seniority?: string;
  };
  rankingSignals: {
    mustHave: string[];
    preferred: string[];
    niceToHave: string[];
  };
}

export interface SearchResult {
  candidate: Candidate;
  matchScore: number;
  reasoning: string;
  strengths: string[];
  gaps: string[];
  evidence: string[];
}

export interface SearchResponse {
  candidates: SearchResult[];
  parsedQuery: ParsedSearchIntent;
  totalMatches: number;
}

export interface DashboardStats {
  totalCandidates: number;
  totalSearches: number;
  totalJobs: number;
  totalShortlists: number;
  readyCandidates: number;
  processingCandidates: number;
  failedCandidates: number;
}
