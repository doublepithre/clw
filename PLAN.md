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
| **Database** | Cloud SQL for PostgreSQL 15 + pgvector | Managed PostgreSQL with automated backups, HA, and pgvector support |
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
│                    (e.g., e2-standard-2: 2 vCPU, 8GB RAM)                  │
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
│  ┌────────────────┐  ┌────────────────┐                                   │
│  │  Redis          │  │  Nginx         │                                   │
│  │  (BullMQ +      │  │  (reverse      │                                   │
│  │   rate-limit)   │  │   proxy + SSL) │                                   │
│  └────────────────┘  └────────────────┘                                   │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
   ┌────────────────┐ ┌────────────┐ ┌──────────────────────────────────────┐
   │  Cloud SQL      │ │  GCS       │ │  Vertex AI                           │
   │  PostgreSQL 15  │ │  Bucket    │ │  - Embeddings API (text-embedding-005)│
   │  + pgvector     │ │  (Resume   │ │  - Gemini 2.0 Flash                  │
   │  Enterprise ed. │ │   Files)   │ │                                      │
   │  2 vCPU / 8GB   │ │            │ │                                      │
   └────────────────┘ └────────────┘ └──────────────────────────────────────┘
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

### Stage 2: Text & Structure Extraction (Python Microservice — Docling)

Extraction quality is the **foundation** of the entire pipeline — if extraction is poor, downstream LLM parsing and vector search will be unreliable. After evaluating multiple libraries across Python and Node.js, we chose **Docling** (IBM) as a dedicated Python FastAPI microservice.

#### Extraction Library Comparison

| Feature | **Docling (IBM)** | pdf-parse (Node.js) | PyMuPDF4LLM | Unstructured | officeparser (Node.js) |
|---|---|---|---|---|---|
| **Layout Analysis** | AI-powered (DocLayNet model) | None | Limited | Semantic partitioning | None |
| **Table Extraction** | TableFormer model (high accuracy) | None | Basic | Supported | Basic |
| **OCR (scanned PDFs)** | Built-in (Tesseract/EasyOCR/RapidOCR) | None | None | Built-in | None |
| **Reading Order** | AI-detected natural reading order | Linear stream | Page order | Semantic chunks | Paragraph order |
| **Multi-format** | PDF, DOCX, PPTX, XLSX, HTML, images | PDF only | PDF only | Multi-format | DOCX only |
| **Structure Preservation** | Headings, sections, lists, tables, figures | Flat text dump | Markdown sections | Element types | Paragraphs only |
| **Export Formats** | Markdown, HTML, JSON, DocTags | Plain text | Markdown | JSON elements | Plain text |
| **Speed** | Fast (Heron layout model) | Very fast | Fastest (~0.12s) | Moderate (~1.3s) | Fast |
| **RAG Suitability** | Excellent — structured + semantic | Poor — flat text | Good — markdown | Good — chunks | Poor — flat text |
| **Resume Handling** | Sections identified (education, experience, skills) | All text concatenated | Basic sections | Element-based | Paragraphs only |
| **Community** | 18K+ GitHub stars, IBM-backed, Linux Foundation | 3K stars | Part of PyMuPDF | 10K+ stars | 200 stars |

#### Why Docling Wins for Resume Extraction

1. **Layout understanding**: Resumes have complex layouts — multi-column, tables for skills, sidebar sections, headers/footers. Docling's DocLayNet model identifies titles, headings, paragraphs, tables, and figures as distinct elements, preserving the document's logical structure.

2. **Table reconstruction**: Skills grids, experience tables, and education sections are common in resumes. Docling's TableFormer model reconstructs table structure accurately, unlike pdf-parse which loses all table formatting.

3. **OCR for scanned resumes**: Many candidates upload scanned PDFs or image-based resumes. Docling has built-in OCR support, while Node.js libraries require external OCR services.

4. **Structured output for LLM**: Docling exports to **Markdown with headings and sections preserved**, which dramatically improves LLM extraction accuracy. Instead of feeding Gemini a flat text dump, we feed it well-structured markdown where "Work Experience", "Education", and "Skills" are clearly delineated.

5. **Multi-format native**: Handles PDF, DOCX, PPTX, and images natively — no need for separate libraries per format.

#### Architecture: Python Extraction Microservice

