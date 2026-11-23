alter table public.posts
  add column if not exists video_paths text[];

alter table public.posts
  drop constraint if exists posts_video_paths_max_count;

alter table public.posts
  add constraint posts_video_paths_max_count
  check (video_paths is null or array_length(video_paths, 1) <= 2);

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
where id = 'community-media';

create or replace function public.enqueue_community_post_with_metadata(
  p_actor_id uuid,
  p_title text,
  p_literary_work text,
  p_analysis text,
  p_image_path text,
  p_image_paths text[],
  p_location_tags text[],
  p_image_ratio text,
  p_mention_user_ids uuid[],
  p_video_paths text[] default null
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
  v_videos text[] := coalesce(p_video_paths, '{}'::text[]);
  v_video text;
  v_normalized_videos text[] := '{}'::text[];
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
  if cardinality(v_videos) > 2 then
    raise exception 'invalid_video_path' using errcode = '22023';
  end if;
  foreach v_video in array v_videos loop
    if v_video is null
      or v_video not like (p_actor_id::text || '/posts/%')
      or v_video like '%..%'
      or char_length(v_video) > 300 then
      raise exception 'invalid_video_path' using errcode = '22023';
    end if;
    if not (v_normalized_videos @> array[v_video]) then
      v_normalized_videos := array_append(v_normalized_videos, v_video);
    end if;
  end loop;
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
      image_ratio = p_image_ratio,
      video_paths = case
        when cardinality(v_normalized_videos) > 0 then v_normalized_videos
        else null
      end
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

revoke all on function public.enqueue_community_post_with_metadata(
  uuid, text, text, text, text, text[], text[], text, uuid[], text[]
) from public, anon, authenticated;
grant execute on function public.enqueue_community_post_with_metadata(
  uuid, text, text, text, text, text[], text[], text, uuid[], text[]
) to service_role;
