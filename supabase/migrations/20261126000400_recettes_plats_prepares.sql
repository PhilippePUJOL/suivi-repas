-- Étape 1 — Recettes, composition de recette et plats préparés (docs/04 §3.4)

create table public.recettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  nom text not null check (length(trim(nom)) > 0),
  poids_total_net_g numeric check (poids_total_net_g is null or poids_total_net_g > 0),
  est_archive boolean not null default false,
  archive_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, mandant_id)
);
create index recettes_recherche on public.recettes (mandant_id, user_id, est_archive, nom);
create trigger recettes_updated_at before update on public.recettes
  for each row execute function public.maj_updated_at();

create table public.compositions_recette (
  id uuid primary key default gen_random_uuid(),
  recette_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  aliment_id uuid,
  etat_aliment text check (etat_aliment is null or etat_aliment in ('CRU', 'CUIT')),
  poids_g numeric not null check (poids_g > 0),
  est_element_supprime boolean not null default false,
  libelle_element_supprime text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Intégrité par utilisateur et par mandant (clés étrangères composites).
  foreign key (recette_id, user_id, mandant_id)
    references public.recettes (id, user_id, mandant_id) on delete cascade,
  foreign key (aliment_id, user_id, mandant_id)
    references public.aliments (id, user_id, mandant_id) on delete set null (aliment_id),
  constraint composition_aliment_ou_supprime check (aliment_id is not null or est_element_supprime)
);
create index compositions_recette_recette on public.compositions_recette (recette_id, position);
create index compositions_recette_aliment on public.compositions_recette (aliment_id);
create trigger compositions_recette_updated_at before update on public.compositions_recette
  for each row execute function public.maj_updated_at();

create table public.plats_prepares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  nom text not null check (length(trim(nom)) > 0),
  poids_total_g numeric check (poids_total_g is null or poids_total_g > 0),
  base_valeurs text not null check (base_valeurs in ('PAR_100G', 'PLAT_ENTIER')),
  energie_kcal numeric check (energie_kcal is null or energie_kcal >= 0),
  glucides_g numeric check (glucides_g is null or glucides_g >= 0),
  sucres_g numeric check (sucres_g is null or sucres_g >= 0),
  lipides_g numeric check (lipides_g is null or lipides_g >= 0),
  acides_gras_satures_g numeric check (acides_gras_satures_g is null or acides_gras_satures_g >= 0),
  proteines_g numeric check (proteines_g is null or proteines_g >= 0),
  fibres_g numeric check (fibres_g is null or fibres_g >= 0),
  sel_g numeric check (sel_g is null or sel_g >= 0),
  est_archive boolean not null default false,
  archive_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (base_valeurs <> 'PAR_100G' or poids_total_g is not null),
  unique (id, user_id, mandant_id)
);
create index plats_prepares_recherche on public.plats_prepares (mandant_id, user_id, est_archive, nom);
create trigger plats_prepares_updated_at before update on public.plats_prepares
  for each row execute function public.maj_updated_at();
