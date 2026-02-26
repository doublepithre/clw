-- Initial schema for ResumeAI

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'recruiter',
    avatar_url      TEXT,
    email_verified  BOOLEAN DEFAULT FALSE,
    invite_token    VARCHAR(64),
    reset_token     VARCHAR(64),
    reset_token_exp TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (server-side session store for express-session)
CREATE TABLE sessions (
    sid             VARCHAR(255) PRIMARY KEY,
    sess            JSONB NOT NULL,
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
    seniority_level         VARCHAR(50),

    -- Rich extracted data
    summary                 TEXT,
    skills                  TEXT[] DEFAULT '{}',
    extracted_data          JSONB,

    -- Resume file reference
    resume_file_url         TEXT NOT NULL,
    resume_file_name        TEXT,
    resume_file_hash        VARCHAR(64),
    resume_raw_text         TEXT,

    -- Processing status
    processing_status       VARCHAR(50) DEFAULT 'pending',
    processing_error        TEXT,

    -- Metadata
    source                  VARCHAR(100),
    tags                    TEXT[] DEFAULT '{}',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings (separate table for flexibility)
CREATE TABLE candidate_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID REFERENCES candidates(id) ON DELETE CASCADE,
    embedding_type  VARCHAR(50) DEFAULT 'primary',
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
    skill_category  VARCHAR(50),
    years           DECIMAL(3,1),
    proficiency     VARCHAR(20)
);

-- Job descriptions
CREATE TABLE job_descriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    requirements    JSONB,
    embedding       vector(768),
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
    parsed_intent   JSONB,
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
    share_token     VARCHAR(64) UNIQUE,
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
    match_reasoning TEXT,
    strengths       TEXT[] DEFAULT '{}',
    gaps            TEXT[] DEFAULT '{}',
    status          VARCHAR(50) DEFAULT 'pending',
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
CREATE INDEX idx_candidate_embeddings_candidate ON candidate_embeddings(candidate_id);
CREATE INDEX idx_shortlist_share ON shortlists(share_token) WHERE share_enabled = TRUE;
CREATE INDEX idx_search_queries_org ON search_queries(org_id);
CREATE INDEX idx_search_queries_user ON search_queries(user_id);
CREATE INDEX idx_job_descriptions_org ON job_descriptions(org_id);
CREATE INDEX idx_shortlists_org ON shortlists(org_id);
