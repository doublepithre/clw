# ResumeAI — Intelligent Resume Search Platform

## Architecture & Implementation Plan

---

## 1. Product Overview

A SaaS platform that enables recruiters to search through 5-10 lakh (500K–1M) candidate resumes using natural language queries. The system parses PDF/DOCX resumes, extracts structured data, generates semantic embeddings, and provides AI-powered candidate ranking with reasoning — similar to [RecruitRyte](https://recruitryte.com/).

### Core Value Proposition
- **Natural language search** — "Find senior React developers with 5+ years experience in fintech who have led teams"
- **Reasoning-based ranking** — Not just keyword matching; understands role scope, skill equivalence, seniority signals
- **Match explanations** — Every result includes why a candidate is a fit (strengths, gaps, evidence)
- **Bulk operations** — Upload job descriptions and get ranked shortlists across the entire resume database

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + Vite | Modern SPA with fast HMR |
| **UI Components** | shadcn/ui + Radix | Accessible, composable, modern design system |
| **Styling** | Tailwind CSS v4 | Utility-first, consistent design tokens |
| **State Management** | TanStack Query + Zustand | Server state caching + minimal client state |
| **Backend** | Node.js + Express | Lightweight, high-throughput API server |
| **Language** | TypeScript (full stack) | Type safety across the entire codebase |
| **Database** | PostgreSQL (Cloud SQL) + pgvector | Relational data + vector similarity search |
| **Object Storage** | Google Cloud Storage (GCS) | Raw resume file storage (PDF/DOCX) |
| **Vector Embeddings** | Vertex AI Embeddings API (`text-embedding-005`) | 768-dim embeddings, GCP-native |
| **LLM** | Vertex AI (Gemini 2.0 Flash) | Query understanding, match reasoning, data extraction |
| **Queue/Async** | Google Cloud Pub/Sub | Async pipeline orchestration |
| **Resume Processing** | Cloud Run Jobs | Scalable batch/event-driven resume parsing |
| **API Hosting** | Cloud Run | Serverless, auto-scaling API |
| **Auth** | Firebase Auth | Google-native auth with social login |
| **CDN/Frontend** | Firebase Hosting | Global CDN for the SPA |
| **Monitoring** | Cloud Logging + Cloud Monitoring | Observability |
| **CI/CD** | Cloud Build | GCP-native CI/CD pipeline |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React SPA)                          │
│   Firebase Hosting / CDN                                                   │
│                                                                             │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Dashboard │ │  Search   │ │  Candidate   │ │  Upload  │ │  Settings  │  │
│  │   Page   │ │   Page    │ │  Profile     │ │  Center  │ │   Page     │  │
│  └──────────┘ └───────────┘ └──────────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ HTTPS / REST + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Cloud Run)                            │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │  Auth        │ │  Search      │ │  Candidate   │ │  Upload          │  │
│  │  Middleware  │ │  Controller  │ │  Controller  │ │  Controller      │  │
│  └──────────────┘ └──────┬───────┘ └──────────────┘ └───────┬──────────┘  │
│                          │                                    │             │
│  ┌──────────────┐ ┌──────┴───────┐ ┌──────────────┐ ┌───────┴──────────┐  │
│  │  Rate        │ │  Search      │ │  Candidate   │ │  Ingestion       │  │
│  │  Limiter     │ │  Service     │ │  Service     │ │  Service         │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘  │
└────────┬────────────────┬──────────────────┬────────────────┬──────────────┘
         │                │                  │                │
         ▼                ▼                  ▼                ▼
┌──────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐
│  Firebase    │ │  PostgreSQL    │ │  GCS Bucket    │ │  Pub/Sub         │
│  Auth        │ │  + pgvector    │ │  (Resume       │ │  (Pipeline       │
│              │ │  (Cloud SQL)   │ │   Files)       │ │   Events)        │
└──────────────┘ └────────────────┘ └────────────────┘ └────────┬─────────┘
                                                                 │
                              ┌──────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RESUME PROCESSING PIPELINE (Cloud Run Jobs)            │
