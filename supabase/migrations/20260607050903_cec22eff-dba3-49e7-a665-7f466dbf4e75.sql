DROP FUNCTION IF EXISTS public.match_kb_chunks(vector, integer);
DROP FUNCTION IF EXISTS public.match_kb_chunks(vector, uuid, integer);

CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector,
  workspace_id_filter uuid,
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision, filename text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.filename
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where c.embedding is not null
    and d.workspace_id = workspace_id_filter
  order by c.embedding <=> query_embedding
  limit match_count;
$$;