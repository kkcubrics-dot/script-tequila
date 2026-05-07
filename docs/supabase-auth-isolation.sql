-- Run once after enabling Supabase Auth.
-- This migration adds per-user isolation for notes/messages/settings tables.

alter table notes add column if not exists user_id uuid;
alter table notes add column if not exists created_at timestamptz not null default now();
alter table notes add column if not exists folder_id text;
create table if not exists folders (
  id text primary key,
  user_id uuid,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists note_versions (
  id text primary key,
  user_id uuid,
  note_id text not null,
  version_no integer not null,
  title text not null,
  content text not null default '',
  structured_sections jsonb not null default '{}'::jsonb,
  editor text,
  created_at timestamptz not null default now()
);
alter table messages add column if not exists user_id uuid;
alter table settings add column if not exists user_id uuid;

with first_user as (
  select id from auth.users order by created_at asc limit 1
)
update notes n set user_id = (select id from first_user) where n.user_id is null;
with first_user as (
  select id from auth.users order by created_at asc limit 1
)
update messages m set user_id = (select id from first_user) where m.user_id is null;
with first_user as (
  select id from auth.users order by created_at asc limit 1
)
update settings s set user_id = (select id from first_user) where s.user_id is null;
with first_user as (
  select id from auth.users order by created_at asc limit 1
)
update folders f set user_id = (select id from first_user) where f.user_id is null;
with first_user as (
  select id from auth.users order by created_at asc limit 1
)
update note_versions nv set user_id = (select id from first_user) where nv.user_id is null;

alter table notes alter column user_id set not null;
alter table messages alter column user_id set not null;
alter table settings alter column user_id set not null;
alter table folders alter column user_id set not null;
alter table note_versions alter column user_id set not null;

create index if not exists idx_notes_user_id on notes(user_id);
create index if not exists idx_messages_user_id on messages(user_id);
create index if not exists idx_settings_user_id on settings(user_id);
create index if not exists idx_folders_user_id on folders(user_id);
create index if not exists idx_note_versions_user_id on note_versions(user_id);

alter table notes enable row level security;
alter table messages enable row level security;
alter table settings enable row level security;
alter table folders enable row level security;
alter table note_versions enable row level security;

drop policy if exists notes_owner_all on notes;
create policy notes_owner_all on notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists messages_owner_all on messages;
create policy messages_owner_all on messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists settings_owner_all on settings;
create policy settings_owner_all on settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists folders_owner_all on folders;
create policy folders_owner_all on folders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists note_versions_owner_all on note_versions;
create policy note_versions_owner_all on note_versions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
