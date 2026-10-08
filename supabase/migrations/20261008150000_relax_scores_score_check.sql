-- The step depends on the game (lib/engines/meta.ts); the DB only keeps the bounds.
alter table public.scores drop constraint scores_score_check;

alter table public.scores
  add constraint scores_score_check check (score between 1 and 10000000);
