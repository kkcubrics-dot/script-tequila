-- Run in Supabase SQL editor

create table if not exists projects (
  id text primary key,
  name text not null,
  description text default '',
  logline text default '',
  genre text default '',
  tone text default '',
  target_length text default '',
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  title text not null,
  content text not null default '',
  structured_sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_project_id on notes(project_id);
create index if not exists idx_notes_updated_at on notes(updated_at desc);

create table if not exists messages (
  id text primary key,
  project_id text references projects(id) on delete set null,
  note_id text references notes(id) on delete set null,
  session_id text,
  source text not null check (source in ('human','model','agent','system')),
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_session_id on messages(session_id);
create index if not exists idx_messages_project_note on messages(project_id, note_id);
create index if not exists idx_messages_created_at on messages(created_at);

create table if not exists settings (
  id text primary key,
  provider text not null,
  model text not null,
  api_key text not null default '',
  base_url text not null,
  system_prompt text not null,
  updated_at timestamptz not null default now()
);

-- For this server-side service-role based prototype, we keep RLS off.
-- Turn on RLS after adding user auth and per-user ownership columns.
alter table projects disable row level security;
alter table notes disable row level security;
alter table messages disable row level security;
alter table settings disable row level security;