```
Node.js Backend (BullMQ Worker)
        │
        │ HTTP POST /extract
        │ (sends file buffer)
        ▼
┌─────────────────────────────────────────┐
│  Python FastAPI Microservice            │
│  (runs on same VM, port 8100)           │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Docling DocumentConverter         │ │
│  │                                    │ │
│  │  1. Layout analysis (DocLayNet)    │ │
│  │  2. Table extraction (TableFormer) │ │
│  │  3. OCR if needed (EasyOCR)        │ │
│  │  4. Reading order detection        │ │
│  │  5. Export to Markdown + JSON      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Returns:                                │
│  {                                       │
│    "markdown": "# John Doe\n## ...",    │
│    "sections": [...],                    │
│    "tables": [...],                      │
│    "metadata": { "pages": 2 }           │
│  }                                       │
└─────────────────────────────────────────┘
```

The Node.js parse worker sends the resume file to the Python microservice via HTTP, receives structured markdown + metadata, then passes it to the Gemini LLM extraction stage. This gives the LLM **much better input** than raw text — sections are labeled, tables are formatted, and reading order is correct.

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
│   │   ├── cloud-sql.tf              # Cloud SQL PostgreSQL + pgvector instance
│   │   ├── networking.tf              # VPC, firewall rules, private service access (Cloud SQL)
│   │   ├── gcs.tf                     # GCS bucket for resumes
│   │   ├── iam.tf                     # Service account for Vertex AI + Cloud SQL access
│   │   └── variables.tf
│   ├── scripts/
│   │   ├── setup-vm.sh                # VM bootstrap: install Node, Redis, Nginx, certbot
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
│  │  Compute Engine VM (e2-standard-2)                    │   │
│  │  2 vCPU / 8GB RAM / 50GB SSD                          │   │
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
│  │  ┌───────────────┐                                    │   │
│  │  │ Redis 7        │                                    │   │
│  │  │ (BullMQ +      │                                    │   │
│  │  │  rate-limit)   │                                    │   │
│  │  │ Memory: 512MB  │                                    │   │
│  │  └───────────────┘                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cloud SQL for PostgreSQL 15 (Enterprise edition)     │   │
│  │  + pgvector extension enabled                         │   │
│  │  2 vCPU / 8GB RAM / 100GB SSD                         │   │
│  │  Automated backups, point-in-time recovery            │   │
│  │  Private IP (same VPC as VM)                          │   │
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

### Cost Estimates (Monthly, ~750K resumes stored)

