-- Google Drive-backed document storage metadata.
-- Existing Supabase Storage documents remain supported.
alter table public.documents
  add column if not exists storage_provider text not null default 'supabase';

alter table public.documents
  add column if not exists drive_file_id text;

alter table public.documents
  drop constraint if exists documents_storage_provider_check;

alter table public.documents
  add constraint documents_storage_provider_check
  check (storage_provider in ('supabase','google-drive'));

create index if not exists documents_storage_provider_idx
  on public.documents(user_id, storage_provider);

create index if not exists documents_drive_file_id_idx
  on public.documents(drive_file_id)
  where drive_file_id is not null;
