create table if not exists public.community_user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('users', 'moderator', 'owner')),
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

insert into public.community_user_roles (user_id, role)
select id, 'users'
from auth.users
on conflict (user_id) do nothing;

create or replace function public.assign_default_community_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_user_roles (user_id, role)
  values (new.id, 'users')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_community_role on auth.users;
create trigger on_auth_user_created_community_role
  after insert on auth.users
  for each row execute function public.assign_default_community_role();

alter table public.community_user_roles enable row level security;
revoke all on public.community_user_roles from anon, authenticated;
grant select on public.community_user_roles to authenticated;
drop policy if exists "Users can read their own community role"
  on public.community_user_roles;
create policy "Users can read their own community role"
  on public.community_user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.community_ban_proposals (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete restrict,
  duration_hours integer check (
    duration_hours is null or duration_hours between 1 and 876000
  ),
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users (id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index if not exists community_ban_one_pending_per_user_idx
  on public.community_ban_proposals (target_user_id)
  where status = 'pending';

create index if not exists community_ban_proposals_pending_created_idx
  on public.community_ban_proposals (created_at desc)
  where status = 'pending';

create table if not exists public.community_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  banned_by uuid not null references auth.users (id) on delete restrict,
  proposal_id uuid unique references public.community_ban_proposals (id)
    on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  check (expires_at is null or expires_at > created_at)
);

create table if not exists public.community_security_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.community_ban_proposals enable row level security;
alter table public.community_bans enable row level security;
alter table public.community_security_audit enable row level security;

revoke all on public.community_ban_proposals from anon, authenticated;
revoke all on public.community_bans from anon, authenticated;
revoke all on public.community_security_audit from anon, authenticated;
revoke all on sequence public.community_security_audit_id_seq
  from anon, authenticated;

create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 4000),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index if not exists site_announcements_active_idx
  on public.site_announcements (starts_at desc)
  where is_active;

alter table public.site_announcements enable row level security;
revoke all on public.site_announcements from anon, authenticated;
grant select on public.site_announcements to anon, authenticated;
drop policy if exists "Active site announcements are public"
  on public.site_announcements;
create policy "Active site announcements are public"
  on public.site_announcements for select
  to anon, authenticated
  using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

create or replace function public.request_community_ban(
  p_actor_id uuid,
  p_target_user_id uuid,
  p_duration_hours integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
  v_expires_at timestamptz;
  v_proposal_id uuid;
begin
  select role into v_actor_role
  from public.community_user_roles
  where user_id = p_actor_id
  for update;

  if v_actor_role is null or v_actor_role not in ('moderator', 'owner') then
    raise exception 'insufficient_role' using errcode = '42501';
  end if;
  if p_actor_id = p_target_user_id then
    raise exception 'cannot_ban_self' using errcode = '22023';
  end if;
  if p_duration_hours is not null
    and p_duration_hours not between 1 and 876000 then
    raise exception 'invalid_ban_duration' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception 'invalid_ban_reason' using errcode = '22023';
  end if;

  select role into v_target_role
  from public.community_user_roles
  where user_id = p_target_user_id
  for update;

  if v_target_role is null then
    raise exception 'target_user_not_found' using errcode = 'P0002';
  end if;
  if v_target_role = 'owner' then
    raise exception 'cannot_ban_owner' using errcode = '42501';
  end if;
  if v_actor_role = 'moderator' and v_target_role <> 'users' then
    raise exception 'moderator_can_only_ban_users' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.community_bans
    where user_id = p_target_user_id
      and (expires_at is null or expires_at > now())
  ) then
    raise exception 'user_already_banned' using errcode = '23505';
  end if;

  if p_duration_hours is not null then
    v_expires_at := now() + make_interval(hours => p_duration_hours);
  end if;

  if v_actor_role = 'moderator' then
    if exists (
      select 1
      from public.community_ban_proposals
      where target_user_id = p_target_user_id
        and status = 'pending'
    ) then
      raise exception 'ban_proposal_already_pending' using errcode = '23505';
    end if;

    insert into public.community_ban_proposals (
      target_user_id, requested_by, duration_hours, reason
    )
    values (
      p_target_user_id, p_actor_id, p_duration_hours, trim(p_reason)
    )
    returning id into v_proposal_id;

    insert into public.community_security_audit (
      actor_id, target_user_id, action, details
    )
    values (
      p_actor_id, p_target_user_id, 'ban_proposed',
      jsonb_build_object(
        'proposal_id', v_proposal_id,
        'duration_hours', p_duration_hours,
        'reason', trim(p_reason)
      )
    );

    return jsonb_build_object(
      'status', 'pending',
      'proposal_id', v_proposal_id,
      'expires_at', v_expires_at
    );
  end if;

  insert into public.community_bans (
    user_id, banned_by, proposal_id, reason, created_at, expires_at
  )
  values (
    p_target_user_id, p_actor_id, null, trim(p_reason), now(), v_expires_at
  )
  on conflict (user_id) do update
  set banned_by = excluded.banned_by,
      proposal_id = null,
      reason = excluded.reason,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at;

  insert into public.community_security_audit (
    actor_id, target_user_id, action, details
  )
  values (
    p_actor_id, p_target_user_id, 'user_banned',
    jsonb_build_object(
      'duration_hours', p_duration_hours,
      'reason', trim(p_reason)
    )
  );

  return jsonb_build_object('status', 'banned', 'expires_at', v_expires_at);
