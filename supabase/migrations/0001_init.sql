-- WAT.ai Ops Platform — initial schema
-- Four primitives: entity records, tasks, approvals, activity log.
-- RBAC via members.role + row-level security. Lanes are config, not code.

create type member_role as enum ('admin', 'exec', 'director', 'tpm');
create type relationship_type as enum ('sponsor', 'event_partner', 'social_partner');
create type deal_stage as enum ('prospect', 'contacted', 'call_booked', 'proposal_sent', 'committed', 'paid', 'renewal');
create type touchpoint_kind as enum ('email', 'call', 'event', 'discord', 'other');
create type awaiting_reply as enum ('us', 'them', 'none');
create type task_status as enum ('open', 'done', 'dropped');
create type approval_type as enum ('deal', 'lead_assignment', 'lead_transfer', 'funding_request');
create type approval_status as enum ('pending', 'approved', 'rejected');

-- ---------- config ----------
create table lanes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  discord_channel_id text,
  created_at timestamptz not null default now()
);

-- ---------- members ----------
create table members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  email text unique not null,
  discord_username text,
  discord_user_id text,
  role member_role not null default 'tpm',
  lane_id uuid references lanes (id),
  notes text,
  created_at timestamptz not null default now()
);

create table member_role_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  role text not null,
  started_on date not null,
  ended_on date
);

-- Link an auth user to their member row by email on first sign-in.
create or replace function public.link_member_on_signin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update members set auth_user_id = new.id
  where email = new.email and auth_user_id is null;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_member_on_signin();

-- ---------- RBAC helpers ----------
create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from members where auth_user_id = auth.uid();
$$;

create or replace function public.current_member_role()
returns member_role language sql stable security definer set search_path = public as $$
  select role from members where auth_user_id = auth.uid();
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where auth_user_id = auth.uid());
$$;

create or replace function public.is_admin_or_exec()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_member_role() in ('admin','exec'), false);
$$;

-- ---------- partnerships ----------
create table partner_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relationship_type relationship_type not null default 'sponsor',
  tier text,
  industry text,
  warmth text,
  source text, -- cold / event / referral / inbound
  benefits_sought text[] not null default '{}', -- hiring_talent / sponsored_events / sponsored_project / org_funding / custom
  tone text, -- mvp3: outreach tone per partner
  owner_member_id uuid references members (id),
  renewal_date date,
  drive_folder_url text,
  links jsonb not null default '{}'::jsonb, -- socials, site, etc.
  notes text,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references partner_orgs (id) on delete cascade,
  name text not null,
  aka text[] not null default '{}', -- nicknames; used for Interac fuzzy matching (mvp2)
  email text,
  role_title text,
  how_met text,
  lifecycle_stage text not null default 'lead', -- lead / engaged / champion / dormant
  links jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table touchpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references partner_orgs (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  member_id uuid references members (id),
  kind touchpoint_kind not null default 'email',
  occurred_at timestamptz not null default now(),
  summary text not null,
  next_action text,
  awaiting_reply_from awaiting_reply not null default 'none', -- 'us' drives the SLA clock
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references partner_orgs (id) on delete cascade,
  name text not null,
  amount_cents bigint,
  currency text not null default 'CAD', -- CAD / USD distinction is required
  stage deal_stage not null default 'prospect',
  stage_entered_at timestamptz not null default now(), -- time-in-stage tracking
  round text, -- e.g. 2026-fall, 2027-winter
  priority boolean not null default false,
  visibility_open boolean not null default false, -- exec toggle: directors may self-request lead
  lead_member_id uuid references members (id),
  notes text,
  created_at timestamptz not null default now()
);

create table deal_allocations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  label text not null, -- contract-determined allocation, e.g. "general", "Hack event"
  amount_cents bigint not null
);

-- ---------- events (thin V0 schema; UI lands V1) ----------
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text,
  starts_at timestamptz,
  venue text,
  budget_cents bigint,
  status text not null default 'planning',
  event_url text, -- Luma or other; scrape source for analytics (always human-editable)
  purchase_list jsonb not null default '[]'::jsonb,
  signups integer,
  attendance integer,
  promo_methods text[] not null default '{}',
  promo_start_date date,
  drive_folder_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table event_partnerships (
  event_id uuid not null references events (id) on delete cascade,
  org_id uuid not null references partner_orgs (id) on delete cascade,
  primary key (event_id, org_id)
);

-- ---------- projects (thin V0 schema; UI lands V1) ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  drive_folder_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  role text not null default 'cm', -- tpm / cm
  primary key (project_id, member_id)
);

create table project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  due_on date,
  completed_on date
);

create table project_artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind text not null, -- writeup / github / discord_message / press / drive / other
  url text not null,
  label text,
  added_at timestamptz not null default now()
);

