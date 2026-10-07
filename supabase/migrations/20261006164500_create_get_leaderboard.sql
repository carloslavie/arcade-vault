-- Mejor marca de cada jugador en un juego; en empate gana quien la consiguió antes.
-- security invoker: respeta la RLS de scores y profiles (ambas de lectura pública).
create function public.get_leaderboard(p_game_id text, p_limit integer default 10)
returns table (rank bigint, username text, score integer, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    row_number() over (order by b.score desc, b.created_at asc) as rank,
    p.username,
    b.score,
    b.created_at
  from (
    select distinct on (s.user_id) s.user_id, s.score, s.created_at
    from public.scores s
    where s.game_id = p_game_id
    order by s.user_id, s.score desc, s.created_at asc
  ) b
  join public.profiles p on p.id = b.user_id
  order by rank
  limit least(greatest(p_limit, 1), 50);
$$;
