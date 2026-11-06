-- Table de progression (une ligne par profil et par carte).
-- À coller dans Supabase : SQL Editor > New query > Run.
create table if not exists public.progress (
  profile       text        not null check (profile in ('clement', 'samantha')),
  item_id       text        not null,
  ease          real        not null default 2.5,
  interval_days real        not null default 0,
  reps          integer     not null default 0,
  lapses        integer     not null default 0,
  due           timestamptz not null,
  last_review   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (profile, item_id)
);

alter table public.progress enable row level security;

-- Pas de comptes : l'app utilise la clé publique (rôle anon).
-- Lecture, ajout et modification autorisés ; suppression interdite.
grant select, insert, update on public.progress to anon;

drop policy if exists "anon lit" on public.progress;
drop policy if exists "anon ajoute" on public.progress;
drop policy if exists "anon modifie" on public.progress;
create policy "anon lit"     on public.progress for select to anon using (true);
create policy "anon ajoute"  on public.progress for insert to anon with check (true);
create policy "anon modifie" on public.progress for update to anon using (true) with check (true);
