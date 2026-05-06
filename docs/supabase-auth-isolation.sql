-- Run once after enabling Supabase Auth.
-- This migration adds per-user isolation for existing tables.

alter table projects add column if not exists user_id uuid;
alter table notes add column if not exists user_id uuid;
alter table messages add column if not exists user_id uuid;
alter table settings add column if not exists user_id uuid;

with first_user as (
  select id from auth.users order by created_at asc limit 1
)
update projects p set user_id = (select id from first_user) where p.user_id is null;
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

alter table projects alter column user_id set not null;
alter table notes alter column user_id set not null;
alter table messages alter column user_id set not null;
alter table settings alter column user_id set not null;

create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_notes_user_id on notes(user_id);
create index if not exists idx_messages_user_id on messages(user_id);
create index if not exists idx_settings_user_id on settings(user_id);

alter table projects enable row level security;
alter table notes enable row level security;
alter table messages enable row level security;
alter table settings enable row level security;

drop policy if exists projects_owner_all on projects;
create policy projects_owner_all on projects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notes_owner_all on notes;
create policy notes_owner_all on notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists messages_owner_all on messages;
create policy messages_owner_all on messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists settings_owner_all on settings;
create policy settings_owner_all on settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
