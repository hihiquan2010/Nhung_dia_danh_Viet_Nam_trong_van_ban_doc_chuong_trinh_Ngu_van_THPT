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

drop function if exists public.enqueue_community_post_with_metadata(
  uuid,
  text,
  text,
  text,
  text,
  text[],
  text[],
  text,
  uuid[]
);
