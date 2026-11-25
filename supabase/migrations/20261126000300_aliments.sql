-- Étape 1 — Aliments, aliment cuisinable et rendement de cuisson (docs/04 §3.3)

create table public.aliments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  nom text not null check (length(trim(nom)) > 0),
  icone text,
  est_cuisinable boolean not null default false,
  rendement_cuisson numeric check (rendement_cuisson is null or rendement_cuisson > 0),
  -- Valeurs aux 100 g (à l'état cru si est_cuisinable) ; NULL = non renseigné, distinct de 0 (RG-REF-03).
  energie_kcal numeric check (energie_kcal is null or energie_kcal >= 0),
  glucides_g numeric check (glucides_g is null or glucides_g >= 0),
  sucres_g numeric check (sucres_g is null or sucres_g >= 0),
  lipides_g numeric check (lipides_g is null or lipides_g >= 0),
  acides_gras_satures_g numeric check (acides_gras_satures_g is null or acides_gras_satures_g >= 0),
  proteines_g numeric check (proteines_g is null or proteines_g >= 0),
  fibres_g numeric check (fibres_g is null or fibres_g >= 0),
  sel_g numeric check (sel_g is null or sel_g >= 0),
  index_glycemique integer check (index_glycemique is null or (index_glycemique >= 0 and index_glycemique <= 150)),
  statut_evaluation text not null default 'NON_EVALUE' check (statut_evaluation in ('EVALUE', 'NON_EVALUE')),
  est_non_evalue_manuel boolean not null default false,
  est_base_courante boolean not null default false,
  grammage_base_defaut numeric check (grammage_base_defaut is null or grammage_base_defaut > 0),
  est_archive boolean not null default false,
  archive_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pas de rendement sur un aliment à état unique (RG-ETAT-01).
  constraint aliment_rendement_si_cuisinable check (est_cuisinable or rendement_cuisson is null),
  unique (id, user_id, mandant_id)
);

create index aliments_recherche on public.aliments (mandant_id, user_id, est_archive, nom);

create trigger aliments_updated_at before update on public.aliments
  for each row execute function public.maj_updated_at();

-- Statut Évalué / Aliment non évalué (RG-REF-04), recalculé à chaque écriture.
-- Même règle côté navigateur : shared/utils/statut-aliment.js.
create or replace function public.calculer_statut_aliment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.energie_kcal is not null
     and new.glucides_g is not null
     and new.sucres_g is not null
     and new.lipides_g is not null
     and new.acides_gras_satures_g is not null
     and new.proteines_g is not null
     and new.fibres_g is not null
     and new.sel_g is not null
     and (new.index_glycemique is not null or new.glucides_g = 0)
     and (not new.est_cuisinable or new.rendement_cuisson is not null)
     and not new.est_non_evalue_manuel then
    new.statut_evaluation := 'EVALUE';
  else
    new.statut_evaluation := 'NON_EVALUE';
  end if;
  return new;
end;
$$;
create trigger aliments_statut before insert or update on public.aliments
  for each row execute function public.calculer_statut_aliment();

-- Aliment utilisé : le caractère cuisinable ne change plus (RG-ETAT-05).
create or replace function public.bloquer_changement_cuisinable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.est_cuisinable is distinct from old.est_cuisinable
     and (exists (select 1 from public.elements_prise_alimentaire e where e.aliment_id = old.id)
          or exists (select 1 from public.compositions_recette c where c.aliment_id = old.id)) then
    raise exception 'Cet aliment est déjà utilisé : il ne peut pas passer de cuisinable à état unique, ni l''inverse.'
      using errcode = 'P0001', hint = 'ALIMENT_UTILISE';
  end if;
  return new;
end;
$$;
create trigger aliments_bloquer_changement_cuisinable before update of est_cuisinable on public.aliments
  for each row execute function public.bloquer_changement_cuisinable();
