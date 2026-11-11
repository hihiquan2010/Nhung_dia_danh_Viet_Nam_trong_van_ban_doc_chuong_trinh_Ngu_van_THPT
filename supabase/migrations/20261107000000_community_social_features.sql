alter table public.posts
  add column if not exists location_tags text[] not null default '{}',
  add column if not exists image_ratio text not null default 'natural',
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_by uuid references auth.users (id) on delete set null,
  add column if not exists pinned_at timestamptz;

alter table public.posts
  add constraint posts_image_ratio_values
  check (image_ratio in ('natural', 'square', 'landscape', 'portrait'));

alter table public.posts
  add constraint posts_location_tags_max_count
  check (cardinality(location_tags) <= 8);

create index if not exists posts_approved_pinned_created_idx
  on public.posts (is_pinned desc, created_at desc)
  where status = 'approved';

create index if not exists posts_location_tags_idx
  on public.posts using gin (location_tags);

create table if not exists public.community_post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists community_post_shares_post_idx
  on public.community_post_shares (post_id, created_at desc);

create table if not exists public.community_post_mentions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  check (user_id <> created_by)
);

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  notification_type text not null check (notification_type = 'mention'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, post_id, notification_type)
);

create index if not exists community_notifications_user_created_idx
  on public.community_notifications (user_id, created_at desc);

alter table public.community_post_shares enable row level security;
alter table public.community_post_mentions enable row level security;
alter table public.community_notifications enable row level security;
revoke all on public.community_post_shares,
  public.community_post_mentions,
  public.community_notifications
  from anon, authenticated;
grant all on public.community_post_shares,
  public.community_post_mentions,
  public.community_notifications
  to service_role;

create or replace function public.enqueue_community_post_with_metadata(
  p_actor_id uuid,
  p_title text,
  p_literary_work text,
  p_analysis text,
  p_image_path text,
  p_image_paths text[],
  p_location_tags text[],
  p_image_ratio text,
  p_mention_user_ids uuid[]
)
returns table (post_id uuid, queue_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
  v_tags text[] := coalesce(p_location_tags, '{}'::text[]);
  v_mentions uuid[] := coalesce(p_mention_user_ids, '{}'::uuid[]);
  v_tag text;
begin
  if cardinality(v_tags) > 8 then
    raise exception 'invalid_location_tags' using errcode = '22023';
  end if;
  foreach v_tag in array v_tags loop
    if char_length(v_tag) not between 2 and 41
      or left(v_tag, 1) <> '#'
      or v_tag ~ '[[:space:],]' then
      raise exception 'invalid_location_tags' using errcode = '22023';
    end if;
  end loop;
  if coalesce(p_image_ratio, '') not in ('natural', 'square', 'landscape', 'portrait') then
    raise exception 'invalid_image_ratio' using errcode = '22023';
  end if;
  if cardinality(v_mentions) > 10
    or cardinality(v_mentions) <> (
      select count(distinct value)::integer from unnest(v_mentions) as value
    ) then
    raise exception 'invalid_mentions' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(v_mentions) as mentioned(user_id)
    where mentioned.user_id = p_actor_id
      or not exists (
        select 1 from public.profiles where profiles.id = mentioned.user_id
      )
  ) then
    raise exception 'invalid_mentions' using errcode = '22023';
  end if;

  select * into v_result
  from public.enqueue_community_post(
    p_actor_id,
    p_title,
    p_literary_work,
    p_analysis,
    p_image_path,
    p_image_paths
  );

  update public.posts
  set location_tags = v_tags,
      image_ratio = p_image_ratio
  where id = v_result.post_id;

  insert into public.community_post_mentions (post_id, user_id, created_by)
  select v_result.post_id, mentioned.user_id, p_actor_id
  from unnest(v_mentions) as mentioned(user_id);

  return query select v_result.post_id, v_result.queue_id;
end;
$$;

create or replace function public.delete_community_post(
  p_actor_id uuid,
  p_post_id uuid
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_status text;
  v_image_paths text[];
begin
  select author_id, status,
    coalesce(image_paths, array[]::text[]) ||
      case when image_path is null then array[]::text[] else array[image_path] end
  into v_author_id, v_status, v_image_paths
  from public.posts
  where id = p_post_id
  for update;
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  if v_author_id <> p_actor_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.community_moderation_queue
  where entity_type = 'post' and entity_id = p_post_id;
  delete from public.posts where id = p_post_id;
  return v_image_paths;
end;
$$;

create or replace function public.set_community_post_pin(
  p_actor_id uuid,
  p_post_id uuid,
  p_pinned boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.community_user_roles
    where user_id = p_actor_id and role = 'owner'
  ) then
    raise exception 'insufficient_role' using errcode = '42501';
  end if;

  update public.posts
  set is_pinned = p_pinned,
      pinned_by = case when p_pinned then p_actor_id else null end,
      pinned_at = case when p_pinned then now() else null end
  where id = p_post_id and status = 'approved';
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.get_community_post_metadata(p_post_ids uuid[])
returns table (
  post_id uuid,
  author_role text,
  likes_count bigint,
  comments_count bigint,
  shares_count bigint,
  is_pinned boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select post.id,
    coalesce(role.role, 'users'),
    (select count(*) from public.community_post_likes likes
      where likes.post_id = post.id),
    (select count(*) from public.post_comments comments
      where comments.post_id = post.id and comments.status = 'approved'),
    (select count(*) from public.community_post_shares shares
      where shares.post_id = post.id),
    post.is_pinned
  from public.posts post
  left join public.community_user_roles role on role.user_id = post.author_id
  where post.id = any(coalesce(p_post_ids, '{}'::uuid[]))
    and post.status = 'approved'
    and coalesce(cardinality(p_post_ids), 0) <= 100
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
      insert into public.community_notifications (
        user_id, actor_id, post_id, notification_type
      )
      select mention.user_id, mention.created_by, mention.post_id, 'mention'
      from public.community_post_mentions mention
      where mention.post_id = v_item.entity_id
      on conflict (user_id, post_id, notification_type) do nothing;
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

revoke all on function public.enqueue_community_post_with_metadata(
  uuid, text, text, text, text, text[], text[], text, uuid[]
) from public, anon, authenticated;
grant execute on function public.enqueue_community_post_with_metadata(
  uuid, text, text, text, text, text[], text[], text, uuid[]
) to service_role;

revoke all on function public.delete_community_post(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_community_post(uuid, uuid)
  to service_role;

revoke all on function public.set_community_post_pin(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_community_post_pin(uuid, uuid, boolean)
  to service_role;

revoke all on function public.get_community_post_metadata(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_community_post_metadata(uuid[])
  to anon, authenticated, service_role;

drop policy if exists "Approved or owned community images are readable"
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
        where (
          posts.image_path = objects.name
          or objects.name = any(coalesce(posts.image_paths, '{}'::text[]))
        )
          and posts.status = 'approved'
      )
      or exists (
        select 1
        from public.profiles
        where profiles.avatar_path = objects.name
      )
    )
  );
