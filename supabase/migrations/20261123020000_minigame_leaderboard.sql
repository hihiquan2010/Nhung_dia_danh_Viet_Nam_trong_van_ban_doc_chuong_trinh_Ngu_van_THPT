create table if not exists public.minigame_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null check (
    game_id in ('football', 'table-tennis', 'basketball', 'wood-stack', 'obstacle')
  ),
  score integer not null check (score between 0 and 2000000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.minigame_scores enable row level security;
revoke all on table public.minigame_scores from anon, authenticated;

create or replace function public.submit_minigame_score(
  p_game_id text,
  p_score integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_score integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_game_id is null
    or p_game_id not in ('football', 'table-tennis', 'basketball', 'wood-stack', 'obstacle')
    or p_score is null
    or p_score < 0
    or p_score > 2000000000 then
    raise exception 'invalid_minigame_score' using errcode = '22023';
  end if;

  insert into public.minigame_scores as current_score (user_id, game_id, score)
  values (auth.uid(), p_game_id, p_score)
  on conflict (user_id, game_id) do update
    set score = greatest(current_score.score, excluded.score),
        updated_at = case
          when excluded.score > current_score.score then now()
          else current_score.updated_at
        end
  returning score into saved_score;

  return saved_score;
end;
$$;

create or replace function public.get_minigame_leaderboard(p_game_id text)
returns table(display_name text, score integer, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_game_id is null
    or p_game_id not in ('football', 'table-tennis', 'basketball', 'wood-stack', 'obstacle') then
    raise exception 'invalid_minigame' using errcode = '22023';
  end if;

  return query
    select profiles.display_name, scores.score, scores.updated_at
    from public.minigame_scores as scores
    join public.profiles as profiles on profiles.id = scores.user_id
    where scores.game_id = p_game_id
    order by scores.score desc, scores.updated_at asc
    limit 10;
end;
$$;

revoke all on function public.submit_minigame_score(text, integer) from public, anon, authenticated;
revoke all on function public.get_minigame_leaderboard(text) from public;
grant execute on function public.submit_minigame_score(text, integer) to authenticated;
grant execute on function public.get_minigame_leaderboard(text) to anon, authenticated;
