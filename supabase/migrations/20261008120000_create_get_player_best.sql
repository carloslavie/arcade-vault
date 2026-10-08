-- Mejor marca de un jugador en un juego y su rango, con el mismo orden que get_leaderboard.
-- 0 filas si el jugador no tiene puntuaciones en ese juego.
-- security invoker: respeta la RLS de scores y profiles (ambas de lectura pública).
create function public.get_player_best(p_game_id text, p_user_id uuid)
returns table (rank bigint, username text, score integer, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.rank, p.username, r.score, r.created_at
  from (
    select
      b.user_id,
      b.score,
      b.created_at,
      row_number() over (order by b.score desc, b.created_at asc) as rank
    from (
      select distinct on (s.user_id) s.user_id, s.score, s.created_at
      from public.scores s
      where s.game_id = p_game_id
      order by s.user_id, s.score desc, s.created_at asc
    ) b
  ) r
  join public.profiles p on p.id = r.user_id
  where r.user_id = p_user_id;
$$;
