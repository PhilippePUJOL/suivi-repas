-- Étape 1 — Cibles nutritionnelles et poids de référence (docs/04 §3.7, RG-CIB-01 à 07)

create table public.cibles_nutritionnelles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  grandeur text not null check (grandeur in ('ENERGIE_KCAL', 'GLUCIDES_G', 'SUCRES_G', 'LIPIDES_G',
                                             'ACIDES_GRAS_SATURES_G', 'PROTEINES_G', 'FIBRES_G', 'SEL_G')),
  forme_cible text not null check (forme_cible in ('VALEUR', 'PLAGE')),
  base_cible text not null default 'ABSOLUE' check (base_cible in ('ABSOLUE', 'PAR_KG', 'POURCENTAGE_ENERGIE')),
  valeur_cible numeric check (valeur_cible is null or valeur_cible > 0),
  valeur_basse numeric check (valeur_basse is null or valeur_basse >= 0),
  valeur_haute numeric check (valeur_haute is null or valeur_haute >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cible_forme_valeur check (
    forme_cible <> 'VALEUR' or (valeur_cible is not null and valeur_basse is null and valeur_haute is null)),
  constraint cible_forme_plage check (
    forme_cible <> 'PLAGE' or (valeur_cible is null and (valeur_basse is not null or valeur_haute is not null))),
  constraint cible_bornes_ordonnees check (valeur_basse is null or valeur_haute is null or valeur_basse < valeur_haute),
  constraint cible_energie_absolue check (
    grandeur <> 'ENERGIE_KCAL' or (forme_cible = 'VALEUR' and base_cible = 'ABSOLUE')),
  constraint cible_pourcentage_energie check (
    base_cible <> 'POURCENTAGE_ENERGIE'
    or grandeur in ('GLUCIDES_G', 'SUCRES_G', 'LIPIDES_G', 'ACIDES_GRAS_SATURES_G', 'PROTEINES_G')),
  unique (user_id, mandant_id, grandeur)
);
create trigger cibles_nutritionnelles_updated_at before update on public.cibles_nutritionnelles
  for each row execute function public.maj_updated_at();

create table public.poids_reference (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  date_effet date not null,
  poids_kg numeric not null check (poids_kg > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mandant_id, date_effet)
);
create index poids_reference_historique on public.poids_reference (mandant_id, user_id, date_effet desc);
create trigger poids_reference_updated_at before update on public.poids_reference
  for each row execute function public.maj_updated_at();

-- Cibles de départ (RG-CIB-07), définies en un seul endroit.
create or replace function public.cibles_de_depart()
returns table (grandeur text, forme_cible text, base_cible text,
               valeur_cible numeric, valeur_basse numeric, valeur_haute numeric)
language sql
immutable
set search_path = public
as $$
  values
    ('LIPIDES_G',             'PLAGE', 'POURCENTAGE_ENERGIE', null::numeric, 25::numeric, 35::numeric),
    ('ACIDES_GRAS_SATURES_G', 'PLAGE', 'POURCENTAGE_ENERGIE', null,          null,        8),
    ('GLUCIDES_G',            'PLAGE', 'POURCENTAGE_ENERGIE', null,          35,          55),
    ('SUCRES_G',              'PLAGE', 'ABSOLUE',             null,          null,        50),
    ('PROTEINES_G',           'PLAGE', 'PAR_KG',              null,          1.6,         2),
    ('FIBRES_G',              'PLAGE', 'ABSOLUE',             null,          25,          38),
    ('SEL_G',                 'PLAGE', 'ABSOLUE',             null,          null,        5)
$$;

-- Rétablir les cibles de départ (RG-CIB-07) : soumis à la RLS (SECURITY INVOKER).
-- Ne touche ni à la cible d'énergie ni au poids de référence.
create or replace function public.retablir_cibles_de_depart(p_mandant_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not public.est_habilite_mandant(p_mandant_id) then
    raise exception 'Accès refusé à ce mandant.' using errcode = '42501';
  end if;
  delete from public.cibles_nutritionnelles c
   where c.user_id = auth.uid()
     and c.mandant_id = p_mandant_id
     and c.grandeur in (select d.grandeur from public.cibles_de_depart() d);
  insert into public.cibles_nutritionnelles
    (user_id, mandant_id, grandeur, forme_cible, base_cible, valeur_cible, valeur_basse, valeur_haute)
  select auth.uid(), p_mandant_id, d.grandeur, d.forme_cible, d.base_cible, d.valeur_cible, d.valeur_basse, d.valeur_haute
    from public.cibles_de_depart() d;
end;
$$;
revoke all on function public.retablir_cibles_de_depart(uuid) from public, anon;
grant execute on function public.retablir_cibles_de_depart(uuid) to authenticated;