│                                                                             │
│  Stage 1: Parse        Stage 2: Extract       Stage 3: Embed               │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│  │ PDF/DOCX     │─────▶│ LLM-based    │─────▶│ Generate     │             │
│  │ Text         │      │ Structured   │      │ Vector       │             │
│  │ Extraction   │      │ Data Extract │      │ Embeddings   │             │
│  └──────────────┘      └──────────────┘      └──────┬───────┘             │
│                                                      │                     │
│                                                      ▼                     │
│                                              ┌──────────────┐             │
│                                              │ Store in     │             │
│                                              │ PostgreSQL   │             │
│                                              │ + pgvector   │             │
│                                              └──────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Resume Processing Pipeline (Detailed)

This is the most critical component — the ingestion pipeline that transforms raw resumes into searchable, ranked candidates.

### Stage 1: File Upload & Storage

```
Recruiter uploads PDF/DOCX
        │
        ▼
┌─────────────────┐
│  Upload API     │ ── Validates file type, size (max 10MB)
│  (Cloud Run)    │ ── Generates unique ID
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│  GCS   │ │  Pub/Sub │ ── Publishes "resume.uploaded" event
│ Bucket │ │  Topic   │
└────────┘ └──────────┘
```

- **Bulk upload**: Support ZIP archives containing multiple resumes
- **Deduplication**: Hash-based check (SHA-256 of file content) to avoid re-processing
- **File naming**: `resumes/{org_id}/{candidate_id}/{original_filename}`

### Stage 2: Text Extraction

```
Pub/Sub triggers Cloud Run Job
        │
        ▼
┌─────────────────────────────────┐
│  Text Extraction Worker         │
│                                  │
│  PDF  → pdf-parse / pdf2json    │
│  DOCX → officeparser v6 (AST)  │
│  DOC  → libreoffice → PDF →    │
│          pdf-parse              │
└────────────┬────────────────────┘
             │
             ▼
      Raw text + basic
      structure preserved
```

**Libraries:**
- `pdf-parse` for PDF text extraction
- `officeparser` v6 for DOCX (produces AST with paragraphs, headings, tables)
- Fallback: GCP Document AI for scanned/image-heavy PDFs (OCR)

### Stage 3: LLM-Based Structured Extraction

This is where we use Gemini to understand the resume content and extract structured fields.

```
Raw resume text
        │
        ▼
┌─────────────────────────────────┐
│  Gemini 2.0 Flash               │
│  (Vertex AI)                     │
│                                  │
│  Prompt: Extract structured     │
│  candidate data from resume     │
│  in JSON format                 │
└────────────┬────────────────────┘
             │
             ▼
   Structured JSON:
   {
     "name": "...",
     "email": "...",
     "phone": "...",
     "location": { "city": "...", "state": "...", "country": "..." },
     "current_title": "...",
     "total_experience_years": 8,
     "summary": "...",
     "skills": [
       { "name": "React", "category": "frontend", "years": 5 },
       { "name": "Node.js", "category": "backend", "years": 4 }
     ],
     "work_experience": [
       {
         "company": "...",
         "title": "...",
         "start_date": "2020-01",
         "end_date": "2023-06",
         "description": "...",
         "highlights": ["Led team of 8", "Built microservices"]
       }
     ],
     "education": [
       {
         "institution": "...",
         "degree": "B.Tech",
         "field": "Computer Science",
         "year": 2016
       }
     ],
     "certifications": ["AWS Solutions Architect", "..."],
     "languages": ["English", "Hindi"],
     "resume_summary_for_embedding": "..." // LLM-generated dense summary
   }
```

**Why LLM extraction over regex:**
- Resumes have infinite format variations
- LLM understands context ("Led a team of 8 engineers" → leadership experience)
- Generates a clean, normalized summary optimized for embedding quality
- Handles multilingual resumes

### Stage 4: Embedding Generation

```
Structured data + resume_summary_for_embedding
        │
        ▼
┌────────────────────────────────────┐
│  Vertex AI Embeddings API          │
│  Model: text-embedding-005         │
│  Dimensions: 768                   │
│                                     │
│  Input: Concatenated string of:    │
│    - resume_summary_for_embedding  │
│    - current_title                 │
│    - skills (comma-separated)      │
│    - recent work highlights        │
└────────────┬───────────────────────┘
             │
             ▼
     768-dim float vector
        │
        ▼
┌────────────────────────────────────┐
│  PostgreSQL + pgvector             │
│                                     │
│  INSERT INTO candidate_embeddings  │
│  (candidate_id, embedding, ...)    │
└────────────────────────────────────┘
```

