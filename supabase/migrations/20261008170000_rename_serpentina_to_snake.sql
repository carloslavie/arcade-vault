-- The FK has no on update cascade, so drop it, move both sides, then restore it.
alter table public.scores drop constraint scores_game_id_fkey;

update public.games
   set id = 'snake',
       title = 'SNAKE',
       long = 'Una serpiente de luz recorre la grilla devorando frutas pixeladas. Cada bocado la alarga y cada cinco la hace más veloz. Un choque contra el muro o contra su propia cola y se acabó.'
 where id = 'serpentina';
update public.scores set game_id = 'snake' where game_id = 'serpentina';

-- Sin on delete cascade: borrar un juego con puntuaciones debe fallar.
alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);
