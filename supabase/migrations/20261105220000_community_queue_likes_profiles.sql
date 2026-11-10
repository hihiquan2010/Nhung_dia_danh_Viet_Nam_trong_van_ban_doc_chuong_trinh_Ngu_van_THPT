alter table public.posts
  drop constraint if exists posts_status_values;

alter table public.posts
  add constraint posts_status_values
  check (status in ('pending', 'approved', 'rejected'));

alter table public.post_comments
  add column if not exists status text not null default 'approved';

alter table public.post_comments
  drop constraint if exists post_comments_status_values;

alter table public.post_comments
  add constraint post_comments_status_values
  check (status in ('pending', 'approved', 'rejected'));

drop policy if exists "Approved post comments are publicly readable"
  on public.post_comments;
create policy "Approved post comments are publicly readable"
  on public.post_comments for select
  to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.posts
      where posts.id = post_comments.post_id
        and posts.status = 'approved'
    )
  );

create table if not exists public.community_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('post', 'comment')),
  entity_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  content_to_moderate text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'approved', 'rejected')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  locked_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (entity_type, entity_id)
);

create index if not exists community_moderation_queue_pending_idx
  on public.community_moderation_queue (next_attempt_at, created_at)
  where status in ('pending', 'processing');

alter table public.community_moderation_queue enable row level security;
revoke all on public.community_moderation_queue from anon, authenticated;
grant all on public.community_moderation_queue to service_role;

create table if not exists public.community_post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists community_post_likes_user_created_idx
  on public.community_post_likes (user_id, created_at desc);

alter table public.community_post_likes enable row level security;
revoke all on public.community_post_likes from anon, authenticated;
grant all on public.community_post_likes to service_role;

create or replace function public.enqueue_community_post(
  p_actor_id uuid,
  p_title text,
  p_literary_work text,
  p_analysis text,
  p_image_path text
)
returns table (post_id uuid, queue_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_post_id uuid;
  v_queue_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_work text := trim(coalesce(p_literary_work, ''));
  v_analysis text := trim(coalesce(p_analysis, ''));
begin
  select role into v_role
  from public.community_user_roles
  where user_id = p_actor_id;
  if v_role is null then
    raise exception 'role_not_configured' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.community_bans
    where user_id = p_actor_id
      and (expires_at is null or expires_at > now())
  ) then
    raise exception 'account_banned' using errcode = '42501';
  end if;
  if char_length(v_title) not between 1 and 120
    or char_length(v_work) > 180
    or char_length(v_analysis) not between 10 and 5000 then
    raise exception 'invalid_post' using errcode = '22023';
  end if;
  if p_image_path is not null and (
    p_image_path not like (p_actor_id::text || '/posts/%')
    or p_image_path like '%..%'
    or char_length(p_image_path) > 300
  ) then
    raise exception 'invalid_image_path' using errcode = '22023';
  end if;

  insert into public.posts (
    author_id, title, literary_work, analysis, content, image_path, status
  )
  values (
    p_actor_id, v_title, v_work, v_analysis, v_analysis, p_image_path, 'pending'
  )
  returning id into v_post_id;

  insert into public.community_moderation_queue (
    entity_type, entity_id, user_id, content_to_moderate
  )
  values (
    'post',
    v_post_id,
    p_actor_id,
    'Tiêu đề: ' || v_title || E'\n' ||
      case when v_work = '' then '' else 'Tác phẩm/địa danh: ' || v_work || E'\n' end ||
      'Nội dung phân tích: ' || v_analysis
  )
  returning id into v_queue_id;

  return query select v_post_id, v_queue_id;
end;
$$;

create or replace function public.enqueue_community_comment(
  p_actor_id uuid,
  p_post_id uuid,
  p_content text
)
returns table (comment_id uuid, queue_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_content text := trim(coalesce(p_content, ''));
  v_comment_id uuid;
  v_queue_id uuid;
begin
  select role into v_role
  from public.community_user_roles
  where user_id = p_actor_id;
  if v_role is null then
    raise exception 'role_not_configured' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.community_bans
    where user_id = p_actor_id
      and (expires_at is null or expires_at > now())
  ) then
    raise exception 'account_banned' using errcode = '42501';
  end if;
  if char_length(v_content) not between 1 and 2000 then
    raise exception 'invalid_comment' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.posts
    where id = p_post_id and status = 'approved'
  ) then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;

  insert into public.post_comments (post_id, author_id, content, status)
  values (p_post_id, p_actor_id, v_content, 'pending')
  returning id into v_comment_id;

  insert into public.community_moderation_queue (
    entity_type, entity_id, user_id, content_to_moderate
  )
  values ('comment', v_comment_id, p_actor_id, v_content)
  returning id into v_queue_id;

  return query select v_comment_id, v_queue_id;
