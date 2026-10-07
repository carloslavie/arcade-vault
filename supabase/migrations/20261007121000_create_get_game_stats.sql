-- Plays (rows in scores) and best score per game. p_game_id null = every game.
-- left join from games so games without scores return plays = 0 and best = null.
create function public.get_game_stats(p_game_id text default null)
returns table (game_id text, plays bigint, best integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    g.id         as game_id,
    count(s.id)  as plays,
    max(s.score) as best
  from public.games g
  left join public.scores s on s.game_id = g.id
  where p_game_id is null or g.id = p_game_id
  group by g.id
  order by g.sort_order;
$$;
