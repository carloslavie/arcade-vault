alter table public.games add column difficulty smallint;

update public.games set difficulty = case id
  when 'bloque-buster' then 2
  when 'caida'         then 3
  when 'serpentina'    then 2
  when 'gloton'        then 3
  when 'invasores'     then 3
  when 'rocas'         then 4
  when 'ranaria'       then 3
  when 'duelo-pixel'   then 4
end;

-- Created nullable, filled, then made not null so existing rows don't break the migration
alter table public.games
  alter column difficulty set not null,
  add constraint games_difficulty_check check (difficulty between 1 and 5);
