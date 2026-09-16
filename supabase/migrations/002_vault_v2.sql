-- Vault v2: folders + soft trash.
-- Run this after supabase/schema.sql in the Supabase SQL editor.

alter table public.documents
  add column if not exists folder text not null default 'Home';

alter table public.documents
  add column if not exists deleted_at timestamptz;

create index if not exists documents_user_folder_idx
  on public.documents(user_id, folder);

create index if not exists documents_user_deleted_idx
  on public.documents(user_id, deleted_at);

-- Keep folder values predictable without changing the existing category model.
update public.documents
set folder = 'Home'
where folder is null or btrim(folder) = '';

-- RLS from schema.sql remains the authorization boundary: users can only
-- mutate rows whose user_id equals auth.uid().
