export interface User {
  id: string
  orgId: string
  email: string
  name: string
  role: 'admin' | 'recruiter' | 'viewer'
  avatarUrl?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  locationCity?: string
  locationState?: string
  locationCountry?: string
  currentTitle?: string
  currentCompany?: string
  totalExperienceYears?: number
  seniorityLevel?: string
  summary?: string
  skills: string[]
  extractedData?: CandidateExtractedData
  resumeFileName?: string
  processingStatus: 'pending' | 'extracting' | 'embedding' | 'ready' | 'failed'
  processingError?: string
  tags: string[]
  source?: string
  createdAt: string
  updatedAt: string
}

export interface CandidateExtractedData {
  workExperience: WorkExperience[]
  education: Education[]
  certifications: string[]
  languages: string[]
  skills: SkillDetail[]
}

export interface WorkExperience {
  company: string
  title: string
  startDate: string
  endDate?: string
  description: string
  highlights: string[]
}

export interface Education {
  institution: string
  degree: string
  field: string
  year: number
}

export interface SkillDetail {
  name: string
  category: string
  years?: number
  proficiency?: string
}

export interface SearchResult {
  candidate: Candidate
  matchScore: number
  reasoning: string
  strengths: string[]
  gaps: string[]
  evidence: string[]
}

export interface SearchResponse {
  candidates: SearchResult[]
  parsedQuery: Record<string, unknown>
  totalMatches: number
}

export interface JobDescription {
  id: string
  title: string
  description: string
  requirements?: Record<string, unknown>
  status: 'active' | 'closed' | 'draft'
  createdAt: string
  updatedAt: string
}

export interface Shortlist {
  id: string
  name: string
  jobId?: string
  shareToken?: string
  shareEnabled: boolean
  candidateCount?: number
  createdAt: string
  updatedAt: string
}

export interface ShortlistCandidate {
  id: string
  candidate: Candidate
  rank: number
  matchScore: number
  matchReasoning: string
  strengths: string[]
  gaps: string[]
  status: 'pending' | 'reviewed' | 'approved' | 'rejected'
  reviewerNotes?: string
}

export interface DashboardStats {
  totalCandidates: number
  readyCandidates: number
  processingCandidates: number
  failedCandidates: number
  totalSearches: number
  totalShortlists: number
  totalJobs: number
}