**Embedding strategy:**
- One primary embedding per candidate (dense summary + key attributes)
- Optionally: separate embeddings per work experience entry for fine-grained matching
- Batch embedding API calls (up to 250 texts per request for efficiency)

### Stage 5: Metadata Indexing

After extraction, structured metadata is stored in PostgreSQL for hybrid search (vector + filters):

- **Skills** → normalized skill taxonomy, stored in a separate `candidate_skills` table with GIN index
- **Experience years** → numeric, filterable
- **Location** → city/state/country, filterable
- **Current title** → text, searchable
- **Education** → degree level, field
- **Last active** → timestamp

---

## 5. Search Pipeline (Query Time)

```
Recruiter types: "Senior React developer with fintech
                  experience, 5+ years, based in Bangalore"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Step 1: Query Understanding (Gemini 2.0 Flash)        │
│                                                         │
│  Input:  Natural language query                        │
│  Output: Structured search intent                      │
│  {                                                      │
│    "semantic_query": "senior React developer fintech   │
│                       experience team leadership",     │
│    "filters": {                                        │
│      "min_experience_years": 5,                        │
│      "location_city": "Bangalore",                     │
│      "required_skills": ["React"],                     │
│      "preferred_skills": ["TypeScript", "Node.js"],    │
│      "seniority": "senior"                             │
│    },                                                  │
│    "ranking_signals": {                                │
│      "must_have": ["React", "fintech"],                │
│      "preferred": ["team leadership", "system design"],│
│      "nice_to_have": ["open source contributor"]       │
│    }                                                   │
│  }                                                      │
└──────────┬───────────────────────────┬──────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  Step 2a: Vector     │    │  Step 2b: Metadata Filter   │
│  Similarity Search   │    │  (PostgreSQL WHERE clause)  │
│                      │    │                              │
│  Embed the           │    │  WHERE experience >= 5      │
│  semantic_query →    │    │    AND location = 'Bangalore'│
│  768-dim vector      │    │    AND skills @> '{React}'   │
│                      │    │                              │
│  pgvector:           │    │  Returns candidate_id set   │
│  ORDER BY embedding  │    │                              │
│  <=> query_vector    │    │                              │
│  LIMIT 200           │    │                              │
└──────────┬───────────┘    └──────────────┬──────────────┘
           │                               │
           └───────────┬───────────────────┘
                       ▼
           ┌─────────────────────┐
           │  Step 3: Merge &    │
           │  Re-rank            │
           │                      │
           │  Combine vector      │
           │  similarity score    │
           │  with filter match   │
           │  using RRF (Reciprocal│
           │  Rank Fusion)        │
           │                      │
           │  Top 50 candidates   │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────────────────────────┐
           │  Step 4: LLM Re-ranking & Reasoning     │
           │  (Gemini 2.0 Flash)                      │
           │                                          │
           │  For top 50 candidates, evaluate:        │
           │  - Role fit score (0-100)                │
           │  - Strengths                             │
           │  - Gaps                                  │
           │  - Evidence from resume                  │
           │  - Overall recommendation                │
           │                                          │
           │  Batch: 10 candidates per LLM call × 5   │
           └──────────┬──────────────────────────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  Step 5: Return     │
           │  ranked results     │
           │  with explanations  │
           │                      │
           │  Top 20 candidates  │
           │  + match score      │
           │  + reasoning        │
           └─────────────────────┘
```

### Search Performance Targets
- **Query understanding**: ~500ms (Gemini Flash)
- **Vector search + filter**: ~50-100ms (pgvector with HNSW index)
- **LLM re-ranking**: ~2-3s (parallelized, streamed)
- **Total end-to-end**: < 4s for first results (stream progressively)

---

## 6. Database Schema