| Service | Estimated Cost |
|---------|---------------|
| Compute Engine VM (e2-standard-2, 2 vCPU, 8GB) | ~$50/mo |
| SSD Persistent Disk (50GB for VM) | ~$8.50/mo |
| Static External IP | ~$3/mo |
| Cloud SQL PostgreSQL (2 vCPU, 8GB, 100GB SSD, Enterprise) | ~$120/mo |
| GCS (750K files, ~75GB) | ~$2/mo |
| Vertex AI Gemini (extraction + search, ongoing) | ~$200/mo |
| Netlify (Pro plan) | ~$19/mo |
| Domain + SSL (Let's Encrypt) | $0 |
| **Total** | **~$403/mo** |

> VM is now smaller (2 vCPU / 8GB) since PostgreSQL is offloaded to Cloud SQL. Cloud SQL provides automated daily backups, point-in-time recovery, and optional HA failover — no manual `pg_dump` needed.

---

## 11. Implementation Phases

### Phase 1: Infrastructure & Foundation (Week 1-2)
- [ ] Project scaffolding (Turborepo monorepo, frontend, backend)
- [ ] GCP provisioning (Terraform: Compute Engine, Cloud SQL + pgvector, GCS, VPC)
- [ ] VM setup script: install Node.js, Redis, Nginx, PM2
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
- [ ] Cloud SQL backup verification (automated daily backups enabled by Terraform)
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

### Why Compute Engine VM for API + Workers?
- **Persistent processes**: BullMQ workers run continuously, no cold starts. Better for background processing than serverless.
- **Full control**: SSH access for debugging, custom tuning, install any system dependency (e.g., libreoffice for .doc conversion).
- **Cost-effective**: A single e2-standard-2 VM (~$50/mo) runs the API server + all workers + Redis.
- **Trade-off**: No auto-scaling. If traffic exceeds one VM's capacity, scale vertically (upgrade VM size) or add a second VM behind a load balancer.

### Why Cloud SQL over self-hosted PostgreSQL?
- **Managed operations**: Automated daily backups, point-in-time recovery, OS/engine patching — zero DBA effort.
- **pgvector support**: Cloud SQL supports the pgvector extension natively, so HNSW vector search works out of the box.
- **HA option**: Single-click regional failover when needed (adds ~$120/mo but provides 99.95% SLA).
- **Private networking**: Private IP in the same VPC as the VM — ~1-2ms latency, no public internet exposure.
- **Scaling**: Increase vCPU/RAM or storage without redeploying the VM.
- **Trade-off**: More expensive than self-hosted PostgreSQL on the VM (~$120/mo vs. $0 extra). Worth it for operational safety at 500K-1M records.

### Why Native Session Auth over Firebase Auth?
- **No vendor lock-in**: Full control over auth logic, user data, and session management.
- **Server-side sessions**: More secure than JWTs — sessions can be instantly revoked (delete from DB).
- **Simpler architecture**: No Firebase SDK dependency, no cross-service token validation.
- **Session store**: Sessions in PostgreSQL via connect-pg-simple — zero additional cost.
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

---

## 13. Detailed AI Pipeline Pricing (Per 1,000 Units)

> All prices based on Vertex AI pricing as of Feb 2026:
> - **Gemini 2.0 Flash**: $0.10 / 1M input tokens, $0.40 / 1M output tokens
> - **text-embedding-005**: $0.10 / 1M input tokens
>
> Token estimation: ~4 characters = 1 token (including whitespace)

---

### A. Processing 1,000 Resumes (Ingestion Pipeline)

The ingestion pipeline has 3 stages that incur AI costs. Stage 1 (text extraction) is local and free.

#### Stage 2: LLM Structured Extraction (Gemini 2.0 Flash)

Each resume goes through Gemini to extract name, skills, experience, education, etc. into structured JSON.

```
Per resume:
  Input tokens:
    - System prompt (extraction instructions)    ~500 tokens
    - Resume text (avg 800 words ≈ 1,000 tokens) ~1,000 tokens
    ─────────────────────────────────────────────
    Total input per resume                       ~1,500 tokens

  Output tokens:
    - Structured JSON (name, skills, experience,
      education, certifications, LLM summary)    ~800 tokens
    ─────────────────────────────────────────────
    Total output per resume                      ~800 tokens
```

| | Per Resume | Per 1,000 Resumes |
|---|---|---|
| Input (1,500 tokens × $0.10/1M) | $0.000150 | **$0.15** |
| Output (800 tokens × $0.40/1M) | $0.000320 | **$0.32** |
| **Subtotal** | **$0.000470** | **$0.47** |

#### Stage 3: Embedding Generation (text-embedding-005)

Each resume gets a 768-dim embedding vector from a concatenated text of: LLM summary + title + skills + highlights.

```
Per resume:
  Input tokens:
    - LLM-generated summary              ~200 tokens
    - Current title                       ~10 tokens
    - Skills (comma-separated, ~15 skills) ~50 tokens
    - Recent work highlights              ~150 tokens
    ─────────────────────────────────────────────
    Total input per resume                ~410 tokens
```

| | Per Resume | Per 1,000 Resumes |
|---|---|---|
| Input (410 tokens × $0.10/1M) | $0.000041 | **$0.04** |
| **Subtotal** | **$0.000041** | **$0.04** |

#### Total: Ingesting 1,000 Resumes

| Stage | Cost |
|-------|------|
| Stage 1: Text extraction (local — pdf-parse/officeparser) | $0.00 |
| Stage 2: LLM structured extraction (Gemini 2.0 Flash) | $0.47 |
| Stage 3: Embedding generation (text-embedding-005) | $0.04 |
| **Total for 1,000 resumes** | **$0.51** |

#### Extrapolation

| Volume | Cost |
|--------|------|
| 1,000 resumes | $0.51 |
| 10,000 resumes | $5.10 |
| 100,000 resumes (1 lakh) | $51.00 |
| 500,000 resumes (5 lakh) | $255.00 |
| 1,000,000 resumes (10 lakh) | $510.00 |

> This is a **one-time ingestion cost**. Once a resume is processed, it doesn't need re-processing unless the extraction model is upgraded.

---

### B. Processing 1,000 Search Queries (Search Pipeline)

Each search query goes through 4 AI-powered steps. Steps 3 (vector search) is a database operation with no AI cost.

#### Step 1: Query Understanding (Gemini 2.0 Flash)

The recruiter's natural language query is parsed into structured search intent (semantic query + filters + ranking signals).

```
Per query:
  Input tokens:
    - System prompt (query parsing instructions)  ~300 tokens
    - User's natural language query                ~50 tokens
    ─────────────────────────────────────────────
    Total input per query                          ~350 tokens

  Output tokens:
    - Structured intent JSON (semantic_query,
      filters, ranking_signals)                    ~200 tokens
    ─────────────────────────────────────────────
    Total output per query                         ~200 tokens
```

| | Per Query | Per 1,000 Queries |
|---|---|---|
| Input (350 tokens × $0.10/1M) | $0.000035 | **$0.035** |
| Output (200 tokens × $0.40/1M) | $0.000080 | **$0.080** |
| **Subtotal** | **$0.000115** | **$0.115** |

#### Step 2: Query Embedding (text-embedding-005)

The semantic query is embedded for vector similarity search.

```
Per query:
  Input tokens:
    - Semantic query text                          ~100 tokens
```

| | Per Query | Per 1,000 Queries |
|---|---|---|
| Input (100 tokens × $0.10/1M) | $0.000010 | **$0.01** |
| **Subtotal** | **$0.000010** | **$0.01** |

#### Step 3: Vector Search + Metadata Filtering (pgvector — Cloud SQL)

This is a database operation — no AI token cost. pgvector performs HNSW approximate nearest neighbor search combined with SQL WHERE clauses. Typically completes in 50-100ms.

| | Per Query | Per 1,000 Queries |
|---|---|---|
| **Subtotal (database only)** | **$0.00** | **$0.00** |

#### Step 4: LLM Re-ranking & Reasoning (Gemini 2.0 Flash)

The top 50 candidates from vector search are sent to Gemini for deep evaluation. Batched 10 candidates per LLM call = **5 calls per search**.

```
Per LLM call (10 candidates):
  Input tokens:
    - System prompt (ranking instructions)         ~300 tokens
    - Original query + search context              ~200 tokens
    - 10 candidate summaries (10 × 500 tokens)     ~5,000 tokens
    ─────────────────────────────────────────────
    Total input per call                           ~5,500 tokens

  Output tokens:
    - 10 scored results with:
      - match_score (0-100)
      - strengths[]
      - gaps[]
      - evidence[]
      - reasoning text                             ~1,500 tokens
    ─────────────────────────────────────────────
    Total output per call                          ~1,500 tokens

Per search query (5 calls × above):
    Total input: 5 × 5,500  = 27,500 tokens
    Total output: 5 × 1,500 = 7,500 tokens
```

| | Per Query (5 calls) | Per 1,000 Queries |
|---|---|---|
| Input (27,500 tokens × $0.10/1M) | $0.00275 | **$2.75** |
| Output (7,500 tokens × $0.40/1M) | $0.00300 | **$3.00** |
| **Subtotal** | **$0.00575** | **$5.75** |

#### Total: 1,000 Search Queries

| Step | Cost |
|------|------|
| Step 1: Query understanding (Gemini 2.0 Flash) | $0.115 |
| Step 2: Query embedding (text-embedding-005) | $0.01 |
| Step 3: Vector search + filtering (Cloud SQL pgvector) | $0.00 |
| Step 4: LLM re-ranking & reasoning (Gemini 2.0 Flash) | $5.75 |
| **Total for 1,000 search queries** | **$5.88** |

> **Cost per search query: ~$0.006 (less than 1 cent)**

#### Extrapolation

| Volume | Cost |
|--------|------|
| 100 searches/day | $0.59/day → **$17.64/mo** |
| 500 searches/day | $2.94/day → **$88.20/mo** |
| 1,000 searches/day | $5.88/day → **$176.40/mo** |

---

### C. Combined Monthly Estimate (Realistic Usage)

Scenario: **750K resumes already ingested**, 500 new resumes/day, 200 searches/day.

| Item | Calculation | Monthly Cost |
|------|------------|-------------|
| **Infrastructure** | | |
| Compute Engine VM (e2-standard-2) | Fixed | $50 |
| Cloud SQL (2 vCPU, 8GB, 100GB SSD) | Fixed | $120 |
| GCS Storage (75GB) | Fixed | $2 |
| Netlify Pro | Fixed | $19 |
| Static IP | Fixed | $3 |
| **AI — Ingestion** | | |
| New resume extraction (500/day × 30) | 15,000 × $0.00047 | $7.05 |
| New resume embedding (500/day × 30) | 15,000 × $0.000041 | $0.62 |
| **AI — Search** | | |
| Query understanding (200/day × 30) | 6,000 × $0.000115 | $0.69 |
| Query embedding (200/day × 30) | 6,000 × $0.000010 | $0.06 |
| LLM re-ranking (200/day × 30) | 6,000 × $0.00575 | $34.50 |
| | | |
| **Grand Total** | | **~$237/mo** |

> The dominant ongoing AI cost is **LLM re-ranking** ($34.50/mo at 200 searches/day). This can be reduced by:
> - Reducing the re-ranking batch from top 50 → top 30 candidates (3 LLM calls instead of 5)
> - Caching re-ranking results for identical or near-identical queries
> - Using Gemini 2.5 Flash-Lite ($0.075 / 1M input) when available for ranking tasks

---

## 14. LLM Model Evaluation — Cross-Provider Comparison

Our pipeline has **three distinct AI tasks**, each with different requirements for quality, latency, and cost sensitivity. This section evaluates models from all major providers and recommends **Performant**, **Balanced**, and **Economic** picks for each task.

### Pricing Reference (Per 1M Tokens)

#### Generation Models

| Provider | Model | Input | Output | Context | Notes |
|----------|-------|------:|-------:|--------:|-------|
| **Google** | Gemini 2.5 Pro | $1.25 | $10.00 | 1M | Strongest reasoning in Gemini family |
| | Gemini 2.5 Flash | $0.30 | $2.50 | 1M | Best balance in Gemini family |
| | Gemini 2.5 Flash Lite | $0.10 | $0.40 | 1M | Ultra-cheap, good for structured extraction |
| | Gemini 2.0 Flash | $0.15 | $0.60 | 1M | Previous gen, still very capable |
| | Gemini 2.0 Flash Lite | $0.075 | $0.30 | 1M | Cheapest Gemini option |
| **OpenAI** | GPT-4.1 | $2.00 | $8.00 | 1M | Best coding/agentic model from OpenAI |
| | GPT-4.1 mini | $0.40 | $1.60 | 1M | Strong balanced option |
| | GPT-4.1 nano | $0.10 | $0.40 | 1M | Ultra-cheap, good JSON output |
| | GPT-4o | $2.50 | $10.00 | 128K | Multimodal flagship |
| | GPT-4o mini | $0.15 | $0.60 | 128K | Cheap multimodal |
| | o4-mini | $1.10 | $4.40 | 200K | Reasoning model (hidden thinking tokens add cost) |
| **Anthropic** | Claude Opus 4 | $15.00 | $75.00 | 200K | Highest quality, very expensive |
| | Claude Sonnet 4 | $3.00 | $15.00 | 200K | Excellent instruction following |
| | Claude Haiku 3.5 | $0.80 | $4.00 | 200K | Fast, good at structured tasks |
| **DeepSeek** | DeepSeek V3 | $0.27 | $1.10 | 128K | Excellent price/performance, open-source |
| | DeepSeek R1 | $0.55 | $2.19 | 128K | Reasoning model, open-source |
| **Mistral** | Mistral Large | $2.00 | $6.00 | 128K | Strong European alternative |
| | Mistral Small | $0.10 | $0.30 | 128K | Very cheap, surprisingly capable |
| | Codestral | $0.30 | $0.90 | 256K | Optimized for code/structured output |

#### Embedding Models

| Provider | Model | Price / 1M tokens | Dimensions | Max Input |
|----------|-------|------------------:|----------:|---------:|
| **Google** | text-embedding-005 | $0.10 | 768 | 2,048 tokens |
| | gemini-embedding-001 | $0.10 | 3,072 (configurable) | 2,048 tokens |
| **OpenAI** | text-embedding-3-small | $0.02 | 1,536 | 8,191 tokens |
| | text-embedding-3-large | $0.13 | 3,072 | 8,191 tokens |
| **Cohere** | embed-v4.0 | $0.10 | 1,024 | 512 tokens |
| **Voyage AI** | voyage-3-large | $0.06 | 1,024 | 32,000 tokens |

---

### Task 1: Resume Structured Extraction

**What it does**: Takes raw resume text (~1,000 tokens) and extracts structured JSON (name, skills, experience, education, etc.) + generates an embedding-optimized summary.

**Requirements**:
- Reliable JSON output (must parse without errors at scale)
- Handles diverse resume formats, languages, and conventions
- Latency: Not critical (async batch processing via BullMQ)
- Volume: High (500K-1M one-time bulk, then ~500/day ongoing)
- Quality matters: Extracted data quality directly impacts search accuracy

#### Evaluation

| Model | JSON Reliability | Extraction Quality | Speed | Cost / 1,000 Resumes | Verdict |
|-------|:---:|:---:|:---:|---:|---|
| Gemini 2.5 Flash | 9/10 | 9/10 | ~0.8s | $0.77 | **Performant** pick |
| GPT-4.1 mini | 9/10 | 9/10 | ~1.0s | $1.52 | Excellent but 2x cost |
| Gemini 2.5 Flash Lite | 8/10 | 8/10 | ~0.5s | $0.47 | **Balanced** pick |
| GPT-4.1 nano | 8/10 | 7/10 | ~0.5s | $0.47 | Comparable to Flash Lite |
| DeepSeek V3 | 8/10 | 8/10 | ~1.2s | $0.69 | Great value, open-source |
| Mistral Small | 7/10 | 7/10 | ~0.6s | $0.39 | **Economic** pick |
| Gemini 2.0 Flash Lite | 7/10 | 7/10 | ~0.4s | $0.35 | Cheapest Gemini option |
| Claude Haiku 3.5 | 9/10 | 8/10 | ~0.8s | $2.00 | Excellent JSON but expensive |

> **Cost calculation**: Per resume = (1,500 input × input_price/1M) + (800 output × output_price/1M)

#### Recommendations for Resume Extraction

| Tier | Model | Cost / 1K Resumes | Why |
|------|-------|------------------:|-----|
| **Performant** | Gemini 2.5 Flash | $0.77 | Best JSON reliability + extraction quality at low cost. Native Vertex AI = zero egress from GCP VM. |
| **Balanced** | Gemini 2.5 Flash Lite | $0.47 | 40% cheaper than 2.5 Flash with slightly lower quality. For 1M resumes, saves ~$300 vs Flash. |
| **Economic** | Mistral Small | $0.39 | Cheapest viable option. 7/10 quality is acceptable for bulk extraction with a validation pass. |
| **Best value outside GCP** | DeepSeek V3 | $0.69 | If you want provider diversity. Excellent structured extraction at low cost. |

---

### Task 2: Query Understanding

**What it does**: Parses a recruiter's natural language query ("Senior React dev in Bangalore, 5+ years fintech") into structured search intent JSON (semantic query + filters + ranking signals).

**Requirements**:
- Precise instruction following (must output exact JSON schema)
- Understands recruiting domain (seniority levels, skill equivalence)
- Latency: Critical (~300-500ms target, this is the first step user sees)
- Volume: Medium (100-500 queries/day)
- Quality critical: Bad parsing → bad search results

#### Evaluation

| Model | Instruction Following | Domain Understanding | Latency | Cost / 1,000 Queries | Verdict |
|-------|:---:|:---:|:---:|---:|---|
| GPT-4.1 mini | 9/10 | 9/10 | ~400ms | $0.24 | **Performant** pick |
| Gemini 2.5 Flash | 9/10 | 8/10 | ~350ms | $0.16 | Close second |
| Gemini 2.5 Flash Lite | 8/10 | 7/10 | ~200ms | $0.12 | **Balanced** pick |
| GPT-4.1 nano | 8/10 | 7/10 | ~200ms | $0.12 | Comparable speed/cost |
| DeepSeek V3 | 8/10 | 8/10 | ~500ms | $0.14 | Good but higher latency |
| Mistral Small | 7/10 | 7/10 | ~250ms | $0.10 | **Economic** pick |
| Gemini 2.0 Flash Lite | 7/10 | 6/10 | ~200ms | $0.08 | Cheapest, adequate for simple queries |

> **Cost calculation**: Per query = (350 input × input_price/1M) + (200 output × output_price/1M)

#### Recommendations for Query Understanding

| Tier | Model | Cost / 1K Queries | Why |
|------|-------|------------------:|-----|
| **Performant** | GPT-4.1 mini | $0.24 | Best instruction following for structured JSON. Excellent at understanding nuanced recruiting queries. |
| **Balanced** | Gemini 2.5 Flash Lite | $0.12 | Half the cost, very fast (~200ms), handles 80% of queries perfectly. GCP-native. |
| **Economic** | Mistral Small | $0.10 | Cheapest viable option. Works well for straightforward queries. May need prompt tuning for edge cases. |

---

### Task 3: LLM Re-ranking & Reasoning

**What it does**: Evaluates top 50 candidates against the search query. For each candidate, generates: match score (0-100), strengths, gaps, evidence, reasoning. This is the **core product value** — what recruiters see and pay for.

**Requirements**:
- Strong reasoning ability (must understand role fit beyond keyword matching)
- Nuanced evaluation (distinguish "5 years React" from "5 years frontend with some React")
- Good writing quality (explanations shown to recruiter)
- Latency: Moderate (2-4s acceptable, can stream results)
- Volume: Highest token consumption (5 LLM calls × 7,000 tokens each per search)
- Quality: **Critical** — this IS the product

#### Evaluation

| Model | Reasoning Quality | Explanation Writing | Nuance | Cost / 1,000 Searches | Verdict |
|-------|:---:|:---:|:---:|---:|---|
| Claude Sonnet 4 | 10/10 | 10/10 | 10/10 | $17.25 | Gold standard but expensive |
| GPT-4.1 | 9/10 | 9/10 | 9/10 | $14.50 | Excellent reasoning |
| Gemini 2.5 Pro | 9/10 | 8/10 | 9/10 | $13.44 | **Performant** pick |
| Gemini 2.5 Flash | 8/10 | 8/10 | 8/10 | $5.08 | **Balanced** pick |
| GPT-4.1 mini | 8/10 | 8/10 | 7/10 | $3.30 | Surprisingly good for the price |
| DeepSeek V3 | 8/10 | 7/10 | 8/10 | $2.24 | **Economic** pick |
| DeepSeek R1 | 9/10 | 7/10 | 9/10 | $4.15 | Strong reasoning but verbose (hidden tokens) |
| Gemini 2.5 Flash Lite | 7/10 | 6/10 | 6/10 | $1.28 | Too shallow for core ranking |
| Mistral Small | 6/10 | 6/10 | 5/10 | $0.95 | Insufficient nuance for candidate evaluation |

> **Cost calculation**: Per search = 5 calls × [(5,500 input × input_price/1M) + (1,500 output × output_price/1M)]

#### Recommendations for Re-ranking

| Tier | Model | Cost / 1K Searches | Why |
|------|-------|------------------:|-----|
| **Performant** | Gemini 2.5 Pro | $13.44 | Best reasoning available on GCP. Understands seniority signals, skill adjacency, career trajectories. Worth it for high-value recruiting. |
| **Balanced** | Gemini 2.5 Flash | $5.08 | 62% cheaper than Pro with 8/10 reasoning. Sweet spot for most use cases. GCP-native. |
| **Economic** | DeepSeek V3 | $2.24 | 4x cheaper than Gemini 2.5 Flash. Solid reasoning, though explanations are less polished. Best for cost-sensitive deployments. |
| **Outside GCP alternative** | GPT-4.1 mini | $3.30 | If you want OpenAI reliability. Good reasoning at a moderate price point. |

---

### Task 4: Embedding Generation

**Requirements**:
- High quality semantic similarity for resume-to-query matching
- Affordable at scale (750K resumes to embed)
- Batch API support
- Consistent, reproducible embeddings

#### Evaluation

| Model | Retrieval Quality | Batch Support | Cost for 750K Resumes | Verdict |
|-------|:---:|:---:|---:|---|
| OpenAI text-embedding-3-large | 9/10 | Yes | $40.00 | Best quality but no GCP co-location |
| Google text-embedding-005 | 8/10 | Yes (250/batch) | $30.75 | **Balanced** — GCP-native, low latency |
| Google gemini-embedding-001 | 9/10 | Yes | $30.75 | Newer, higher dimensions |
| Voyage AI voyage-3-large | 9/10 | Yes | $18.45 | Best retrieval quality per $ |
| OpenAI text-embedding-3-small | 7/10 | Yes | $6.15 | **Economic** — 5x cheaper than large |
| Cohere embed-v4.0 | 8/10 | Yes | $30.75 | Multilingual strength |

> **Cost calculation**: 750K resumes × 410 tokens/resume × price/1M tokens

#### Recommendations for Embeddings

| Tier | Model | Cost for 750K | Why |
|------|-------|-------------:|-----|
| **Performant** | gemini-embedding-001 or voyage-3-large | $30.75 / $18.45 | Highest retrieval quality. gemini-embedding is GCP-native. voyage-3-large is cheaper with comparable quality. |
| **Balanced** | text-embedding-005 | $30.75 | Already in our stack. 768 dims. Native Vertex AI integration, batch support, proven at scale. |
| **Economic** | text-embedding-3-small | $6.15 | 5x cheaper. Quality drop is real but acceptable if combined with strong LLM re-ranking. Cross-provider dependency. |

---

### Recommended Configurations

#### Config A: Performant (Best quality)

| Task | Model | Provider |
|------|-------|----------|
| Resume Extraction | Gemini 2.5 Flash | Google Vertex AI |
| Query Understanding | GPT-4.1 mini | OpenAI |
| Re-ranking & Reasoning | Gemini 2.5 Pro | Google Vertex AI |
| Embeddings | text-embedding-005 | Google Vertex AI |

**Monthly AI cost** (500 resumes/day, 200 searches/day): **~$107/mo**
- Extraction: 15K × $0.00077 = $11.55
- Query understanding: 6K × $0.00024 = $1.44
- Re-ranking: 6K × $0.01344 = $80.64
- Embeddings: 15K × $0.000041 = $0.62
- Query embeddings: 6K × $0.00001 = $0.06

> **Tradeoff**: Mixing OpenAI for query understanding adds a provider dependency but gives the best instruction following. If you want single-provider simplicity, use Gemini 2.5 Flash for query understanding too (saves $0.72/mo, negligible).

#### Config B: Balanced (Recommended)

| Task | Model | Provider |
|------|-------|----------|
| Resume Extraction | Gemini 2.5 Flash Lite | Google Vertex AI |
| Query Understanding | Gemini 2.5 Flash Lite | Google Vertex AI |
| Re-ranking & Reasoning | Gemini 2.5 Flash | Google Vertex AI |
| Embeddings | text-embedding-005 | Google Vertex AI |

**Monthly AI cost** (500 resumes/day, 200 searches/day): **~$38/mo**
- Extraction: 15K × $0.00047 = $7.05
- Query understanding: 6K × $0.00012 = $0.72
- Re-ranking: 6K × $0.00508 = $30.48
- Embeddings: 15K × $0.000041 = $0.62
- Query embeddings: 6K × $0.00001 = $0.06

> **Why this is recommended**: Single provider (Vertex AI), single billing, zero egress cost, ~$38/mo for all AI. Quality is 8/10 across the board — more than sufficient for most recruiting use cases.

#### Config C: Economic (Lowest cost)

| Task | Model | Provider |
|------|-------|----------|
| Resume Extraction | Mistral Small | Mistral |
| Query Understanding | Gemini 2.0 Flash Lite | Google Vertex AI |
| Re-ranking & Reasoning | DeepSeek V3 | DeepSeek |
| Embeddings | text-embedding-3-small | OpenAI |

**Monthly AI cost** (500 resumes/day, 200 searches/day): **~$17/mo**
- Extraction: 15K × $0.00039 = $5.85
- Query understanding: 6K × $0.00008 = $0.48
- Re-ranking: 6K × $0.00224 = $13.44
- Embeddings: 15K × $0.0000082 = $0.12
- Query embeddings: 6K × $0.000002 = $0.01

> **Tradeoff**: 3 different providers, 3 API keys to manage, cross-provider latency. Extraction and re-ranking quality drops to 7/10. Viable for MVP/early stage but may impact recruiter satisfaction on nuanced searches.

---

### Provider Dependency & Operational Considerations

| Factor | Single GCP (Config B) | Multi-Provider (Config A/C) |
|--------|:---:|:---:|
| API keys to manage | 1 | 2-3 |
| Billing dashboards | 1 | 2-3 |
| Network egress cost | $0 | ~$5-10/mo |
| Latency consistency | Best | Variable |
| Vendor lock-in risk | Higher | Lower |
| Failover complexity | Must switch provider on outage | Can route between providers |

### Upgrade Path

Start with **Config B** (all Vertex AI, ~$38/mo). If recruiters report that re-ranking explanations lack depth:

1. **First upgrade**: Swap re-ranking to Gemini 2.5 Pro (+$45/mo, total ~$83/mo)
2. **Second upgrade**: Swap query understanding to GPT-4.1 mini (+$0.72/mo, negligible)
3. **Nuclear option**: Swap re-ranking to Claude Sonnet 4 for best-in-class reasoning (+$65/mo vs Pro)

The architecture is designed so that changing the LLM for any task is a **single config change** in `backend/src/services/llm.service.ts` — no pipeline changes needed.