-- Project check-ins reuse the touchpoint pattern with TPMs as the counterpart.
create table project_touchpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  member_id uuid references members (id), -- who logged it
  occurred_at timestamptz not null default now(),
  summary text not null,
  next_action text
);

-- ---------- primitive: tasks ----------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  lane_id uuid references lanes (id),
  assignee_member_id uuid references members (id),
  entity_type text, -- partner_org / deal / event / project / null
  entity_id uuid,
  labels text[] not null default '{}',
  due_at timestamptz,
  remind boolean not null default true, -- Discord follow-up on by default
  status task_status not null default 'open',
  created_by uuid references members (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- primitive: approvals ----------
create table approvals (
  id uuid primary key default gen_random_uuid(),
  type approval_type not null,
  requester_member_id uuid references members (id),
  approver_member_id uuid references members (id), -- null = any eligible approver
  payload jsonb not null default '{}'::jsonb,
  status approval_status not null default 'pending',
  reasoning text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references members (id)
);

-- ---------- primitive: activity log ----------
create table activity_log (
  id bigint generated always as identity primary key,
  member_id uuid references members (id),
  verb text not null, -- created / updated / stage_changed / completed / approved / ...
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_touchpoints_org on touchpoints (org_id, occurred_at desc);
create index idx_tasks_open on tasks (status, due_at);
create index idx_deals_stage on deals (stage);
create index idx_activity_entity on activity_log (entity_type, entity_id);

-- ---------- row-level security ----------
-- MVP policy model: allowlisted members read everything; writes are tiered.
-- Directors/TPMs can write operational records (touchpoints, tasks, contacts);
-- structural/approval writes are admin/exec. Tighten per-lane in V1.

alter table lanes enable row level security;
alter table members enable row level security;
alter table member_role_history enable row level security;
alter table partner_orgs enable row level security;
alter table contacts enable row level security;
alter table touchpoints enable row level security;
alter table deals enable row level security;
alter table deal_allocations enable row level security;
alter table events enable row level security;
alter table event_partnerships enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_milestones enable row level security;
alter table project_artifacts enable row level security;
alter table project_touchpoints enable row level security;
alter table tasks enable row level security;
alter table approvals enable row level security;
alter table activity_log enable row level security;

create policy member_read_lanes on lanes for select using (public.is_member());
create policy admin_write_lanes on lanes for all using (public.current_member_role() = 'admin');

create policy member_read_members on members for select using (public.is_member());
create policy exec_write_members on members for insert with check (public.is_admin_or_exec());
create policy exec_update_members on members for update using (public.is_admin_or_exec());
create policy admin_delete_members on members for delete using (public.current_member_role() = 'admin');

create policy member_read_role_history on member_role_history for select using (public.is_member());
create policy exec_write_role_history on member_role_history for all using (public.is_admin_or_exec());

create policy member_read_orgs on partner_orgs for select using (public.is_member());
create policy member_write_orgs on partner_orgs for insert with check (public.is_member());
create policy member_update_orgs on partner_orgs for update using (public.is_member());
create policy exec_delete_orgs on partner_orgs for delete using (public.is_admin_or_exec());

create policy member_all_contacts on contacts for all using (public.is_member()) with check (public.is_member());
create policy member_all_touchpoints on touchpoints for all using (public.is_member()) with check (public.is_member());

create policy member_read_deals on deals for select using (public.is_member());
create policy member_write_deals on deals for insert with check (public.is_member());
create policy member_update_deals on deals for update using (public.is_member());
create policy exec_delete_deals on deals for delete using (public.is_admin_or_exec());
create policy member_all_allocations on deal_allocations for all using (public.is_member()) with check (public.is_member());

create policy member_all_events on events for all using (public.is_member()) with check (public.is_member());
create policy member_all_event_partnerships on event_partnerships for all using (public.is_member()) with check (public.is_member());
create policy member_all_projects on projects for all using (public.is_member()) with check (public.is_member());
create policy member_all_project_members on project_members for all using (public.is_member()) with check (public.is_member());
create policy member_all_project_milestones on project_milestones for all using (public.is_member()) with check (public.is_member());
create policy member_all_project_artifacts on project_artifacts for all using (public.is_member()) with check (public.is_member());
create policy member_all_project_touchpoints on project_touchpoints for all using (public.is_member()) with check (public.is_member());

create policy member_all_tasks on tasks for all using (public.is_member()) with check (public.is_member());

create policy member_read_approvals on approvals for select using (public.is_member());
create policy member_request_approvals on approvals for insert with check (public.is_member());
create policy exec_decide_approvals on approvals for update using (public.is_admin_or_exec());

create policy member_read_activity on activity_log for select using (public.is_member());
create policy member_write_activity on activity_log for insert with check (public.is_member());
