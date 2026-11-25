-- Étape 1 — Types de prise alimentaire et fenêtres temporelles (docs/04 §3.2, RG-TMP-02 à 07)

create table public.types_prise_alimentaire (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  libelle text not null check (length(trim(libelle)) > 0),
  icone text not null,
  fenetre_debut time not null,
  fenetre_fin time not null,
  priorite integer not null check (priorite >= 1),
  est_type_par_defaut boolean not null default false,
  est_archive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fenetre_debut <> fenetre_fin),
  -- Le Type par défaut ne peut pas être archivé (RG-TMP-07).
  constraint type_par_defaut_non_archive check (not (est_type_par_defaut and est_archive)),
  unique (id, user_id, mandant_id)
);

create unique index types_prise_alimentaire_priorite_unique
  on public.types_prise_alimentaire (user_id, mandant_id, priorite) where not est_archive;
create unique index types_prise_alimentaire_defaut_unique
  on public.types_prise_alimentaire (user_id, mandant_id) where est_type_par_defaut;
create index types_prise_alimentaire_recherche
  on public.types_prise_alimentaire (mandant_id, user_id, est_archive, priorite);

create trigger types_prise_alimentaire_updated_at before update on public.types_prise_alimentaire
  for each row execute function public.maj_updated_at();

-- Le Type par défaut ne peut pas être supprimé (RG-TMP-07), sauf lors de la
-- suppression du compte lui-même (suppression en cascade depuis auth.users).
create or replace function public.proteger_type_par_defaut()
returns trigger
language plpgsql
security definer -- lecture de auth.users, inaccessible au rôle authenticated
set search_path = public
as $$
begin
  if old.est_type_par_defaut
     and exists (select 1 from auth.users u where u.id = old.user_id) then
    raise exception 'Le type par défaut ne peut pas être supprimé.'
      using errcode = 'P0001', hint = 'TYPE_PAR_DEFAUT_PROTEGE';
  end if;
  return old;
end;
$$;
create trigger types_prise_alimentaire_proteger_defaut before delete on public.types_prise_alimentaire
  for each row execute function public.proteger_type_par_defaut();
