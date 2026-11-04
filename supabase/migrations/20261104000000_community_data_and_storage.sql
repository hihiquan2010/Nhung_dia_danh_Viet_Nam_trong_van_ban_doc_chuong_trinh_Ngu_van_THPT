alter table public.profiles
  add column if not exists avatar_path text;

alter table public.posts
  add column if not exists literary_work text not null default '',
  add column if not exists analysis text,
  add column if not exists image_path text,
  add column if not exists status text not null default 'approved';

update public.posts
set analysis = content
where analysis is null;

alter table public.posts
  alter column analysis set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_literary_work_length'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_literary_work_length
      check (char_length(literary_work) <= 180);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_analysis_length'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_analysis_length
      check (char_length(analysis) between 10 and 5000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_status_values'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_status_values
      check (status in ('approved', 'rejected'));
  end if;
end;
$$;

create index if not exists posts_status_created_at_idx
  on public.posts (status, created_at desc);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_created_at_idx
  on public.post_comments (post_id, created_at);

create table if not exists public.community_ai_rate_limits (
  scope text primary key,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.post_comments enable row level security;
alter table public.community_ai_rate_limits enable row level security;

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Approved posts are publicly readable"
  on public.posts for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Users can create their own posts" on public.posts;
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;

drop policy if exists "Approved post comments are publicly readable"
  on public.post_comments;
create policy "Approved post comments are publicly readable"
  on public.post_comments for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.posts
      where posts.id = post_comments.post_id
        and posts.status = 'approved'
    )
  );

drop trigger if exists moderate_community_posts on public.posts;
drop function if exists public.reject_abusive_community_posts();

revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.posts from anon, authenticated;
revoke insert, update, delete on public.post_comments from anon, authenticated;
revoke all on public.community_ai_rate_limits from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant select on public.post_comments to anon, authenticated;

create or replace function public.consume_community_moderation_slot(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
  v_window timestamptz := date_trunc('minute', clock_timestamp());
  v_count integer;
begin
  if p_user_id is null then
    return false;
  end if;

  foreach v_scope in array array['global', 'user:' || p_user_id::text]
  loop
    insert into public.community_ai_rate_limits as limits (
      scope,
      window_start,
      request_count
    )
    values (v_scope, v_window, 1)
    on conflict (scope) do update
      set window_start = excluded.window_start,
          request_count = case
            when limits.window_start = excluded.window_start
              then limits.request_count + 1
            else 1
          end
    returning request_count into v_count;

    if (v_scope = 'global' and v_count > 10)
      or (v_scope <> 'global' and v_count > 3) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.consume_community_moderation_slot(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_community_moderation_slot(uuid)
  to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'community-media',
  'community-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community images are publicly readable"
  on storage.objects;
create policy "Community images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'community-media');

drop policy if exists "Users upload community images to their own folder"
  on storage.objects;
create policy "Users upload community images to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update community images in their own folder"
  on storage.objects;
create policy "Users update community images in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete community images in their own folder"
  on storage.objects;
create policy "Users delete community images in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
