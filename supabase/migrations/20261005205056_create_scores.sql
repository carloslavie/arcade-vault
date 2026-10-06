create table public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  game_id    text not null check (game_id ~ '^[a-z0-9-]{1,32}$'),
  score      integer not null
             check (score between 1 and 10000000 and score % 10 = 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_id_idx on public.scores (user_id);

alter table public.scores enable row level security;

create policy "scores are readable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "users insert their own scores"
  on public.scores for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Sin políticas de update/delete: una puntuación no se edita.
