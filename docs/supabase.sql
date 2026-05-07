-- Run in Supabase SQL editor

create table if not exists notes (
  id text primary key,
  user_id uuid not null,
  folder_id text,
  folder text not null default '',
  title text not null,
  content text not null default '',
  structured_sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists folders (
  id text primary key,
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists note_versions (
  id text primary key,
  user_id uuid not null,
  note_id text not null references notes(id) on delete cascade,
  version_no integer not null,
  title text not null,
  content text not null default '',
  structured_sections jsonb not null default '{}'::jsonb,
  editor text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_user_id on notes(user_id);
create index if not exists idx_notes_folder on notes(folder);
create index if not exists idx_notes_folder_id on notes(folder_id);
create index if not exists idx_notes_created_at on notes(created_at);
create index if not exists idx_notes_updated_at on notes(updated_at desc);
create index if not exists idx_folders_user_id on folders(user_id);
create index if not exists idx_folders_created_at on folders(created_at);
create index if not exists idx_note_versions_note_id on note_versions(note_id);
create index if not exists idx_note_versions_user_id on note_versions(user_id);
create unique index if not exists idx_note_versions_note_version_unique on note_versions(note_id, version_no);

create table if not exists messages (
  id text primary key,
  user_id uuid not null,
  note_id text references notes(id) on delete set null,
  session_id text,
  source text not null check (source in ('human','model','agent','system')),
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_user_id on messages(user_id);
create index if not exists idx_messages_session_id on messages(session_id);
create index if not exists idx_messages_note_id on messages(note_id);
create index if not exists idx_messages_created_at on messages(created_at);

create table if not exists settings (
  id text primary key,
  user_id uuid not null,
  provider text not null,
  model text not null,
  api_key text not null default '',
  base_url text not null,
  system_prompt text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_settings_user_id on settings(user_id);

alter table notes enable row level security;
alter table folders enable row level security;
alter table note_versions enable row level security;
alter table messages enable row level security;
alter table settings enable row level security;

drop policy if exists notes_owner_all on notes;
create policy notes_owner_all on notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists messages_owner_all on messages;
create policy messages_owner_all on messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists folders_owner_all on folders;
create policy folders_owner_all on folders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists note_versions_owner_all on note_versions;
create policy note_versions_owner_all on note_versions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists settings_owner_all on settings;
create policy settings_owner_all on settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
