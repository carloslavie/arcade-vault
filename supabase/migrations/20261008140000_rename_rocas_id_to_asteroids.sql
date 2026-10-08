-- The FK has no on update cascade, so drop it, move both sides, then restore it.
alter table public.scores drop constraint scores_game_id_fkey;

update public.games  set id      = 'asteroids' where id      = 'rocas';
update public.scores set game_id = 'asteroids' where game_id = 'rocas';

-- Sin on delete cascade: borrar un juego con puntuaciones debe fallar.
alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
