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
| **Database** | PostgreSQL (installed on VM) + pgvector | Relational data + vector similarity search, co-located for low latency |
| **Object Storage** | Google Cloud Storage (GCS) | Raw resume file storage (PDF/DOCX) |
| **Vector Embeddings** | Vertex AI Embeddings API (`text-embedding-005`) | 768-dim embeddings, GCP-native |
| **LLM** | Vertex AI (Gemini 2.0 Flash) | Query understanding, match reasoning, data extraction |
| **Queue/Async** | BullMQ + Redis (on VM) | Async pipeline orchestration, no managed service cost |
| **Resume Processing** | Worker processes (on VM) | Background workers via BullMQ on the same VM |
| **API Hosting** | GCP Compute Engine VM | Persistent VM running Node.js via PM2/systemd |
| **Auth** | Native session auth (express-session + bcrypt) | Server-side sessions stored in PostgreSQL, no third-party dependency |
| **CDN/Frontend** | Netlify | Global CDN, auto-deploys from git, API proxy to GCP VM |
| **Monitoring** | Cloud Logging + PM2 logs + UptimeRobot | Observability |
| **CI/CD** | GitHub Actions + Netlify (frontend) | CI runs tests, deploys backend via SSH to VM |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React SPA)                          │
│   Netlify CDN (auto-deploy from Git)                                       │
│                                                                             │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Dashboard │ │  Search   │ │  Candidate   │ │  Upload  │ │  Settings  │  │
│  │   Page   │ │   Page    │ │  Profile     │ │  Center  │ │   Page     │  │
│  └──────────┘ └───────────┘ └──────────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ HTTPS (Netlify proxy: /api/* → GCP VM)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GCP COMPUTE ENGINE VM (API + Workers)                    │
│                    (e.g., e2-standard-4: 4 vCPU, 16GB RAM)                 │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Node.js API Server (Express) — managed by PM2 / systemd            │  │
│  │                                                                      │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │  │
│  │  │  Session     │ │  Search      │ │  Candidate   │ │  Upload    │ │  │
│  │  │  Auth MW     │ │  Controller  │ │  Controller  │ │  Controller│ │  │
│  │  └──────────────┘ └──────┬───────┘ └──────────────┘ └──────┬─────┘ │  │
│  │                          │                                  │       │  │
│  │  ┌──────────────┐ ┌──────┴───────┐ ┌──────────────┐ ┌──────┴─────┐│  │
│  │  │  Rate        │ │  Search      │ │  Candidate   │ │  Ingestion ││  │
│  │  │  Limiter     │ │  Service     │ │  Service     │ │  Service   ││  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  BullMQ Workers (background processes managed by PM2)               │  │
│  │                                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │ Parse Worker  │  │Extract Worker│  │ Embed Worker │              │  │
│  │  │ (PDF/DOCX)   │  │ (Gemini LLM) │  │ (Vertex AI)  │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │ PostgreSQL 15  │  │  Redis         │  │  Nginx         │               │
│  │ + pgvector     │  │  (BullMQ +     │  │  (reverse      │               │
│  │ (local)        │  │   sessions)    │  │   proxy + SSL) │               │
│  └───────────────┘  └────────────────┘  └────────────────┘               │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
          ┌────────────────┐  ┌──────────────────────────────────────┐
          │  GCS Bucket    │  │  Vertex AI                           │
          │  (Resume       │  │  - Embeddings API (text-embedding-005)│
          │   Files)       │  │  - Gemini 2.0 Flash                  │
          └────────────────┘  └──────────────────────────────────────┘
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
│  (Express on VM)│ ── Generates unique ID
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│  GCS   │ │  BullMQ  │ ── Enqueues "resume.parse" job
│ Bucket │ │  Queue   │
└────────┘ └──────────┘
```

- **Bulk upload**: Support ZIP archives containing multiple resumes
- **Deduplication**: Hash-based check (SHA-256 of file content) to avoid re-processing
- **File naming**: `resumes/{org_id}/{candidate_id}/{original_filename}`

### Stage 2: Text Extraction

```
BullMQ triggers Parse Worker (on VM)
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
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,        -- bcrypt hashed password
    name            VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'recruiter', -- admin, recruiter, viewer
    avatar_url      TEXT,
    email_verified  BOOLEAN DEFAULT FALSE,
    invite_token    VARCHAR(64),                   -- For team member invites
    reset_token     VARCHAR(64),                   -- For password reset
    reset_token_exp TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (server-side session store for express-session)
CREATE TABLE sessions (
    sid             VARCHAR(255) PRIMARY KEY,
    sess            JSONB NOT NULL,                -- Session data (user_id, org_id, role)
    expire          TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_expire ON sessions(expire);

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
Session-based authentication using `express-session` with `connect-pg-simple` (PostgreSQL session store).
Sessions are stored server-side in PostgreSQL. The client receives an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (`sid`).
All protected endpoints check `req.session.userId` — returns 401 if not authenticated.

### Endpoints

```
BASE URL: https://resumeai.app/api/v1
(Netlify proxies /api/* → https://<VM_IP>:443/api/*)

─── Auth ───
POST   /auth/register              Register org + first admin user (email + password)
POST   /auth/login                 Login with email + password → sets session cookie
POST   /auth/logout                Destroy session + clear cookie
GET    /auth/me                    Get current user from session
POST   /auth/forgot-password       Send password reset email
POST   /auth/reset-password        Reset password with token
POST   /auth/invite                Invite team member (sends email with invite link)
POST   /auth/accept-invite         Accept invite + set password

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
│   │   ├── hooks/                     # Custom hooks (useSearch, useCandidates, useAuth)
│   │   ├── lib/                       # Utilities, API client (with credentials: 'include')
│   │   ├── stores/                    # Zustand stores
│   │   ├── types/                     # TypeScript types/interfaces
│   │   └── App.tsx
│   ├── netlify.toml                   # Netlify config: redirects, proxy rules, build
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                           # Node.js API
│   ├── src/
│   │   ├── config/                    # Environment, database, Redis, GCP configs
│   │   │   ├── database.ts            # PostgreSQL connection pool (pg)
│   │   │   ├── redis.ts               # Redis connection (ioredis)
│   │   │   ├── session.ts             # express-session + connect-pg-simple config
│   │   │   └── gcp.ts                 # GCS + Vertex AI client setup
│   │   ├── middleware/
│   │   │   ├── auth.ts                # Session auth middleware (checks req.session.userId)
│   │   │   ├── rate-limit.ts          # Rate limiter (express-rate-limit with Redis store)
│   │   │   ├── validation.ts          # Request validation (zod)
│   │   │   └── error-handler.ts       # Global error handler
│   │   ├── routes/                    # Express route definitions
│   │   │   ├── auth.routes.ts         # Login, register, logout, reset password
│   │   │   ├── candidate.routes.ts
│   │   │   ├── search.routes.ts
│   │   │   ├── job.routes.ts
│   │   │   ├── shortlist.routes.ts
│   │   │   └── analytics.routes.ts
│   │   ├── controllers/              # Request handlers
│   │   ├── services/                  # Business logic
│   │   │   ├── auth.service.ts        # Registration, login, password hashing (bcrypt)
│   │   │   ├── search.service.ts      # Search orchestration
│   │   │   ├── embedding.service.ts   # Vertex AI embeddings
│   │   │   ├── llm.service.ts         # Gemini interactions
│   │   │   ├── parsing.service.ts     # Resume text extraction
│   │   │   ├── extraction.service.ts  # LLM-based structured extraction
│   │   │   ├── candidate.service.ts   # Candidate CRUD
│   │   │   ├── shortlist.service.ts   # Shortlist management
│   │   │   ├── email.service.ts       # Invite/reset emails (Nodemailer or Resend)
│   │   │   └── upload.service.ts      # File upload handling
│   │   ├── workers/                   # BullMQ pipeline workers
│   │   │   ├── index.ts               # Worker bootstrap (registers all queues)
│   │   │   ├── parse.worker.ts        # Text extraction worker
│   │   │   ├── extract.worker.ts      # LLM extraction worker
│   │   │   └── embed.worker.ts        # Embedding generation worker
│   │   ├── models/                    # Database models / queries
│   │   ├── types/                     # Shared TypeScript types
│   │   ├── app.ts                     # Express app setup
│   │   └── server.ts                  # HTTP server entry point
│   ├── migrations/                    # PostgreSQL migrations (node-pg-migrate)
│   ├── ecosystem.config.js            # PM2 process config (api + workers)
│   ├── Dockerfile                     # For local dev (docker-compose)
│   └── package.json
│
├── shared/                            # Shared types between frontend & backend
│   └── types/
│
├── infra/                             # Infrastructure & Deployment
│   ├── terraform/                     # GCP infrastructure
│   │   ├── main.tf
│   │   ├── compute.tf                 # Compute Engine VM definition
│   │   ├── networking.tf              # VPC, firewall rules (allow 443, deny all else)
│   │   ├── gcs.tf                     # GCS bucket for resumes
│   │   ├── iam.tf                     # Service account for Vertex AI access
│   │   └── variables.tf
│   ├── scripts/
│   │   ├── setup-vm.sh                # VM bootstrap: install Node, PostgreSQL, Redis, Nginx, certbot
│   │   └── deploy.sh                  # Pull latest code, npm install, run migrations, PM2 reload
│   └── nginx/
│       └── resumeai.conf              # Nginx reverse proxy config (SSL termination → localhost:3000)
│
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml         # SSH into VM, pull, build, migrate, restart PM2
│       └── deploy-frontend.yml        # Netlify auto-deploys from git (or manual trigger)
│
├── docker-compose.yml                 # Local development (PostgreSQL + Redis)
├── .env.example
├── package.json                       # Root workspace
├── turbo.json                         # Turborepo config
└── README.md
```

---

## 10. GCP Deployment Architecture

```
┌──────────────────┐
│  Netlify CDN      │
│  (Frontend SPA)   │
│                    │
│  - Auto-deploy    │
│    from Git       │
│  - _redirects:    │
│    /api/* → VM    │
│  - Free tier or   │
│    Pro ($19/mo)   │
└────────┬─────────┘
         │ Netlify proxy: /api/* → https://api.resumeai.app
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Compute Engine VM (e2-standard-4)                    │   │
│  │  4 vCPU / 16GB RAM / 200GB SSD                        │   │
│  │  Static external IP + DNS (api.resumeai.app)          │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │  Nginx (reverse proxy + SSL via Let's Encrypt)  │   │   │
│  │  │  :443 → localhost:3000                          │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │  Node.js API (Express) — PM2 cluster mode      │   │   │
│  │  │  Port 3000, 2 instances                         │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │  BullMQ Workers — PM2 managed                   │   │   │
│  │  │  - parse-worker (1 instance)                    │   │   │
│  │  │  - extract-worker (2 instances)                 │   │   │
│  │  │  - embed-worker (1 instance)                    │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌───────────────┐                  │   │
│  │  │ PostgreSQL 15 │  │ Redis 7       │                  │   │
│  │  │ + pgvector    │  │ (BullMQ +     │                  │   │
│  │  │ (local)       │  │  sessions +   │                  │   │
│  │  │               │  │  rate-limit)  │                  │   │
│  │  │ Data: 200GB   │  │ Memory: 512MB │                  │   │
│  │  │ SSD           │  │               │                  │   │
│  │  └──────────────┘  └───────────────┘                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────┐  ┌──────────────────────────────┐    │
│  │ GCS Bucket         │  │ Vertex AI                     │    │
│  │ (Resume storage)   │  │ - text-embedding-005          │    │
│  │ Standard class     │  │ - Gemini 2.0 Flash            │    │
│  │ Lifecycle: 90d →   │  │                               │    │
│  │   Nearline          │  │                               │    │
│  └───────────────────┘  └──────────────────────────────┘    │
│                                                               │
│  ┌────────────┐  ┌──────────────────┐                       │
│  │ Secret Mgr │  │ Cloud Monitoring  │                       │
│  │ (API keys) │  │ + Cloud Logging   │                       │
│  └────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Netlify Proxy Configuration (`netlify.toml`)

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "https://api.resumeai.app/api/:splat"
  status = 200
  force = true
  headers = {X-Forwarded-Host = "resumeai.app"}
```

### Cost Estimates (Monthly, ~750K resumes)

| Service | Estimated Cost |
|---------|---------------|
| Compute Engine VM (e2-standard-4, 4 vCPU, 16GB, sustained) | ~$100/mo |
| SSD Persistent Disk (200GB) | ~$34/mo |
| Static External IP | ~$3/mo |
| GCS (750K files, ~75GB) | ~$2/mo |
| Vertex AI Embeddings (initial bulk) | ~$50 one-time |
| Vertex AI Gemini (extraction + search) | ~$200/mo |
| Netlify (Pro plan) | ~$19/mo |
| Domain + SSL (Let's Encrypt) | $0 |
| **Total** | **~$360/mo** |

> **Cost savings vs. previous plan**: ~$390/mo saved by self-hosting PostgreSQL and Redis on the VM instead of Cloud SQL, eliminating Firebase and Pub/Sub, and using Netlify free/pro tier.

---

## 11. Implementation Phases

### Phase 1: Infrastructure & Foundation (Week 1-2)
- [ ] Project scaffolding (Turborepo monorepo, frontend, backend)
- [ ] GCP VM provisioning (Terraform: Compute Engine, GCS, networking)
- [ ] VM setup script: install Node.js, PostgreSQL + pgvector, Redis, Nginx, PM2
- [ ] Nginx config with Let's Encrypt SSL (api.resumeai.app)
- [ ] Database migrations (users, orgs, sessions, candidates tables)
- [ ] Session auth system (register, login, logout, express-session + bcrypt)
- [ ] Netlify setup with proxy redirects to GCP VM
- [ ] Frontend: Login, Register, basic layout shell
- [ ] GitHub Actions CI/CD pipeline (SSH deploy to VM)

### Phase 2: Upload & Processing Pipeline (Week 3-4)
- [ ] File upload API (multer → GCS)
- [ ] BullMQ + Redis queue setup
- [ ] Parse worker: PDF/DOCX text extraction
- [ ] Extract worker: Gemini-based structured data extraction
- [ ] Embed worker: Vertex AI embedding generation + pgvector storage
- [ ] Processing status tracking + error handling
- [ ] PM2 ecosystem config for API + all workers
- [ ] Frontend: Upload center (drag-drop, progress, status)
- [ ] Frontend: Candidate list page

### Phase 3: Search (Week 5-6)
- [ ] Query understanding service (Gemini)
- [ ] Vector similarity search (pgvector HNSW)
- [ ] Hybrid search (vector + SQL metadata filters)
- [ ] LLM re-ranking with reasoning
- [ ] Frontend: Search page with natural language bar + filters
- [ ] Frontend: Result cards with scores, strengths, gaps

### Phase 4: Shortlists & Sharing (Week 7)
- [ ] Shortlist CRUD
- [ ] Save search results to shortlist
- [ ] Secure sharing with token-based access
- [ ] Public shortlist view (no auth)
- [ ] Frontend: Shortlist management and sharing

### Phase 5: Polish & Harden (Week 8)
- [ ] Dashboard analytics
- [ ] Bulk upload (ZIP support)
- [ ] Team invite flow (email invites, accept-invite page)
- [ ] Password reset flow
- [ ] Rate limiting (express-rate-limit with Redis store)
- [ ] Performance optimization (Redis caching, cursor pagination)
- [ ] PostgreSQL backup strategy (pg_dump cron → GCS)
- [ ] Dark mode
- [ ] Production hardening (security headers, CORS, CSP)

---

## 12. Key Technical Decisions & Trade-offs

### Why pgvector over a dedicated vector DB (Pinecone/Weaviate)?
- **Simplicity**: One database for structured data + vectors. No sync overhead.
- **Cost**: No additional managed service cost.
- **Hybrid search**: Native SQL filters combined with vector search in one query.
- **Scale**: pgvector with HNSW handles 1M vectors with <100ms query times.
- **Trade-off**: If we exceed ~5M candidates, consider migrating to Vertex AI Vector Search 2.0.

### Why Compute Engine VM over Cloud Run?
- **Simplicity**: One machine runs everything — API, workers, PostgreSQL, Redis. No service mesh complexity.
- **Co-location**: PostgreSQL + pgvector on the same machine = sub-1ms query latency (no network hop).
- **Cost**: A single e2-standard-4 VM (~$100/mo) replaces Cloud Run ($100) + Cloud SQL ($350) + Pub/Sub ($5) = $455/mo.
- **Persistent processes**: BullMQ workers run continuously, no cold starts. Better for background processing.
- **Full control**: SSH access for debugging, custom tuning (PostgreSQL shared_buffers, Redis maxmemory).
- **Trade-off**: No auto-scaling. If traffic exceeds one VM's capacity, scale vertically (upgrade VM size) or add a second VM behind a load balancer.

### Why Native Session Auth over Firebase Auth?
- **No vendor lock-in**: Full control over auth logic, user data, and session management.
- **Server-side sessions**: More secure than JWTs — sessions can be instantly revoked (delete from DB).
- **Simpler architecture**: No Firebase SDK dependency, no cross-service token validation.
- **Co-located session store**: Sessions in PostgreSQL (connect-pg-simple) — zero additional cost, zero network latency.
- **Trade-off**: No built-in OAuth/social login out of the box. Can add Passport.js strategies later if needed (Google, LinkedIn OAuth).

### Why Netlify + API proxy over Firebase Hosting?
- **Developer experience**: Auto-deploys on git push, instant preview deploys for PRs.
- **Proxy simplicity**: `netlify.toml` redirects handle `/api/*` → GCP VM seamlessly — no CORS issues.
- **Global CDN**: Netlify's edge network serves the SPA fast worldwide.
- **Free tier**: Generous free tier (100GB bandwidth, 300 build minutes) — sufficient for most stages.
- **Trade-off**: Proxy adds ~50-100ms latency per API call vs. direct connection. Acceptable for this use case.

### Why Gemini over OpenAI?
- **GCP-native**: Lower latency from the same cloud, no cross-cloud egress costs.
- **Gemini 2.0 Flash**: Fast, cheap, excellent at structured extraction.
- **Vertex AI integration**: Unified billing, IAM, monitoring.

### Why BullMQ + Redis over Pub/Sub?
- **Self-hosted**: Redis runs on the VM — no managed service cost.
- **Rich job features**: Priority queues, delayed jobs, rate limiting, job progress tracking — all built in.
- **Dashboard**: BullMQ Board provides a web UI for monitoring queue health.
- **Node.js native**: First-class TypeScript support, runs in the same process model.
- **Trade-off**: Not as durable as Pub/Sub. If Redis crashes, pending jobs are lost (mitigated by Redis persistence: AOF + RDB snapshots).

### Why pgvector over a dedicated vector DB (Pinecone/Weaviate)?
- **Simplicity**: One database for structured data + vectors. No sync overhead.
- **Cost**: No additional managed service cost. Runs on the same VM.
- **Hybrid search**: Native SQL filters combined with vector search in one query.
- **Scale**: pgvector with HNSW handles 1M vectors with <100ms query times.
- **Trade-off**: If we exceed ~5M candidates, consider migrating to Vertex AI Vector Search 2.0.
