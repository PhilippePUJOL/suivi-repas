-- Étape 1 — Prises alimentaires et éléments de prise alimentaire (docs/04 §3.5)

create table public.prises_alimentaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  type_prise_alimentaire_id uuid not null,
  horodatage_prise timestamptz not null,
  date_locale date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un type référencé ne peut qu'être archivé (RG-TMP-07). NO ACTION plutôt que RESTRICT :
  -- même refus pour une suppression directe, mais vérifié en fin d'instruction, ce qui
  -- permet la suppression en cascade d'un compte (types et prises supprimés ensemble).
  foreign key (type_prise_alimentaire_id, user_id, mandant_id)
    references public.types_prise_alimentaire (id, user_id, mandant_id) on delete no action,
  unique (id, user_id, mandant_id)
);
create index prises_alimentaires_journee
  on public.prises_alimentaires (mandant_id, user_id, date_locale, horodatage_prise desc);
create index prises_alimentaires_type on public.prises_alimentaires (type_prise_alimentaire_id);
create trigger prises_alimentaires_updated_at before update on public.prises_alimentaires
  for each row execute function public.maj_updated_at();

create table public.elements_prise_alimentaire (
  id uuid primary key default gen_random_uuid(),
  prise_alimentaire_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandant_id uuid not null references public.mandants(id) on delete restrict,
  type_element text not null check (type_element in ('ALIMENT', 'RECETTE', 'PLAT_PREPARE')),
  aliment_id uuid,
  recette_id uuid,
  plat_prepare_id uuid,
  etat_aliment text check (etat_aliment is null or etat_aliment in ('CRU', 'CUIT')),
  mode_portion text not null check (mode_portion in ('GRAMMES', 'POURCENTAGE', 'PART')),
  portion_grammes numeric check (portion_grammes is null or portion_grammes > 0),
  portion_pourcentage numeric check (portion_pourcentage is null or portion_pourcentage > 0),
  portion_numerateur integer check (portion_numerateur is null or portion_numerateur > 0),
  portion_denominateur integer check (portion_denominateur is null or portion_denominateur > 0),
  note_libre text,
  est_element_supprime boolean not null default false,
  libelle_element_supprime text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (prise_alimentaire_id, user_id, mandant_id)
    references public.prises_alimentaires (id, user_id, mandant_id) on delete cascade,
  foreign key (aliment_id, user_id, mandant_id)
    references public.aliments (id, user_id, mandant_id) on delete set null (aliment_id),
  foreign key (recette_id, user_id, mandant_id)
    references public.recettes (id, user_id, mandant_id) on delete set null (recette_id),
  foreign key (plat_prepare_id, user_id, mandant_id)
    references public.plats_prepares (id, user_id, mandant_id) on delete set null (plat_prepare_id),
  -- Cohérence du type d'élément.
  constraint element_coherence_type check (
    (type_element = 'ALIMENT'
       and (aliment_id is not null or est_element_supprime)
       and recette_id is null and plat_prepare_id is null)
    or (type_element = 'RECETTE'
       and (recette_id is not null or est_element_supprime)
       and aliment_id is null and plat_prepare_id is null and etat_aliment is null)
    or (type_element = 'PLAT_PREPARE'
       and (plat_prepare_id is not null or est_element_supprime)
       and aliment_id is null and recette_id is null and etat_aliment is null)
  ),
  -- Cohérence de la portion (RG-REC-03).
  constraint element_coherence_portion check (
    (mode_portion = 'GRAMMES' and portion_grammes is not null)
    or (mode_portion = 'POURCENTAGE' and portion_pourcentage is not null)
    or (mode_portion = 'PART' and portion_numerateur is not null and portion_denominateur is not null)
  ),
  constraint element_aliment_en_grammes check (type_element <> 'ALIMENT' or mode_portion = 'GRAMMES')
);
create index elements_prise_alimentaire_prise on public.elements_prise_alimentaire (prise_alimentaire_id, position);
create index elements_prise_alimentaire_aliment on public.elements_prise_alimentaire (aliment_id);
create index elements_prise_alimentaire_recette on public.elements_prise_alimentaire (recette_id);
create index elements_prise_alimentaire_plat on public.elements_prise_alimentaire (plat_prepare_id);
create trigger elements_prise_alimentaire_updated_at before update on public.elements_prise_alimentaire
  for each row execute function public.maj_updated_at();

-- État à la pesée : CRU / CUIT si et seulement si l'aliment est cuisinable (docs/04 §3.3).
-- Commun à compositions_recette et elements_prise_alimentaire.
create or replace function public.verifier_etat_aliment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cuisinable boolean;
begin
  if new.aliment_id is null then
    return new;
  end if;
  select a.est_cuisinable into v_cuisinable from public.aliments a where a.id = new.aliment_id;
  if v_cuisinable and new.etat_aliment is null then
    raise exception 'Choisissez l''état à la pesée (Cru ou Cuit) de cet aliment cuisinable.'
      using errcode = 'P0001', hint = 'ETAT_ALIMENT_REQUIS';
  elsif not v_cuisinable and new.etat_aliment is not null then
    raise exception 'Un aliment à état unique ne porte pas d''état à la pesée.'
      using errcode = 'P0001', hint = 'ETAT_ALIMENT_INTERDIT';
  end if;
  return new;
end;
$$;
create trigger compositions_recette_etat before insert or update on public.compositions_recette
  for each row execute function public.verifier_etat_aliment();
create trigger elements_prise_alimentaire_etat before insert or update on public.elements_prise_alimentaire
  for each row execute function public.verifier_etat_aliment();

-- Portion en grammes d'une recette ou d'un plat préparé : poids total requis (RG-REC-03).
create or replace function public.verifier_portion_grammes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode_portion = 'GRAMMES' then
    if new.recette_id is not null
       and (select r.poids_total_net_g from public.recettes r where r.id = new.recette_id) is null then
      raise exception 'Une portion en grammes exige le poids total net de la recette.'
        using errcode = 'P0001', hint = 'POIDS_TOTAL_REQUIS';
    elsif new.plat_prepare_id is not null
       and (select p.poids_total_g from public.plats_prepares p where p.id = new.plat_prepare_id) is null then
      raise exception 'Une portion en grammes exige le poids total du plat préparé.'
        using errcode = 'P0001', hint = 'POIDS_TOTAL_REQUIS';
    end if;
  end if;
  return new;
end;
$$;
create trigger elements_prise_alimentaire_portion before insert or update on public.elements_prise_alimentaire
  for each row execute function public.verifier_portion_grammes();
