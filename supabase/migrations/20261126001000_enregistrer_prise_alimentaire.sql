-- Étape 4 — Enregistrement atomique d'une prise alimentaire et de ses éléments (F-EDIT-05)
-- Une seule transaction : la prise et toutes ses lignes sont enregistrées ensemble, ou rien
-- (aucune fausse réussite, NFR-SUP-REL-01). SECURITY INVOKER : soumise à la RLS.
--
-- p_prise : { id (absent en création), mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale }
-- p_elements : [{ type_element, aliment_id, recette_id, plat_prepare_id, etat_aliment, mode_portion,
--                 portion_grammes, portion_pourcentage, portion_numerateur, portion_denominateur, note_libre }]
-- En modification, les lignes existantes sont remplacées par p_elements. Renvoie l'id de la prise.

create or replace function public.enregistrer_prise_alimentaire(p_prise jsonb, p_elements jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := nullif(p_prise->>'id', '')::uuid;
  v_mandant_id uuid := (p_prise->>'mandant_id')::uuid;
  v_element jsonb;
  v_position integer := 0;
begin
  if auth.uid() is null or not public.est_habilite_mandant(v_mandant_id) then
    raise exception 'Accès refusé à ce mandant.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_elements) <> 'array' or jsonb_array_length(p_elements) = 0 then
    raise exception 'Ajoutez au moins un élément.' using errcode = 'P0001', hint = 'PRISE_VIDE';
  end if;

  if v_id is null then
    insert into public.prises_alimentaires (user_id, mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale)
    values (auth.uid(), v_mandant_id, (p_prise->>'type_prise_alimentaire_id')::uuid,
            (p_prise->>'horodatage_prise')::timestamptz, (p_prise->>'date_locale')::date)
    returning id into v_id;
  else
    update public.prises_alimentaires
       set type_prise_alimentaire_id = (p_prise->>'type_prise_alimentaire_id')::uuid,
           horodatage_prise = (p_prise->>'horodatage_prise')::timestamptz,
           date_locale = (p_prise->>'date_locale')::date
     where id = v_id and user_id = auth.uid() and mandant_id = v_mandant_id;
    if not found then
      raise exception 'Prise alimentaire introuvable.' using errcode = 'P0002';
    end if;
    -- Les lignes « Élément supprimé » déjà présentes sont conservées telles quelles.
    delete from public.elements_prise_alimentaire
     where prise_alimentaire_id = v_id and not est_element_supprime;
    select coalesce(max(position) + 1, 0) into v_position
      from public.elements_prise_alimentaire where prise_alimentaire_id = v_id;
  end if;

  for v_element in select * from jsonb_array_elements(p_elements)
  loop
    insert into public.elements_prise_alimentaire (
      prise_alimentaire_id, user_id, mandant_id, type_element, aliment_id, recette_id, plat_prepare_id,
      etat_aliment, mode_portion, portion_grammes, portion_pourcentage, portion_numerateur,
      portion_denominateur, note_libre, position)
    values (
      v_id, auth.uid(), v_mandant_id,
      v_element->>'type_element',
      nullif(v_element->>'aliment_id', '')::uuid,
      nullif(v_element->>'recette_id', '')::uuid,
      nullif(v_element->>'plat_prepare_id', '')::uuid,
      nullif(v_element->>'etat_aliment', ''),
      v_element->>'mode_portion',
      (v_element->>'portion_grammes')::numeric,
      (v_element->>'portion_pourcentage')::numeric,
      (v_element->>'portion_numerateur')::integer,
      (v_element->>'portion_denominateur')::integer,
      nullif(trim(v_element->>'note_libre'), ''),
      v_position);
    v_position := v_position + 1;
  end loop;

  return v_id;
end;
$$;
revoke all on function public.enregistrer_prise_alimentaire(jsonb, jsonb) from public, anon;
grant execute on function public.enregistrer_prise_alimentaire(jsonb, jsonb) to authenticated;
