create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 10 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Posts are publicly readable"
  on public.posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create or replace function public.create_community_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  suggested_name text;
begin
  suggested_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    'Thành viên'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(suggested_name, 80));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_community on auth.users;
create trigger on_auth_user_created_community
  after insert on auth.users
  for each row execute function public.create_community_profile();

create or replace function public.reject_abusive_community_posts()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  normalized_text text;
  compact_text text;
begin
  normalized_text := regexp_replace(
    lower(new.title || ' ' || new.content),
    '[^[:alnum:]]+',
    ' ',
    'g'
  );
  compact_text := regexp_replace(
    lower(new.title || ' ' || new.content),
    '[^[:alnum:]]',
    '',
    'g'
  );

  if normalized_text ~ '(^| )(đm|đmm|đcm|địt|đụ|lồn|cặc|chó má|chó chết|mất dạy|thằng ngu|đồ ngu|ngu như chó|súc vật|khốn nạn|vô học|điên rồ)( |$)'
    or compact_text ~ '(đm|đmm|đcm|địt|đụ|lồn|cặc)' then
    raise exception 'Bài viết có từ ngữ lăng mạ hoặc xúc phạm nên không được đăng.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists moderate_community_posts on public.posts;
create trigger moderate_community_posts
  before insert or update of title, content on public.posts
  for each row execute function public.reject_abusive_community_posts();

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.posts to anon, authenticated;
grant insert on public.posts to authenticated;
