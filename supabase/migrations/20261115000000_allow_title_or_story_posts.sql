alter table public.posts
  drop constraint if exists posts_title_check,
  drop constraint if exists posts_content_check,
  drop constraint if exists posts_analysis_length;

alter table public.posts
  add constraint posts_title_or_analysis_nonempty
  check (btrim(title) <> '' or btrim(analysis) <> '');

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
  if v_title = '' and v_analysis = '' then
    raise exception 'invalid_post' using errcode = '22023';
  end if;
  if char_length(v_work) > 180 then
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
      select count(distinct mentioned.user_id)::integer
      from unnest(v_mentions) as mentioned(user_id)
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

  if cardinality(v_tags) > 0 then
    update public.community_moderation_queue
    set content_to_moderate = content_to_moderate ||
      E'\nHashtag địa danh: ' || array_to_string(v_tags, ' ')
    where id = v_result.queue_id;
  end if;

  insert into public.community_post_mentions (post_id, user_id, created_by)
  select v_result.post_id, mentioned.user_id, p_actor_id
  from unnest(v_mentions) as mentioned(user_id);

  return query select v_result.post_id, v_result.queue_id;
end;
$$;
