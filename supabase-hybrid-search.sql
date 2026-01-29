-- Hybrid Search Migration for LawAI
-- Run this in Supabase SQL Editor AFTER the initial setup
-- This adds full-text search capabilities for hybrid (vector + keyword) search

-- Step 1: Add full-text search column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('norwegian', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('norwegian', coalesce(case_number, '')), 'A') ||
        setweight(to_tsvector('norwegian', coalesce(case_type, '')), 'B') ||
        setweight(to_tsvector('norwegian', coalesce(content, '')), 'C')
    ) STORED;

-- Step 2: Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING gin(fts);

-- Step 3: Create hybrid search function using Reciprocal Rank Fusion (RRF)
-- RRF combines rankings from multiple search methods fairly
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(2000),
    match_count INT DEFAULT 10,
    -- Weight for full-text search (0-1). Vector weight = 1 - text_weight
    text_weight FLOAT DEFAULT 0.3,
    -- RRF constant (higher = more weight to lower-ranked results)
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    case_number TEXT,
    case_type TEXT,
    decision_date DATE,
    content TEXT,
    chunk_index INTEGER,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vector_search AS (
        SELECT
            d.id,
            d.title,
            d.case_number,
            d.case_type,
            d.decision_date,
            d.content,
            d.chunk_index,
            d.metadata,
            1 - (d.embedding <=> query_embedding) AS vector_score,
            ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS vector_rank
        FROM documents d
        WHERE d.embedding IS NOT NULL
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    text_search AS (
        SELECT
            d.id,
            ts_rank_cd(d.fts, websearch_to_tsquery('norwegian', query_text)) AS text_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(d.fts, websearch_to_tsquery('norwegian', query_text)) DESC) AS text_rank
        FROM documents d
        WHERE d.fts @@ websearch_to_tsquery('norwegian', query_text)
        ORDER BY text_score DESC
        LIMIT match_count * 3
    ),
    combined AS (
        SELECT
            COALESCE(v.id, t_doc.id) AS id,
            COALESCE(v.title, t_doc.title) AS title,
            COALESCE(v.case_number, t_doc.case_number) AS case_number,
            COALESCE(v.case_type, t_doc.case_type) AS case_type,
            COALESCE(v.decision_date, t_doc.decision_date) AS decision_date,
            COALESCE(v.content, t_doc.content) AS content,
            COALESCE(v.chunk_index, t_doc.chunk_index) AS chunk_index,
            COALESCE(v.metadata, t_doc.metadata) AS metadata,
            -- RRF score combining both rankings
            (
                (1 - text_weight) * COALESCE(1.0 / (rrf_k + v.vector_rank), 0) +
                text_weight * COALESCE(1.0 / (rrf_k + t.text_rank), 0)
            ) AS rrf_score,
            COALESCE(v.vector_score, 0) AS vector_score
        FROM vector_search v
        FULL OUTER JOIN text_search t ON v.id = t.id
        LEFT JOIN documents t_doc ON t.id = t_doc.id
    )
    SELECT
        c.id,
        c.title,
        c.case_number,
        c.case_type,
        c.decision_date,
        c.content,
        c.chunk_index,
        c.metadata,
        -- Return vector_score as similarity for consistency, but rank by RRF
        c.vector_score AS similarity
    FROM combined c
    ORDER BY c.rrf_score DESC
    LIMIT match_count;
END;
$$;

-- Step 4: Create a simpler keyword-only search function (useful for exact matches)
CREATE OR REPLACE FUNCTION keyword_search(
    query_text TEXT,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    case_number TEXT,
    case_type TEXT,
    decision_date DATE,
    content TEXT,
    chunk_index INTEGER,
    metadata JSONB,
    text_rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.case_number,
        d.case_type,
        d.decision_date,
        d.content,
        d.chunk_index,
        d.metadata,
        ts_rank_cd(d.fts, websearch_to_tsquery('norwegian', query_text)) AS text_rank
    FROM documents d
    WHERE d.fts @@ websearch_to_tsquery('norwegian', query_text)
    ORDER BY text_rank DESC
    LIMIT match_count;
END;
$$;

-- Verify setup
SELECT 'Hybrid search setup complete!' AS status;
