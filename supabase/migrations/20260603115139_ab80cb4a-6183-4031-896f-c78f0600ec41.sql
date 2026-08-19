
-- Enable pgvector
create extension if not exists vector;

-- ============ KB documents ============
create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null unique,
  mime_type text,
  byte_size integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.kb_documents to authenticated;
grant all on public.kb_documents to service_role;

alter table public.kb_documents enable row level security;

create policy "authenticated can read kb_documents"
  on public.kb_documents for select to authenticated using (true);
create policy "authenticated can insert kb_documents"
  on public.kb_documents for insert to authenticated with check (true);
create policy "authenticated can delete kb_documents"
  on public.kb_documents for delete to authenticated using (true);

-- ============ KB chunks with embeddings ============
-- Gemini embedding-001 default dim = 3072
create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(3072),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.kb_chunks to authenticated;
grant all on public.kb_chunks to service_role;

alter table public.kb_chunks enable row level security;

create policy "authenticated can read kb_chunks"
  on public.kb_chunks for select to authenticated using (true);

-- (No HNSW index — pgvector HNSW supports max 2000 dims; we'll use sequential
-- cosine scan via the match function. Fine for KB-scale corpora.)

-- ============ Match function for semantic search ============
create or replace function public.match_kb_chunks(
  query_embedding vector(3072),
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  filename text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.filename
  from public.kb_chunks c
  join public.kb_documents d on d.id = c.document_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_kb_chunks(vector, int) to anon, authenticated, service_role;

-- ============ Answer logs ============
create type public.log_type as enum ('chat', 'email_draft');
create type public.log_status as enum ('new', 'good', 'needs_fix', 'sent', 'archived');

create table public.answer_logs (
  id uuid primary key default gen_random_uuid(),
  type public.log_type not null,
  incoming_text text not null,
  answer_text text not null,
  sources_used jsonb not null default '[]'::jsonb,
  confidence_flag boolean not null default false,
  rating smallint, -- 1 = thumbs up, -1 = thumbs down
  correction text,
  status public.log_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.answer_logs to authenticated;
grant all on public.answer_logs to service_role;

alter table public.answer_logs enable row level security;

-- Only authenticated (admin) users can view/manage logs.
create policy "authenticated can read answer_logs"
  on public.answer_logs for select to authenticated using (true);
create policy "authenticated can update answer_logs"
  on public.answer_logs for update to authenticated using (true) with check (true);
create policy "authenticated can delete answer_logs"
  on public.answer_logs for delete to authenticated using (true);
-- Inserts come from server (service role); no insert policy for authenticated.

create index answer_logs_type_created_idx on public.answer_logs (type, created_at desc);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger answer_logs_set_updated_at
  before update on public.answer_logs
  for each row execute function public.tg_set_updated_at();
