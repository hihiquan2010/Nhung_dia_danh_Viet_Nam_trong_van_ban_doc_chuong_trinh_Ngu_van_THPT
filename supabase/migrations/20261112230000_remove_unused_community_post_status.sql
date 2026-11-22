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
  v_image_paths text[];
begin
  select author_id,
    coalesce(image_paths, array[]::text[]) ||
      case when image_path is null then array[]::text[] else array[image_path] end
  into v_author_id, v_image_paths
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