end;
$$;

create or replace function public.claim_community_moderation(
  p_actor_id uuid,
  p_queue_id uuid
)
returns public.community_moderation_queue
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.community_moderation_queue%rowtype;
  v_actor_role text;
begin
  select role into v_actor_role
  from public.community_user_roles
  where user_id = p_actor_id;

  select * into v_item
  from public.community_moderation_queue
  where id = p_queue_id
    and next_attempt_at <= now()
    and (
      user_id = p_actor_id
      or v_actor_role in ('moderator', 'owner')
    )
    and (
      status = 'pending'
      or (status = 'processing' and claimed_at < now() - interval '5 minutes')
    )
  for update skip locked;

  if not found then
    return null;
  end if;

  update public.community_moderation_queue
  set status = 'processing',
      locked_by = p_actor_id,
      claimed_at = now(),
      attempt_count = attempt_count + 1,
      last_error_code = null
  where id = v_item.id
  returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.finish_community_moderation(
  p_actor_id uuid,
  p_queue_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.community_moderation_queue%rowtype;
begin
  select * into v_item
  from public.community_moderation_queue
  where id = p_queue_id
    and status = 'processing'
    and locked_by = p_actor_id
  for update;
  if not found then
    raise exception 'moderation_item_not_claimed' using errcode = 'P0002';
  end if;

  update public.community_moderation_queue
  set status = case when p_allowed then 'approved' else 'rejected' end,
      processed_at = now(),
      locked_by = null,
      claimed_at = null,
      content_to_moderate = '',
      last_error_code = null
  where id = p_queue_id;

  if v_item.entity_type = 'post' then
    if p_allowed then
      update public.posts set status = 'approved' where id = v_item.entity_id;
    else
      delete from public.posts where id = v_item.entity_id;
    end if;
  else
    if p_allowed then
      update public.post_comments set status = 'approved' where id = v_item.entity_id;
    else
      delete from public.post_comments where id = v_item.entity_id;
    end if;
  end if;
end;
$$;

create or replace function public.retry_community_moderation(
  p_actor_id uuid,
  p_queue_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id
  from public.community_moderation_queue
  where id = p_queue_id
    and (
      (status = 'pending' and user_id = p_actor_id)
      or (status = 'processing' and locked_by = p_actor_id)
    );
  if v_owner_id is null then
    raise exception 'moderation_item_not_found' using errcode = 'P0002';
  end if;

  update public.community_moderation_queue
  set status = 'pending',
      next_attempt_at = now(),
      locked_by = null,
      claimed_at = null,
      last_error_code = null
  where id = p_queue_id;
end;
$$;

create or replace function public.get_community_post_likes(p_post_ids uuid[])
returns table (post_id uuid, likes_count bigint, liked_by_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(cardinality(p_post_ids), 0) > 100 then
    raise exception 'too_many_posts' using errcode = '22023';
  end if;

  return query
  select requested.id,
         count(likes.user_id)::bigint,
         coalesce(bool_or(likes.user_id = auth.uid()), false)
  from (
    select distinct value as id
    from unnest(coalesce(p_post_ids, '{}'::uuid[])) as value
  ) requested
  join public.posts on posts.id = requested.id and posts.status = 'approved'
  left join public.community_post_likes as likes on likes.post_id = requested.id
  group by requested.id;
end;
$$;

revoke all on function public.enqueue_community_post(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.enqueue_community_comment(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.claim_community_moderation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.finish_community_moderation(uuid, uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.retry_community_moderation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_community_post_likes(uuid[])
  from public, anon, authenticated;

grant execute on function public.enqueue_community_post(uuid, text, text, text, text)
  to service_role;
grant execute on function public.enqueue_community_comment(uuid, uuid, text)
  to service_role;
grant execute on function public.claim_community_moderation(uuid, uuid)
  to service_role;
grant execute on function public.finish_community_moderation(uuid, uuid, boolean)
  to service_role;
grant execute on function public.retry_community_moderation(uuid, uuid)
  to service_role;
grant execute on function public.get_community_post_likes(uuid[])
  to anon, authenticated, service_role;

update storage.buckets
set public = false
where id = 'community-media';

drop policy if exists "Community images are publicly readable"
  on storage.objects;
create policy "Approved or owned community images are readable"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'community-media'
    and (
      (
        (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      or exists (
        select 1
        from public.posts
        where posts.image_path = objects.name
          and posts.status = 'approved'
      )
      or exists (
        select 1
        from public.profiles
        where profiles.avatar_path = objects.name
      )
    )
  );
