-- AgentWatch initial schema
-- Creates all enums, tables, indexes, RLS policies, and auth trigger

-- =============================================================================
-- ENUMS
-- =============================================================================

create type plan_type as enum ('free', 'pro', 'enterprise');
create type member_role as enum ('admin', 'analyst', 'viewer');
create type data_source_type as enum ('file_upload', 'splunk', 'datadog', 'aws_cloudtrail');
create type job_status as enum ('pending', 'running', 'completed', 'failed');
create type agent_status as enum ('new', 'reviewed', 'sanctioned', 'blocked');
create type alert_type as enum ('new_agent', 'behavior_change', 'high_risk', 'credential_sensitive');
create type alert_severity as enum ('info', 'warning', 'critical');

-- =============================================================================
-- TABLES
-- =============================================================================

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan        plan_type not null default 'free',
  slack_webhook_url text,
  created_at  timestamptz not null default now()
);

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            member_role not null default 'admin',
  created_at      timestamptz not null default now(),

  unique (organization_id, user_id)
);

create table data_sources (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type            data_source_type not null,
  name            text not null,
  config          jsonb not null default '{}',
  status          text not null default 'pending',
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);

create table ingestion_jobs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  data_source_id  uuid not null references data_sources(id) on delete cascade,
  status          job_status not null default 'pending',
  file_path       text,
  event_count     int not null default 0,
  started_at      timestamptz,
  finished_at     timestamptz,
  error_message   text,
  created_at      timestamptz not null default now()
);

create table agents (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  name                text not null,
  provider            text,
  first_seen_at       timestamptz,
  last_seen_at        timestamptz,
  event_count_7d      int not null default 0,
  associated_identity text,
  destinations        text[] not null default '{}',
  risk_score          int not null default 0,
  risk_factors        jsonb not null default '{}',
  owner               text,
  status              agent_status not null default 'new',
  notes               text,
  detection_rationale text,
  created_at          timestamptz not null default now()
);

create table agent_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  agent_id         uuid not null references agents(id) on delete cascade,
  timestamp        timestamptz not null,
  source_ip        text,
  destination_host text,
  destination_path text,
  http_method      text,
  user_agent       text,
  identity         text,
  raw_payload      jsonb,
  created_at       timestamptz not null default now()
);

create table alerts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_id        uuid not null references agents(id) on delete cascade,
  type            alert_type not null,
  severity        alert_severity not null default 'info',
  message         text not null,
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now()
);

create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid,
  action          text not null,
  details         jsonb,
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_memberships_organization_id on memberships(organization_id);
create index idx_memberships_user_id         on memberships(user_id);
create index idx_data_sources_organization_id on data_sources(organization_id);
create index idx_ingestion_jobs_organization_id on ingestion_jobs(organization_id);
create index idx_agents_organization_id      on agents(organization_id);
create index idx_agents_organization_status  on agents(organization_id, status);
create index idx_agent_events_organization_id on agent_events(organization_id);
create index idx_agent_events_agent_timestamp on agent_events(agent_id, timestamp);
create index idx_alerts_organization_id      on alerts(organization_id);
create index idx_audit_log_organization_id   on audit_log(organization_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table organizations  enable row level security;
alter table memberships     enable row level security;
alter table data_sources    enable row level security;
alter table ingestion_jobs  enable row level security;
alter table agents          enable row level security;
alter table agent_events    enable row level security;
alter table alerts          enable row level security;
alter table audit_log       enable row level security;

-- Helper: returns the set of organization IDs the current user belongs to.
create or replace function user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.memberships
  where user_id = auth.uid();
$$;

-- organizations: user can see orgs they belong to
create policy "Users can view their organizations"
  on organizations for select
  using (id in (select user_organization_ids()));

create policy "Users can update their organizations"
  on organizations for update
  using (id in (select user_organization_ids()));

-- memberships: user can see memberships within their orgs
create policy "Users can view memberships in their orgs"
  on memberships for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert memberships in their orgs"
  on memberships for insert
  with check (organization_id in (select user_organization_ids()));

create policy "Users can delete memberships in their orgs"
  on memberships for delete
  using (organization_id in (select user_organization_ids()));

-- data_sources
create policy "Users can view data_sources in their orgs"
  on data_sources for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert data_sources in their orgs"
  on data_sources for insert
  with check (organization_id in (select user_organization_ids()));

create policy "Users can update data_sources in their orgs"
  on data_sources for update
  using (organization_id in (select user_organization_ids()));

create policy "Users can delete data_sources in their orgs"
  on data_sources for delete
  using (organization_id in (select user_organization_ids()));

-- ingestion_jobs
create policy "Users can view ingestion_jobs in their orgs"
  on ingestion_jobs for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert ingestion_jobs in their orgs"
  on ingestion_jobs for insert
  with check (organization_id in (select user_organization_ids()));

create policy "Users can update ingestion_jobs in their orgs"
  on ingestion_jobs for update
  using (organization_id in (select user_organization_ids()));

-- agents
create policy "Users can view agents in their orgs"
  on agents for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert agents in their orgs"
  on agents for insert
  with check (organization_id in (select user_organization_ids()));

create policy "Users can update agents in their orgs"
  on agents for update
  using (organization_id in (select user_organization_ids()));

-- agent_events
create policy "Users can view agent_events in their orgs"
  on agent_events for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert agent_events in their orgs"
  on agent_events for insert
  with check (organization_id in (select user_organization_ids()));

-- alerts
create policy "Users can view alerts in their orgs"
  on alerts for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert alerts in their orgs"
  on alerts for insert
  with check (organization_id in (select user_organization_ids()));

create policy "Users can update alerts in their orgs"
  on alerts for update
  using (organization_id in (select user_organization_ids()));

-- audit_log
create policy "Users can view audit_log in their orgs"
  on audit_log for select
  using (organization_id in (select user_organization_ids()));

create policy "Users can insert audit_log in their orgs"
  on audit_log for insert
  with check (organization_id in (select user_organization_ids()));

-- =============================================================================
-- AUTH TRIGGER: auto-create org + membership on signup
-- =============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
begin
  insert into public.organizations (name)
  values ('My Organization')
  returning id into new_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, new.id, 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