```sql
-- Core tables

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Organizations (multi-tenant)
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan            VARCHAR(50) DEFAULT 'free',
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Users / Recruiters
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    firebase_uid    VARCHAR(128) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'recruiter', -- admin, recruiter, viewer
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates (core entity)
CREATE TABLE candidates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID REFERENCES organizations(id),

    -- Basic info (LLM-extracted)
    name                    VARCHAR(255),
    email                   VARCHAR(255),
    phone                   VARCHAR(50),
    location_city           VARCHAR(100),
    location_state          VARCHAR(100),
    location_country        VARCHAR(100),

    -- Professional info
    current_title           VARCHAR(255),
    current_company         VARCHAR(255),
    total_experience_years  DECIMAL(4,1),
    seniority_level         VARCHAR(50), -- intern, junior, mid, senior, lead, principal, executive

    -- Rich extracted data
    summary                 TEXT,              -- LLM-generated summary
    skills                  TEXT[],            -- Normalized skill array
    extracted_data          JSONB,             -- Full structured extraction (work exp, education, etc.)

    -- Resume file reference
    resume_file_url         TEXT NOT NULL,      -- GCS URL
    resume_file_name        TEXT,
    resume_file_hash        VARCHAR(64),        -- SHA-256 for dedup
    resume_raw_text         TEXT,               -- Extracted plain text

    -- Processing status
    processing_status       VARCHAR(50) DEFAULT 'pending',
                            -- pending, extracting, embedding, ready, failed
    processing_error        TEXT,

    -- Metadata
    source                  VARCHAR(100),       -- upload, api, bulk_import
    tags                    TEXT[],
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings (separate table for flexibility)
CREATE TABLE candidate_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
    embedding_type  VARCHAR(50) DEFAULT 'primary', -- primary, work_exp_1, work_exp_2, etc.
    embedding       vector(768) NOT NULL,
    model_version   VARCHAR(50) DEFAULT 'text-embedding-005',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_candidate_embeddings_hnsw
    ON candidate_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Candidate skills (normalized, for filtering)
CREATE TABLE candidate_skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
    skill_name      VARCHAR(100) NOT NULL,
    skill_category  VARCHAR(50),   -- frontend, backend, database, devops, soft_skill, etc.
    years           DECIMAL(3,1),
    proficiency     VARCHAR(20)    -- beginner, intermediate, advanced, expert
);

-- Job descriptions (for matching)
CREATE TABLE job_descriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    requirements    JSONB,          -- Structured requirements extracted by LLM
    embedding       vector(768),    -- For similarity matching
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Search history
CREATE TABLE search_queries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id),
    query_text      TEXT NOT NULL,
    parsed_intent   JSONB,          -- LLM-parsed search intent
    result_count    INT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Saved shortlists
CREATE TABLE shortlists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    job_id          UUID REFERENCES job_descriptions(id),
    name            VARCHAR(255) NOT NULL,
    share_token     VARCHAR(64) UNIQUE,   -- For secure external sharing
    share_enabled   BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shortlist_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortlist_id    UUID REFERENCES shortlists(id) ON DELETE CASCADE,
    candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
    rank            INT,
    match_score     DECIMAL(5,2),
    match_reasoning TEXT,           -- LLM-generated explanation
    strengths       TEXT[],
    gaps            TEXT[],
    status          VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, approved, rejected
    reviewer_notes  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidates_org ON candidates(org_id);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_location ON candidates(location_city, location_state);
CREATE INDEX idx_candidates_experience ON candidates(total_experience_years);
CREATE INDEX idx_candidates_status ON candidates(processing_status);
CREATE INDEX idx_candidates_hash ON candidates(resume_file_hash);
CREATE INDEX idx_candidate_skills_name ON candidate_skills(skill_name);
CREATE INDEX idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX idx_shortlist_share ON shortlists(share_token) WHERE share_enabled = TRUE;
```

---

## 7. API Design

### Authentication
All endpoints require `Authorization: Bearer <firebase_id_token>` header.

### Endpoints

