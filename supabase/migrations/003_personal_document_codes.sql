-- Private reference codes. Values are intentionally NOT stored in GitHub.
-- Run this migration in the Supabase SQL editor, then insert the four codes there.
create table if not exists public.personal_document_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (label in ('Laxman','Sani','Family','Sister')),
  code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, label)
);

alter table public.personal_document_codes enable row level security;

drop policy if exists "Users can read their own personal codes" on public.personal_document_codes;
create policy "Users can read their own personal codes"
on public.personal_document_codes for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own personal codes" on public.personal_document_codes;
create policy "Users can insert their own personal codes"
on public.personal_document_codes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own personal codes" on public.personal_document_codes;
create policy "Users can update their own personal codes"
on public.personal_document_codes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own personal codes" on public.personal_document_codes;
create policy "Users can delete their own personal codes"
on public.personal_document_codes for delete
using (auth.uid() = user_id);

create index if not exists personal_document_codes_user_idx
on public.personal_document_codes(user_id);

-- After the migration, insert your values in Supabase SQL editor using your authenticated user's UUID.
-- Example (replace YOUR_USER_UUID):
-- insert into public.personal_document_codes (user_id,label,code) values
-- ('YOUR_USER_UUID','Laxman','YOUR_CODE'),
-- ('YOUR_USER_UUID','Sani','YOUR_CODE'),
-- ('YOUR_USER_UUID','Family','YOUR_CODE'),
-- ('YOUR_USER_UUID','Sister','YOUR_CODE');
