alter table public.posts
  add column if not exists image_paths text[];

alter table public.posts
  add constraint posts_image_paths_max_count
  check (image_paths is null or array_length(image_paths, 1) <= 10);

create or replace function public.enqueue_community_post(
  p_actor_id uuid,
  p_title text,
  p_literary_work text,
  p_analysis text,
  p_image_path text,
  p_image_paths text[] default null
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
  v_image_path text := nullif(trim(coalesce(p_image_path, '')), '');
  v_image_paths text[] := coalesce(p_image_paths, case when v_image_path is null then null else array[v_image_path] end);
  v_normalized_paths text[] := array[]::text[];
  v_path text;
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

  if v_image_paths is not null and array_length(v_image_paths, 1) > 0 then
    foreach v_path in array v_image_paths loop
      if v_path is null or trim(v_path) = '' then
        continue;
      end if;
      if v_path not like (p_actor_id::text || '/posts/%')
        or v_path like '%..%'
        or char_length(v_path) > 300 then
        raise exception 'invalid_image_path' using errcode = '22023';
      end if;
      if not (v_normalized_paths @> array[v_path]) then
        v_normalized_paths := array_append(v_normalized_paths, v_path);
      end if;
    end loop;
  elsif v_image_path is not null then
    v_normalized_paths := array[v_image_path];
  end if;

  if array_length(v_normalized_paths, 1) > 10 then
    raise exception 'invalid_image_path' using errcode = '22023';
  end if;

  if array_length(v_normalized_paths, 1) > 0 then
    v_image_path := v_normalized_paths[1];
    v_image_paths := v_normalized_paths;
  else
    v_image_path := null;
    v_image_paths := null;
  end if;

  insert into public.posts (
    author_id,
    title,
    literary_work,
    analysis,
    content,
    image_path,
    image_paths,
    status
  )
  values (
    p_actor_id,
    v_title,
    v_work,
    v_analysis,
    v_analysis,
    v_image_path,
    v_image_paths,
    'pending'
  )
  returning id into v_post_id;

  insert into public.community_moderation_queue (
    entity_type,
    entity_id,
    user_id,
    content_to_moderate
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
begin
  return query
  select *
  from public.enqueue_community_post(
    p_actor_id,
    p_title,
    p_literary_work,
    p_analysis,
    p_image_path,
    null::text[]
  );
end;
$$;

revoke all on function public.enqueue_community_post(uuid, text, text, text, text, text[]) from public, anon, authenticated;
revoke all on function public.enqueue_community_post(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.enqueue_community_post(uuid, text, text, text, text, text[]) to authenticated;
grant execute on function public.enqueue_community_post(uuid, text, text, text, text) to authenticated;