```
BASE URL: https://api.resumeai.app/v1

─── Auth ───
POST   /auth/register              Register org + first user
POST   /auth/invite                Invite team member

─── Candidates ───
GET    /candidates                 List candidates (paginated, filterable)
GET    /candidates/:id             Get candidate detail + extracted data
POST   /candidates/upload          Upload single resume (PDF/DOCX)
POST   /candidates/upload/bulk     Upload ZIP or multiple files
DELETE /candidates/:id             Remove candidate
GET    /candidates/:id/resume      Download original resume file
PATCH  /candidates/:id/tags        Update candidate tags

─── Search ───
POST   /search                     Natural language search
       Body: {
         "query": "Senior React developer in Bangalore...",
         "filters": { ... },        // Optional explicit filters
         "limit": 20,
         "offset": 0
       }
       Response: {
         "candidates": [
           {
             "candidate": { ... },
             "match_score": 92.5,
             "reasoning": "Strong match because...",
             "strengths": ["5+ years React", "fintech at PayTM"],
             "gaps": ["No explicit team lead title"],
             "evidence": ["Led team of 8 at PayTM (2021-2023)"]
           }
         ],
         "parsed_query": { ... },
         "total_matches": 145
       }

POST   /search/match               Match single resume against job description
       Body: { "resume_id": "...", "job_description": "..." }

─── Job Descriptions ───
POST   /jobs                       Create job description
GET    /jobs                       List job descriptions
GET    /jobs/:id                   Get job description detail
POST   /jobs/:id/find-candidates   Find candidates matching this JD
PUT    /jobs/:id                   Update job description
DELETE /jobs/:id                   Delete job description

─── Shortlists ───
POST   /shortlists                 Create shortlist from search results
GET    /shortlists                 List shortlists
GET    /shortlists/:id             Get shortlist with candidates
PATCH  /shortlists/:id/share       Enable/disable sharing
GET    /shared/:token              Public shortlist view (no auth)
PATCH  /shortlists/:id/candidates/:cid   Update candidate status/notes

─── Analytics ───
GET    /analytics/dashboard        Dashboard stats (total candidates, searches, etc.)
GET    /analytics/search-history   Recent search history

─── Settings ───
GET    /settings/org               Organization settings
PATCH  /settings/org               Update org settings
GET    /settings/usage             API usage / quota info
```

---

## 8. Frontend Pages & Components

### Page Structure

```
/                        → Landing page (marketing)
/login                   → Login / Register
/dashboard               → Recruiter dashboard
/search                  → Main search interface (hero feature)
/candidates              → Candidate database browser
/candidates/:id          → Candidate profile detail
/upload                  → Resume upload center
/jobs                    → Job descriptions manager
/jobs/:id                → Job detail + matched candidates
/shortlists              → Saved shortlists
/shortlists/:id          → Shortlist detail view
/shared/:token           → Public shared shortlist (no auth)
/settings                → Organization settings
```

### Key UI Components

**1. Search Page (Hero Feature)**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search Bar (full width, prominent)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ "Find senior React developers with fintech experience  ││
│  │  in Bangalore, 5+ years..."                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─── Filters (collapsible) ─────────────────────────────┐  │
│  │ Experience: [5+] Location: [Bangalore] Skills: [React] │  │
│  │ Seniority: [Senior] Must-have ○ Preferred ○ Nice-to-have│ │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Results: 145 candidates found                    [Save as  │
│                                              Shortlist]      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Rahul Sharma  ████████████ 95%  Senior Engineer   │   │
│  │    PayTM → Razorpay │ 8 yrs │ Bangalore              │   │
│  │    ✓ React (5yr) ✓ Fintech ✓ Team Lead               │   │
│  │    "Strong match: Led frontend team at PayTM..."      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 2. Priya Patel   ████████████ 91%  Tech Lead         │   │
│  │    Flipkart → CRED │ 7 yrs │ Bangalore               │   │
│  │    ✓ React (4yr) ✓ E-commerce ⚠ No fintech           │   │
│  │    "Good fit: Strong React skills, e-commerce..."     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**2. Candidate Profile Page**
- Header: Name, title, location, contact
- Match scores (when accessed from search context)
- Skills grid with proficiency levels
- Work experience timeline
- Education section
- Original resume download
- Actions: Add to shortlist, tag, notes

**3. Upload Center**
- Drag-and-drop zone for files/ZIP
- Upload progress with real-time status
- Processing pipeline status (extracting → embedding → ready)
- Bulk upload history

**4. Dashboard**
- Total candidates count
- Recent searches
- Processing pipeline status (pending/processing/ready)
- Shortlist activity feed
- Usage metrics

