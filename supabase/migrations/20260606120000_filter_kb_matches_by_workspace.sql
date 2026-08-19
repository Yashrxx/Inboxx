DROP FUNCTION IF EXISTS public.match_kb_chunks(vector(3072), int);

CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(3072),
  workspace_id_filter uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  filename text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.filename
  FROM public.kb_chunks c
  JOIN public.kb_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.workspace_id = workspace_id_filter
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
