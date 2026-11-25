-- Étape 1 — Gouvernance des mandants et habilitations (docs/04 §3.1, §4.1)

-- Horodatage automatique de updated_at, utilisé par toutes les tables.
create or replace function public.maj_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Mandants (REAL / TEST) : données de référence, créées ici et non dans seed.sql
-- afin d'exister aussi sur le projet Supabase réel.
create table public.mandants (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code in ('REAL', 'TEST')),
  libelle text not null,
  est_actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger mandants_updated_at before update on public.mandants
  for each row execute function public.maj_updated_at();

insert into public.mandants (code, libelle) values
  ('REAL', 'Usage réel'),
  ('TEST', 'Essais et tests');

-- Habilitations : créées uniquement par la fonction d'initialisation (RG-USR-02).
create table public.habilitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  est_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mandant_id)
);
create trigger habilitations_updated_at before update on public.habilitations
  for each row execute function public.maj_updated_at();

-- Utilisateurs autorisés (RG-USR-01) : tenue par l'administrateur depuis le Dashboard.
create table public.utilisateurs_autorises (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, mandant_id)
);
create trigger utilisateurs_autorises_updated_at before update on public.utilisateurs_autorises
  for each row execute function public.maj_updated_at();

-- Habilitation active sur un mandant actif (docs/04 §4.1).
create or replace function public.est_habilite_mandant(p_mandant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.habilitations um
    join public.mandants m on m.id = um.mandant_id
    where um.user_id = auth.uid()
      and um.mandant_id = p_mandant_id
      and um.est_active = true
      and m.est_actif = true
  );
$$;
revoke all on function public.est_habilite_mandant(uuid) from public, anon;
grant execute on function public.est_habilite_mandant(uuid) to authenticated;