end;
$$;

create or replace function public.resolve_community_ban(
  p_actor_id uuid,
  p_proposal_id uuid,
  p_approve boolean,
  p_decision_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_proposal public.community_ban_proposals%rowtype;
  v_target_role text;
  v_expires_at timestamptz;
begin
  select role into v_actor_role
  from public.community_user_roles
  where user_id = p_actor_id
  for update;

  if v_actor_role is distinct from 'moderator' then
    raise exception 'moderator_required_to_approve' using errcode = '42501';
  end if;

  select * into v_proposal
  from public.community_ban_proposals
  where id = p_proposal_id
  for update;

  if not found or v_proposal.status <> 'pending' then
    raise exception 'pending_proposal_not_found' using errcode = 'P0002';
  end if;
  if v_proposal.requested_by = p_actor_id then
    raise exception 'cannot_approve_own_proposal' using errcode = '42501';
  end if;

  select role into v_target_role
  from public.community_user_roles
  where user_id = v_proposal.target_user_id
  for update;
  if v_target_role is distinct from 'users' then
    raise exception 'target_is_no_longer_regular_user' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_decision_reason, ''))) > 1000 then
    raise exception 'invalid_decision_reason' using errcode = '22023';
  end if;

  if p_approve then
    if v_proposal.duration_hours is not null then
      v_expires_at := now() + make_interval(hours => v_proposal.duration_hours);
    end if;

    if exists (
      select 1 from public.community_bans
      where user_id = v_proposal.target_user_id
        and (expires_at is null or expires_at > now())
    ) then
      raise exception 'user_already_banned' using errcode = '23505';
    end if;

    insert into public.community_bans (
      user_id, banned_by, proposal_id, reason, created_at, expires_at
    )
    values (
      v_proposal.target_user_id,
      p_actor_id,
      v_proposal.id,
      v_proposal.reason,
      now(),
      v_expires_at
    )
    on conflict (user_id) do update
    set banned_by = excluded.banned_by,
        proposal_id = excluded.proposal_id,
        reason = excluded.reason,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at;
  end if;

  update public.community_ban_proposals
  set status = case when p_approve then 'approved' else 'rejected' end,
      decided_by = p_actor_id,
      decision_reason = nullif(trim(p_decision_reason), ''),
      decided_at = now()
  where id = v_proposal.id;

  insert into public.community_security_audit (
    actor_id, target_user_id, action, details
  )
  values (
    p_actor_id,
    v_proposal.target_user_id,
    case when p_approve then 'ban_approved' else 'ban_rejected' end,
    jsonb_build_object(
      'proposal_id', v_proposal.id,
      'decision_reason', nullif(trim(p_decision_reason), '')
    )
  );

  return jsonb_build_object(
    'status', case when p_approve then 'approved' else 'rejected' end,
    'target_user_id', v_proposal.target_user_id,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.set_community_moderator(
  p_actor_id uuid,
  p_target_user_id uuid,
  p_make_moderator boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  select role into v_actor_role
  from public.community_user_roles
  where user_id = p_actor_id
  for update;
  if v_actor_role is distinct from 'owner' then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if p_actor_id = p_target_user_id then
    raise exception 'cannot_change_own_role' using errcode = '22023';
  end if;

  select role into v_target_role
  from public.community_user_roles
  where user_id = p_target_user_id
  for update;
  if v_target_role is null then
    raise exception 'target_user_not_found' using errcode = 'P0002';
  end if;
  if v_target_role = 'owner' then
    raise exception 'cannot_change_owner_role' using errcode = '42501';
  end if;
  if not p_make_moderator and v_target_role <> 'moderator' then
    raise exception 'target_is_not_moderator' using errcode = '22023';
  end if;

  update public.community_user_roles
  set role = case when p_make_moderator then 'moderator' else 'users' end,
      changed_by = p_actor_id,
      changed_at = now()
  where user_id = p_target_user_id;

  insert into public.community_security_audit (
    actor_id, target_user_id, action
  )
  values (
    p_actor_id, p_target_user_id,
    case when p_make_moderator then 'moderator_added' else 'moderator_removed' end
  );
end;
$$;

create or replace function public.moderate_community_post(
  p_actor_id uuid,
  p_post_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role
  from public.community_user_roles
  where user_id = p_actor_id;
  if v_actor_role is null or v_actor_role not in ('moderator', 'owner') then
    raise exception 'insufficient_role' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid_post_status' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) > 1000 then
    raise exception 'invalid_moderation_reason' using errcode = '22023';
  end if;

  update public.posts
  set status = p_status
  where id = p_post_id;
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;

  insert into public.community_security_audit (
    actor_id, action, details
  )
  values (
    p_actor_id,
    'post_moderated',
    jsonb_build_object(
      'post_id', p_post_id,
      'status', p_status,
      'reason', nullif(trim(p_reason), '')
    )
  );
end;
$$;

revoke all on function public.request_community_ban(uuid, uuid, integer, text)
  from public, anon, authenticated;
revoke all on function public.resolve_community_ban(uuid, uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.set_community_moderator(uuid, uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.moderate_community_post(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.request_community_ban(uuid, uuid, integer, text)
  to service_role;
grant execute on function public.resolve_community_ban(uuid, uuid, boolean, text)
  to service_role;
grant execute on function public.set_community_moderator(uuid, uuid, boolean)
  to service_role;
grant execute on function public.moderate_community_post(uuid, uuid, text, text)
  to service_role;