### Design System
- **Color palette**: Professional blues/grays with accent colors for scores
  - Primary: Indigo-600 (#4F46E5)
  - Success: Emerald-500 (high match)
  - Warning: Amber-500 (partial match)
  - Background: Slate-50 / White
- **Typography**: Inter font family
- **Cards**: Rounded-xl with subtle shadows
- **Animations**: Framer Motion for page transitions and result loading
- **Dark mode**: Full dark mode support via Tailwind's `dark:` classes

---

## 9. Project Structure

```
resumeai/
├── frontend/                          # React SPA
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── layout/               # Header, Sidebar, Footer
│   │   │   ├── search/               # SearchBar, SearchFilters, ResultCard
│   │   │   ├── candidates/           # CandidateCard, CandidateProfile
│   │   │   ├── upload/               # DropZone, UploadProgress
│   │   │   ├── shortlists/           # ShortlistCard, ShortlistShare
│   │   │   └── dashboard/            # StatCards, ActivityFeed
│   │   ├── pages/                     # Route-level components
│   │   ├── hooks/                     # Custom hooks (useSearch, useCandidates)
│   │   ├── lib/                       # Utilities, API client, auth
│   │   ├── stores/                    # Zustand stores
│   │   ├── types/                     # TypeScript types/interfaces
│   │   └── App.tsx
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                           # Node.js API
│   ├── src/
│   │   ├── config/                    # Environment, database, GCP configs
│   │   ├── middleware/                # Auth, rate-limit, error handling, validation
│   │   ├── routes/                    # Express route definitions
│   │   ├── controllers/              # Request handlers
│   │   ├── services/                  # Business logic
│   │   │   ├── search.service.ts      # Search orchestration
│   │   │   ├── embedding.service.ts   # Vertex AI embeddings
│   │   │   ├── llm.service.ts         # Gemini interactions
│   │   │   ├── parsing.service.ts     # Resume text extraction
│   │   │   ├── extraction.service.ts  # LLM-based structured extraction
│   │   │   ├── candidate.service.ts   # Candidate CRUD
│   │   │   ├── shortlist.service.ts   # Shortlist management
│   │   │   └── upload.service.ts      # File upload handling
│   │   ├── workers/                   # Pipeline workers
│   │   │   ├── parse.worker.ts        # Text extraction worker
│   │   │   ├── extract.worker.ts      # LLM extraction worker
│   │   │   └── embed.worker.ts        # Embedding generation worker
│   │   ├── models/                    # Database models / queries
│   │   ├── types/                     # Shared TypeScript types
│   │   └── app.ts                     # Express app setup
│   ├── migrations/                    # PostgreSQL migrations
│   ├── Dockerfile
│   └── package.json
│
├── shared/                            # Shared types between frontend & backend
│   └── types/
│
├── infra/                             # Infrastructure as Code
│   ├── terraform/                     # GCP infrastructure
│   │   ├── main.tf
│   │   ├── cloud-run.tf
│   │   ├── cloud-sql.tf
│   │   ├── pubsub.tf
│   │   ├── gcs.tf
│   │   └── variables.tf
│   └── cloudbuild.yaml                # CI/CD pipeline
│
├── docker-compose.yml                 # Local development
├── .env.example
├── package.json                       # Root workspace
├── turbo.json                         # Turborepo config
└── README.md
```

---

## 10. GCP Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                      │
│                                                               │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ Firebase Hosting │    │ Cloud Run (API)               │    │
│  │ (Frontend SPA)   │───▶│ - Min instances: 1            │    │
│  │ + CDN            │    │ - Max instances: 10           │    │
│  └─────────────────┘    │ - CPU: 2 / Memory: 2Gi        │    │
│                          │ - Concurrency: 80              │    │
│                          └───────┬──────────────────────┘    │
│                                  │                            │
│         ┌────────────────────────┼────────────────────┐      │
│         ▼                        ▼                    ▼      │
│  ┌──────────────┐  ┌───────────────────┐  ┌───────────────┐ │
│  │ Cloud SQL     │  │ GCS Bucket        │  │ Pub/Sub       │ │
│  │ PostgreSQL 15 │  │ (Resume storage)  │  │ Topics:       │ │
│  │ + pgvector    │  │ Standard class    │  │ - resume.parse│ │
│  │               │  │ Lifecycle: 90d →  │  │ - resume.extract│
│  │ HA: Regional  │  │   Nearline        │  │ - resume.embed│ │
│  │ vCPU: 4       │  │                   │  │               │ │
│  │ RAM: 16GB     │  │                   │  │               │ │
│  │ SSD: 100GB    │  │                   │  │               │ │
│  └──────────────┘  └───────────────────┘  └───────┬───────┘ │
│                                                     │        │
│                                           ┌─────────▼──────┐ │
│                                           │ Cloud Run Jobs  │ │
│                                           │ (Workers)       │ │
│                                           │                 │ │
│                                           │ - Parse Worker  │ │
│                                           │ - Extract Worker│ │
│                                           │ - Embed Worker  │ │
│                                           │                 │ │
│                                           │ CPU: 4 / 8Gi   │ │
│                                           │ Timeout: 15min  │ │
│                                           └─────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Vertex AI                                             │    │
│  │ - Embeddings API (text-embedding-005)                 │    │
│  │ - Gemini 2.0 Flash (extraction + ranking)             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ Firebase Auth   │  │ Secret Mgr │  │ Cloud Monitoring  │   │
│  │ (Authentication)│  │ (API keys) │  │ + Cloud Logging   │   │
│  └────────────────┘  └────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Cost Estimates (Monthly, ~750K resumes)

| Service | Estimated Cost |
|---------|---------------|
| Cloud SQL (4 vCPU, 16GB, HA) | ~$350/mo |
| Cloud Run (API, avg 2 instances) | ~$100/mo |
| Cloud Run Jobs (workers) | ~$50/mo (scales to zero) |
| GCS (750K files, ~75GB) | ~$2/mo |
| Vertex AI Embeddings (initial bulk) | ~$50 one-time |
| Vertex AI Gemini (extraction + search) | ~$200/mo |
| Firebase Auth + Hosting | ~$25/mo |
| Pub/Sub | ~$5/mo |
| **Total** | **~$750/mo** |

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project scaffolding (monorepo, frontend, backend)
- [ ] Database setup with migrations
- [ ] Firebase Auth integration
- [ ] Basic CRUD API (candidates, jobs)
- [ ] File upload to GCS
- [ ] Frontend: Login, Dashboard, Upload page

### Phase 2: Processing Pipeline (Week 3-4)
- [ ] Text extraction service (PDF/DOCX)
- [ ] LLM-based structured extraction (Gemini)
- [ ] Embedding generation service
- [ ] Pub/Sub pipeline orchestration
- [ ] Processing status tracking
- [ ] Frontend: Upload progress, candidate list

### Phase 3: Search (Week 5-6)
- [ ] Query understanding service (LLM)
- [ ] Vector similarity search (pgvector)
- [ ] Hybrid search (vector + metadata filters)
- [ ] LLM re-ranking with reasoning
- [ ] Frontend: Search page with filters and results

### Phase 4: Shortlists & Sharing (Week 7)
- [ ] Shortlist CRUD
- [ ] Save search results to shortlist
- [ ] Secure sharing with token-based access
- [ ] Public shortlist view
- [ ] Frontend: Shortlist management and sharing

### Phase 5: Polish & Deploy (Week 8)
- [ ] Dashboard analytics
- [ ] Bulk upload (ZIP support)
- [ ] Performance optimization (caching, pagination)
- [ ] Terraform infrastructure setup
- [ ] CI/CD pipeline (Cloud Build)
- [ ] Production deployment
- [ ] Dark mode

---

## 12. Key Technical Decisions & Trade-offs

### Why pgvector over a dedicated vector DB (Pinecone/Weaviate)?
- **Simplicity**: One database for structured data + vectors. No sync overhead.
- **Cost**: No additional managed service cost.
- **Hybrid search**: Native SQL filters combined with vector search in one query.
- **Scale**: pgvector with HNSW handles 1M vectors with <100ms query times.
- **Trade-off**: If we exceed ~5M candidates, consider migrating to Vertex AI Vector Search 2.0.

### Why Gemini over OpenAI?
- **GCP-native**: Lower latency, no cross-cloud egress.
- **Gemini 2.0 Flash**: Fast, cheap, excellent at structured extraction.
- **Vertex AI integration**: Unified billing, IAM, monitoring.

### Why Cloud Run over GKE?
- **Serverless**: No cluster management.
- **Scale-to-zero**: Workers idle when not processing.
- **Cost-effective**: Pay only for actual compute time.
- **Trade-off**: If we need persistent connections or complex scheduling, consider GKE.

### Why Pub/Sub pipeline over synchronous processing?
- **Reliability**: Messages are durable; no data loss if a worker crashes.
- **Scale**: Workers scale independently based on queue depth.
- **Observability**: Each stage is independently monitored.
- **Retry**: Built-in retry with dead-letter queues for failed messages.
