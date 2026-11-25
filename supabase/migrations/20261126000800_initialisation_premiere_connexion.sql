-- Étape 1 — Initialisation à la première connexion (docs/04 §3.1, RG-USR-02, RG-CIB-07)
-- Pour chaque mandant permis dans utilisateurs_autorises : habilitation, types de prise
-- alimentaire initiaux (docs/02 RG-USR-02) et cibles de départ. Idempotente : l'administrateur
-- peut la rejouer pour un compte existant après avoir complété la liste :
--   select public.initialiser_utilisateur('<uuid du compte>');

create or replace function public.initialiser_utilisateur(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_mandant_id uuid;
begin
  select lower(trim(u.email)) into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    return;
  end if;

  for v_mandant_id in
    select distinct ua.mandant_id
      from public.utilisateurs_autorises ua
     where lower(trim(ua.email)) = v_email
  loop
    insert into public.habilitations (user_id, mandant_id)
    values (p_user_id, v_mandant_id)
    on conflict (user_id, mandant_id) do nothing;

    if not exists (select 1 from public.types_prise_alimentaire t
                    where t.user_id = p_user_id and t.mandant_id = v_mandant_id) then
      insert into public.types_prise_alimentaire
        (user_id, mandant_id, libelle, icone, fenetre_debut, fenetre_fin, priorite, est_type_par_defaut)
      values
        (p_user_id, v_mandant_id, 'Déjeuner',           '🍽️', '11:30', '14:30', 1, false),
        (p_user_id, v_mandant_id, 'Dîner',              '🌙', '19:00', '22:30', 2, false),
        (p_user_id, v_mandant_id, 'Petit déjeuner',     '☕', '05:00', '10:00', 3, false),
        (p_user_id, v_mandant_id, 'Apéritif',           '🥂', '18:00', '20:00', 4, false),
        (p_user_id, v_mandant_id, 'Goûter',             '🍪', '15:30', '18:00', 5, true),
        (p_user_id, v_mandant_id, 'Collation matinale', '🍎', '10:00', '11:30', 6, false),
        (p_user_id, v_mandant_id, 'Collation nocturne', '🌌', '22:30', '05:00', 7, false);
    end if;

    if not exists (select 1 from public.cibles_nutritionnelles c
                    where c.user_id = p_user_id and c.mandant_id = v_mandant_id) then
      insert into public.cibles_nutritionnelles
        (user_id, mandant_id, grandeur, forme_cible, base_cible, valeur_cible, valeur_basse, valeur_haute)
      select p_user_id, v_mandant_id, d.grandeur, d.forme_cible, d.base_cible,
             d.valeur_cible, d.valeur_basse, d.valeur_haute
        from public.cibles_de_depart() d;
    end if;
  end loop;
end;
$$;
revoke all on function public.initialiser_utilisateur(uuid) from public, anon, authenticated;

create or replace function public.declencher_initialisation_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.initialiser_utilisateur(new.id);
  return new;
end;
$$;
revoke all on function public.declencher_initialisation_utilisateur() from public, anon, authenticated;

create trigger initialiser_utilisateur_apres_creation
  after insert on auth.users
  for each row execute function public.declencher_initialisation_utilisateur();
